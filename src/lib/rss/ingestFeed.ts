import 'server-only';
import { eq } from 'drizzle-orm';

import { NEWS_STATUSES } from '$lib/constants/classification';
import type { Database } from '$lib/db/client';
import { newsItems, rssFeeds } from '$lib/db/schema';

import { fetchFeed } from './fetchFeed';
import { normalizeUrl } from './normalizeUrl';
import { parseRssXml } from './parseRss';
import type { IngestFeedInput, IngestFeedResult } from './types';

function nowIsoString(): string {
  return new Date().toISOString();
}

export async function ingestFeed(db: Database, feed: IngestFeedInput): Promise<IngestFeedResult> {
  const result: IngestFeedResult = {
    feedId: feed.id,
    fetched: 0,
    inserted: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    errors: []
  };

  let xml = '';
  try {
    xml = await fetchFeed(feed.url);
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to fetch feed');
    return result;
  }

  await db
    .update(rssFeeds)
    .set({
      lastFetchedAt: nowIsoString(),
      updatedAt: nowIsoString()
    })
    .where(eq(rssFeeds.id, feed.id));

  const parsedItems = parseRssXml(xml);
  result.fetched = parsedItems.length;

  for (const item of parsedItems) {
    const normalizedUrl = normalizeUrl(item.url);

    if (!item.title.trim() || !normalizedUrl) {
      result.skippedInvalid += 1;
      continue;
    }

    const existing = await db
      .select({ id: newsItems.id })
      .from(newsItems)
      .where(eq(newsItems.normalizedUrl, normalizedUrl))
      .limit(1);

    if (existing.length > 0) {
      result.skippedDuplicates += 1;
      continue;
    }

    try {
      await db.insert(newsItems).values({
        title: item.title,
        url: item.url,
        normalizedUrl,
        sourceName: feed.sourceName,
        rssFeedId: feed.id,
        publishedAt: item.publishedAt,
        description: item.description,
        language: feed.language,
        country: feed.country,
        status: NEWS_STATUSES[0],
        fetchedAt: nowIsoString(),
        updatedAt: nowIsoString()
      });

      result.inserted += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to insert news item';
      if (message.toLowerCase().includes('unique')) {
        result.skippedDuplicates += 1;
      } else {
        result.skippedInvalid += 1;
        result.errors.push(message);
      }
    }
  }

  return result;
}
