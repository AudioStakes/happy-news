import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { validateClassificationJson, type ValidClassificationResult } from '$lib/classification/validateClassificationJson';
import { createDb } from '$lib/db/client';
import { adminImportBatches, newsFeatures, newsItems } from '$lib/db/schema';

const DEFAULT_LIMIT = 50;

function getDb(event: Parameters<Actions['validateJson']>[0]) {
  const database = event.platform?.env?.DB;
  if (!database) {
    return null;
  }

  return createDb(database);
}

function extractInputNewsIds(rawJson: string): number[] {
  try {
    const parsed = JSON.parse(rawJson) as { results?: Array<{ news_id?: unknown }> };
    if (!parsed || !Array.isArray(parsed.results)) {
      return [];
    }

    return parsed.results
      .map((row) => row.news_id)
      .filter((newsId): newsId is number => typeof newsId === 'number' && Number.isInteger(newsId) && newsId > 0);
  } catch {
    return [];
  }
}

async function validateAgainstDatabase(
  inputNewsIds: number[],
  db: ReturnType<typeof createDb>
): Promise<{ errors: string[]; foundIds: Set<number> }> {
  if (inputNewsIds.length === 0) {
    return { errors: [], foundIds: new Set<number>() };
  }

  const rows = await db
    .select({ id: newsItems.id, status: newsItems.status })
    .from(newsItems)
    .where(inArray(newsItems.id, inputNewsIds));

  const foundIds = new Set<number>(rows.map((row) => row.id));
  const errors: string[] = [];

  for (const newsId of inputNewsIds) {
    if (!foundIds.has(newsId)) {
      errors.push(`news_id ${newsId} does not exist.`);
    }
  }

  for (const row of rows) {
    if (row.status !== 'unclassified') {
      errors.push(`news_id ${row.id} is ${row.status}. Only unclassified items can be imported.`);
    }
  }

  return { errors, foundIds };
}

function toPreviewRows(results: ValidClassificationResult[]) {
  return results.map((result) => ({
    newsId: result.newsId,
    isHappyCandidate: result.isHappyCandidate,
    happyScore: result.happyScore,
    topics: result.topics,
    emotions: result.emotions,
    storyTypes: result.storyTypes,
    riskFlags: result.riskFlags,
    negativeContextLevel: result.negativeContextLevel,
    commercialPrLevel: result.commercialPrLevel
  }));
}

async function persistFailedImport(db: ReturnType<typeof createDb>, rawJson: string, errors: string[], inputNewsIds: number[]) {
  try {
    await db.insert(adminImportBatches).values({
      status: 'failed',
      inputNewsIdsJson: JSON.stringify(inputNewsIds),
      rawJson,
      validationErrorsJson: JSON.stringify(errors),
      importedCount: 0
    });
  } catch {
    // Avoid exposing database details to the UI.
  }
}

export const load: PageServerLoad = async (event) => {
  const database = event.platform?.env?.DB;
  if (!database) {
    return {
      dbError:
        'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/classification.',
      items: []
    };
  }

  const db = createDb(database);
  const items = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      url: newsItems.url,
      sourceName: newsItems.sourceName,
      publishedAt: newsItems.publishedAt,
      description: newsItems.description,
      language: newsItems.language,
      country: newsItems.country,
      fetchedAt: newsItems.fetchedAt
    })
    .from(newsItems)
    .where(and(eq(newsItems.status, 'unclassified')))
    .orderBy(desc(newsItems.fetchedAt), desc(newsItems.id))
    .limit(DEFAULT_LIMIT);

  return {
    dbError: null,
    items
  };
};

export const actions: Actions = {
  validateJson: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        success: false,
        mode: 'validate',
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/classification.'
      });
    }

    const formData = await event.request.formData();
    const rawJson = String(formData.get('raw_json') ?? '');
    const parsed = validateClassificationJson(rawJson);

    if (!parsed.ok) {
      return fail(400, {
        success: false,
        mode: 'validate',
        message: 'JSON import validation failed.',
        rawJson,
        validationErrors: parsed.errors,
        validationWarnings: parsed.warnings,
        previewResults: []
      });
    }

    const dbValidation = await validateAgainstDatabase(parsed.inputNewsIds, db);
    if (dbValidation.errors.length > 0) {
      return fail(400, {
        success: false,
        mode: 'validate',
        message: 'JSON import validation failed.',
        rawJson,
        validationErrors: dbValidation.errors,
        validationWarnings: parsed.warnings,
        previewResults: []
      });
    }

    return {
      success: true,
      mode: 'validate',
      message: `JSON import validation passed (${parsed.results.length} items).`,
      rawJson,
      validationErrors: [],
      validationWarnings: parsed.warnings,
      previewResults: toPreviewRows(parsed.results)
    };
  },

  importJson: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        success: false,
        mode: 'import',
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/classification.'
      });
    }

    const formData = await event.request.formData();
    const rawJson = String(formData.get('raw_json') ?? '');
    const parsed = validateClassificationJson(rawJson);
    const fallbackInputIds = extractInputNewsIds(rawJson);

    if (!parsed.ok) {
      await persistFailedImport(db, rawJson, parsed.errors, fallbackInputIds);

      return fail(400, {
        success: false,
        mode: 'import',
        message: 'JSON import failed. Fix validation errors and retry.',
        rawJson,
        validationErrors: parsed.errors,
        validationWarnings: parsed.warnings,
        previewResults: []
      });
    }

    const dbValidation = await validateAgainstDatabase(parsed.inputNewsIds, db);
    if (dbValidation.errors.length > 0) {
      await persistFailedImport(db, rawJson, dbValidation.errors, parsed.inputNewsIds);

      return fail(400, {
        success: false,
        mode: 'import',
        message: 'JSON import failed. Fix validation errors and retry.',
        rawJson,
        validationErrors: dbValidation.errors,
        validationWarnings: parsed.warnings,
        previewResults: toPreviewRows(parsed.results)
      });
    }

    try {
      for (const result of parsed.results) {
        await db
          .insert(newsFeatures)
          .values({
            newsId: result.newsId,
            isHappyCandidate: result.isHappyCandidate,
            happyScore: result.happyScore,
            topicsJson: JSON.stringify(result.topics),
            emotionsJson: JSON.stringify(result.emotions),
            storyTypesJson: JSON.stringify(result.storyTypes),
            riskFlagsJson: JSON.stringify(result.riskFlags),
            negativeContextLevel: result.negativeContextLevel,
            commercialPrLevel: result.commercialPrLevel,
            classifiedBy: 'chatgpt_manual',
            classifiedAt: sql`CURRENT_TIMESTAMP`,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .onConflictDoUpdate({
            target: newsFeatures.newsId,
            set: {
              isHappyCandidate: result.isHappyCandidate,
              happyScore: result.happyScore,
              topicsJson: JSON.stringify(result.topics),
              emotionsJson: JSON.stringify(result.emotions),
              storyTypesJson: JSON.stringify(result.storyTypes),
              riskFlagsJson: JSON.stringify(result.riskFlags),
              negativeContextLevel: result.negativeContextLevel,
              commercialPrLevel: result.commercialPrLevel,
              classifiedBy: 'chatgpt_manual',
              classifiedAt: sql`CURRENT_TIMESTAMP`,
              updatedAt: sql`CURRENT_TIMESTAMP`
            }
          });

        await db
          .update(newsItems)
          .set({
            status: result.isHappyCandidate ? 'candidate' : 'rejected',
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(and(eq(newsItems.id, result.newsId), eq(newsItems.status, 'unclassified')));
      }

      await db.insert(adminImportBatches).values({
        status: 'imported',
        inputNewsIdsJson: JSON.stringify(parsed.inputNewsIds),
        rawJson,
        validationErrorsJson: null,
        importedCount: parsed.results.length,
        importedAt: sql`CURRENT_TIMESTAMP`
      });
    } catch {
      const writeErrors = ['Import write failed. No additional details are shown in the UI.'];
      await persistFailedImport(db, rawJson, writeErrors, parsed.inputNewsIds);

      return fail(500, {
        success: false,
        mode: 'import',
        message: 'JSON import failed during database write.',
        rawJson,
        validationErrors: writeErrors,
        validationWarnings: parsed.warnings,
        previewResults: toPreviewRows(parsed.results)
      });
    }

    return {
      success: true,
      mode: 'import',
      message: `JSON import completed (${parsed.results.length} items).`,
      rawJson,
      validationErrors: [],
      validationWarnings: parsed.warnings,
      previewResults: toPreviewRows(parsed.results)
    };
  }
};
