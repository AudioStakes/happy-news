import { and, eq, inArray, sql } from 'drizzle-orm';

import { type ValidClassificationResult, validateClassificationJson } from '$lib/classification/validateClassificationJson';
import { createDb } from '$lib/db/client';
import { adminImportBatches, newsFeatures, newsItems } from '$lib/db/schema';

export const DB_MISSING_MESSAGE =
  'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/classification.';

type DbClient = ReturnType<typeof createDb>;
type ReadDb = Pick<DbClient, 'select'>;

export class ImportValidationError extends Error {
  constructor(public readonly messages: string[]) {
    super('Import validation failed.');
  }
}

export function getClassificationDb(database: D1Database | undefined | null): DbClient | null {
  if (!database) {
    return null;
  }

  return createDb(database);
}

export function extractInputNewsIds(rawJson: string): number[] {
  try {
    const parsed = JSON.parse(rawJson) as { results?: Array<{ news_id?: unknown }> };
    if (!Array.isArray(parsed.results)) {
      return [];
    }

    return parsed.results
      .map((row) => row.news_id)
      .filter((newsId): newsId is number => typeof newsId === 'number' && Number.isInteger(newsId) && newsId > 0);
  } catch {
    return [];
  }
}

export function toPreviewRows(results: ValidClassificationResult[]) {
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

export async function validateNewsIdsAgainstDatabase(inputNewsIds: number[], db: ReadDb): Promise<string[]> {
  if (inputNewsIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ id: newsItems.id, status: newsItems.status })
    .from(newsItems)
    .where(inArray(newsItems.id, inputNewsIds));

  const foundIds = new Set(rows.map((row) => row.id));
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

  return errors;
}

export async function persistFailedImport(db: DbClient, rawJson: string, errors: string[], inputNewsIds: number[]) {
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

export async function importValidatedResults(db: DbClient, rawJson: string, results: ValidClassificationResult[]) {
  await db.transaction(async (tx) => {
    const targetIds = results.map((result) => result.newsId);
    const dbErrors = await validateNewsIdsAgainstDatabase(targetIds, tx);
    if (dbErrors.length > 0) {
      throw new ImportValidationError(dbErrors);
    }

    for (const result of results) {
      await tx
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

      await tx
        .update(newsItems)
        .set({
          status: result.isHappyCandidate ? 'candidate' : 'rejected',
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(and(eq(newsItems.id, result.newsId), eq(newsItems.status, 'unclassified')));
    }

    await tx.insert(adminImportBatches).values({
      status: 'imported',
      inputNewsIdsJson: JSON.stringify(targetIds),
      rawJson,
      validationErrorsJson: null,
      importedCount: results.length,
      importedAt: sql`CURRENT_TIMESTAMP`
    });
  });
}

export function parseClassificationJson(rawJson: string) {
  return validateClassificationJson(rawJson);
}
