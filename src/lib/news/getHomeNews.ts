import { and, desc, eq, sql } from 'drizzle-orm';

import type { DbClient } from '$lib/db/client';
import { newsFeatures, newsItems, userRatings } from '$lib/db/schema';

export type HomeNewsItem = {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  fetchedAt: string;
};

export async function getHomeNews(db: DbClient, userId: number, limit = 3): Promise<HomeNewsItem[]> {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 10) : 3;

  return db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      url: newsItems.url,
      sourceName: newsItems.sourceName,
      publishedAt: newsItems.publishedAt,
      fetchedAt: sql<string>`strftime('%Y-%m-%dT%H:%M:%SZ', ${newsItems.fetchedAt})`
    })
    .from(newsItems)
    .innerJoin(newsFeatures, eq(newsFeatures.newsId, newsItems.id))
    .where(
      and(
        eq(newsItems.status, 'candidate'),
        eq(newsFeatures.isHappyCandidate, true),
        sql`not exists (
          select 1
          from ${userRatings}
          where ${userRatings.userId} = ${userId}
            and ${userRatings.newsId} = ${newsItems.id}
        )`
      )
    )
    .orderBy(
      sql`coalesce(${newsFeatures.happyScore}, 0) desc`,
      desc(newsItems.fetchedAt),
      desc(newsItems.id)
    )
    .limit(safeLimit);
}
