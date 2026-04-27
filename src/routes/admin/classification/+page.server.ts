import { desc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import {
  DB_MISSING_MESSAGE,
  ImportValidationError,
  extractInputNewsIds,
  getClassificationDb,
  importValidatedResults,
  parseClassificationJson,
  persistFailedImport,
  toPreviewRows,
  validateNewsIdsAgainstDatabase
} from '$lib/classification/importClassificationJson';
import { newsItems } from '$lib/db/schema';

const DEFAULT_LIMIT = 50;

export const load: PageServerLoad = async (event) => {
  const db = getClassificationDb(event.platform?.env?.DB);
  if (!db) {
    return {
      dbError: DB_MISSING_MESSAGE,
      items: []
    };
  }

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
    .where(eq(newsItems.status, 'unclassified'))
    .orderBy(desc(newsItems.fetchedAt), desc(newsItems.id))
    .limit(DEFAULT_LIMIT);

  return {
    dbError: null,
    items
  };
};

export const actions: Actions = {
  validateJson: async (event) => {
    const db = getClassificationDb(event.platform?.env?.DB);
    if (!db) {
      return fail(500, {
        success: false,
        mode: 'validate',
        message: DB_MISSING_MESSAGE
      });
    }

    const formData = await event.request.formData();
    const rawJson = String(formData.get('raw_json') ?? '');
    const parsed = parseClassificationJson(rawJson);

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

    const dbErrors = await validateNewsIdsAgainstDatabase(parsed.inputNewsIds, db);
    if (dbErrors.length > 0) {
      return fail(400, {
        success: false,
        mode: 'validate',
        message: 'JSON import validation failed.',
        rawJson,
        validationErrors: dbErrors,
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
    const db = getClassificationDb(event.platform?.env?.DB);
    if (!db) {
      return fail(500, {
        success: false,
        mode: 'import',
        message: DB_MISSING_MESSAGE
      });
    }

    const formData = await event.request.formData();
    const rawJson = String(formData.get('raw_json') ?? '');
    const parsed = parseClassificationJson(rawJson);

    if (!parsed.ok) {
      const fallbackInputIds = extractInputNewsIds(rawJson);
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

    const dbErrors = await validateNewsIdsAgainstDatabase(parsed.inputNewsIds, db);
    if (dbErrors.length > 0) {
      await persistFailedImport(db, rawJson, dbErrors, parsed.inputNewsIds);

      return fail(400, {
        success: false,
        mode: 'import',
        message: 'JSON import failed. Fix validation errors and retry.',
        rawJson,
        validationErrors: dbErrors,
        validationWarnings: parsed.warnings,
        previewResults: toPreviewRows(parsed.results)
      });
    }

    try {
      await importValidatedResults(db, rawJson, parsed.results);
    } catch (error) {
      if (error instanceof ImportValidationError) {
        await persistFailedImport(db, rawJson, error.messages, parsed.inputNewsIds);

        return fail(400, {
          success: false,
          mode: 'import',
          message: 'JSON import failed. Fix validation errors and retry.',
          rawJson,
          validationErrors: error.messages,
          validationWarnings: parsed.warnings,
          previewResults: toPreviewRows(parsed.results)
        });
      }

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
