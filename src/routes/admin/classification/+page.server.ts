import { and, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

import { createDb } from '$lib/db/client';
import { newsItems } from '$lib/db/schema';

const DEFAULT_LIMIT = 50;

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
