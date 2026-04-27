import 'server-only';

import { eq } from 'drizzle-orm';

import type { Database } from '$lib/db/client';
import { newsItems, rssFeeds } from '$lib/db/schema';

import { fetchFeed } from './fetchFeed';
import { normalizeUrl } from './normalizeUrl';
import { parseRssXml } from './parseRss';
import type { IngestFeedInput, IngestFeedResult } from './types';

function nowIsoString(): string {
  return new Date().toISOString();
}

function isLikelyHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
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
    if (!item.title.trim() || !isLikelyHttpUrl(item.url)) {
      result.skippedInvalid += 1;
      continue;
    }

    const normalizedUrl = normalizeUrl(item.url);
    if (!isLikelyHttpUrl(normalizedUrl)) {
      result.skippedInvalid += 1;
      continue;
    }

    try {
      const inserted = await db
        .insert(newsItems)
        .values({
          title: item.title,
          url: item.url,
          normalizedUrl,
          sourceName: feed.sourceName,
          rssFeedId: feed.id,
          publishedAt: item.publishedAt,
          description: item.description,
          language: feed.language,
          country: feed.country,
          status: 'unclassified',
          fetchedAt: nowIsoString(),
          updatedAt: nowIsoString()
        })
        .onConflictDoNothing({ target: newsItems.normalizedUrl })
        .returning({ id: newsItems.id });

      if (inserted.length === 0) {
        result.skippedDuplicates += 1;
      } else {
        result.inserted += inserted.length;
      }
    } catch (error) {
      result.skippedInvalid += 1;
      result.errors.push(error instanceof Error ? error.message : 'Failed to insert news item');
    }
  }

  return result;
}
