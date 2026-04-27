import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { NEWS_STATUSES } from '$lib/constants/classification';
import { createDb } from '$lib/db/client';
import { newsItems, rssFeeds } from '$lib/db/schema';
import { isNewsStatus, parseNewsStatusFilter } from '$lib/news/statusValidation';

const PAGE_SIZE = 50;

function getDb(event: Parameters<Actions['toggleArchived']>[0]) {
  const database = event.platform?.env?.DB;
  if (!database) {
    return null;
  }

  return createDb(database);
}

export const load: PageServerLoad = async (event) => {
  const database = event.platform?.env?.DB;
  const query = event.url.searchParams.get('q')?.trim() ?? '';
  const rawPage = Number(event.url.searchParams.get('page'));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const parsedStatus = parseNewsStatusFilter(event.url.searchParams.get('status'));

  if (!database) {
    return {
      dbError:
        'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/news.',
      items: [],
      counts: {
        all: 0,
        unclassified: 0,
        candidate: 0,
        rejected: 0,
        archived: 0
      },
      filters: {
        q: query,
        status: parsedStatus.value,
        statusError: parsedStatus.error
      },
      pagination: {
        page,
        hasNext: false,
        hasPrev: false,
        limit: PAGE_SIZE
      }
    };
  }

  const db = createDb(database);
  const qFilter = query
    ? or(like(newsItems.title, `%${query}%`), like(newsItems.sourceName, `%${query}%`))
    : undefined;

  const listFilters = [];
  if (qFilter) {
    listFilters.push(qFilter);
  }
  if (parsedStatus.value) {
    listFilters.push(eq(newsItems.status, parsedStatus.value));
  }

  const filteredItems = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      url: newsItems.url,
      sourceName: newsItems.sourceName,
      rssFeedName: rssFeeds.name,
      publishedAt: newsItems.publishedAt,
      status: newsItems.status,
      fetchedAt: newsItems.fetchedAt,
      description: newsItems.description,
      language: newsItems.language,
      country: newsItems.country
    })
    .from(newsItems)
    .leftJoin(rssFeeds, eq(newsItems.rssFeedId, rssFeeds.id))
    .where(listFilters.length > 0 ? and(...listFilters) : undefined)
    .orderBy(desc(newsItems.fetchedAt), desc(newsItems.id))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const groupedCounts = await db
    .select({
      status: newsItems.status,
      count: sql<number>`count(*)`
    })
    .from(newsItems)
    .where(qFilter)
    .groupBy(newsItems.status);

  const counts = {
    all: groupedCounts.reduce((sum, row) => sum + row.count, 0),
    unclassified: 0,
    candidate: 0,
    rejected: 0,
    archived: 0
  };

  for (const row of groupedCounts) {
    if (isNewsStatus(row.status)) {
      counts[row.status] = row.count;
    }
  }

  return {
    dbError: null,
    items: filteredItems.slice(0, PAGE_SIZE),
    counts,
    filters: {
      q: query,
      status: parsedStatus.value,
      statusError: parsedStatus.error
    },
    pagination: {
      page,
      hasNext: filteredItems.length > PAGE_SIZE,
      hasPrev: page > 1,
      limit: PAGE_SIZE
    },
    statusOptions: NEWS_STATUSES
  };
};

export const actions: Actions = {
  toggleArchived: async (event) => {
    const db = getDb(event);
    if (!db) {
      return fail(500, {
        success: false,
        message:
          'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /admin/news.'
      });
    }

    const formData = await event.request.formData();
    const newsId = Number(formData.get('news_id'));

    if (!Number.isInteger(newsId) || newsId <= 0) {
      return fail(400, {
        success: false,
        message: 'Invalid news id.'
      });
    }

    const [existing] = await db
      .select({ id: newsItems.id, status: newsItems.status, title: newsItems.title })
      .from(newsItems)
      .where(eq(newsItems.id, newsId))
      .limit(1);

    if (!existing) {
      return fail(404, {
        success: false,
        message: 'News item not found.'
      });
    }

    const nextStatus = existing.status === 'archived' ? 'unclassified' : 'archived';
    if (!isNewsStatus(nextStatus)) {
      return fail(400, {
        success: false,
        message: 'Invalid target status.'
      });
    }

    try {
      await db
        .update(newsItems)
        .set({
          status: nextStatus,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(newsItems.id, newsId));
    } catch {
      return fail(500, {
        success: false,
        message: 'Failed to update news item status. Please try again.'
      });
    }

    return {
      success: true,
      message:
        nextStatus === 'archived'
          ? `Archived: ${existing.title}`
          : `Restored to unclassified: ${existing.title}`
    };
  }
};
