import { desc, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { createDb } from '$lib/db/client';
import { rssFeeds } from '$lib/db/schema';
import { validateFeedInput } from '$lib/rss/feedValidation';
import { ingestFeed } from '$lib/rss/ingestFeed';

export const load: PageServerLoad = async (event) => {
  const database = event.platform?.env?.DB;
  if (!database) {
    return {
      feeds: [],
      dbError:
        'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/rss.'
    };
  }

  const db = createDb(database);
  const feeds = await db.select().from(rssFeeds).orderBy(desc(rssFeeds.id));

  return {
    feeds,
    dbError: null
  };
};

function duplicateUrlMessage(error: unknown): string | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const message = error.message.toLowerCase();
  if (message.includes('unique') && message.includes('rss_feeds.url')) {
    return 'This feed URL is already registered.';
  }

  return null;
}

function getDb(event: Parameters<Actions['addFeed']>[0]) {
  const database = event.platform?.env?.DB;
  if (!database) {
    return null;
  }

  return createDb(database);
}

export const actions: Actions = {
  addFeed: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/rss.'
      });
    }

    const formData = await event.request.formData();
    const parsed = validateFeedInput({
      name: String(formData.get('name') ?? ''),
      url: String(formData.get('url') ?? ''),
      sourceName: String(formData.get('source_name') ?? ''),
      language: String(formData.get('language') ?? ''),
      country: String(formData.get('country') ?? ''),
      defaultCategory: String(formData.get('default_category') ?? '')
    });

    if (!parsed.ok) {
      return fail(400, { message: parsed.error });
    }

    try {
      await db.insert(rssFeeds).values({
        ...parsed.value,
        isActive: true,
        updatedAt: sql`CURRENT_TIMESTAMP`
      });

      return {
        message: `Registered feed: ${parsed.value.name}`
      };
    } catch (error) {
      const duplicateMessage = duplicateUrlMessage(error);
      if (duplicateMessage) {
        return fail(409, { message: duplicateMessage });
      }

      return fail(500, {
        message: 'Failed to register feed. Please check the input and try again.'
      });
    }
  },

  toggleFeed: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/rss.'
      });
    }

    const formData = await event.request.formData();
    const feedId = Number(formData.get('feed_id'));

    if (!Number.isInteger(feedId) || feedId <= 0) {
      return fail(400, { message: 'Invalid feed id.' });
    }

    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, feedId)).limit(1);
    if (!feed) {
      return fail(404, { message: 'Feed not found.' });
    }

    await db
      .update(rssFeeds)
      .set({
        isActive: !feed.isActive,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(rssFeeds.id, feedId));

    return {
      message: `${feed.name} is now ${feed.isActive ? 'inactive' : 'active'}.`
    };
  },

  ingestFeed: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/rss.'
      });
    }

    const formData = await event.request.formData();
    const feedId = Number(formData.get('feed_id'));

    if (!Number.isInteger(feedId) || feedId <= 0) {
      return fail(400, { message: 'Invalid feed id.' });
    }

    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, feedId)).limit(1);
    if (!feed) {
      return fail(404, { message: 'Feed not found.' });
    }

    if (!feed.isActive) {
      return fail(400, {
        message: 'This feed is inactive. Activate it before running manual ingestion.'
      });
    }

    const result = await ingestFeed(db, {
      id: feed.id,
      url: feed.url,
      sourceName: feed.sourceName,
      language: feed.language,
      country: feed.country
    });

    if (result.errors.length > 0) {
      return fail(400, {
        message: `Ingestion completed with errors for ${feed.name}.`,
        ingestResult: result
      });
    }

    return {
      message: `Ingestion completed for ${feed.name}.`,
      ingestResult: result
    };
  }
};
