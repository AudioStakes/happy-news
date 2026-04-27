import { eq, sql } from 'drizzle-orm';

import { newsItems, rssFeeds } from '../db/schema';
import type { DbClient } from '../db/client';
import { fetchFeed } from './fetchFeed';
import { normalizeUrl } from './normalizeUrl';
import { parseRssXml } from './parseRss';
import type { IngestFeedInput, IngestFeedResult, ParsedRssItem } from './types';

function isLikelyHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function ingestFeed(db: DbClient, feed: IngestFeedInput): Promise<IngestFeedResult> {
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

  let parsedItems: ParsedRssItem[] = [];
  try {
    parsedItems = parseRssXml(xml);
    result.fetched = parsedItems.length;
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Failed to parse feed XML');
  }

  try {
    await db
      .update(rssFeeds)
      .set({
        lastFetchedAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(rssFeeds.id, feed.id));
  } catch (error) {
    result.errors.push(
      error instanceof Error
        ? `Failed to update last_fetched_at for feed ${feed.id}: ${error.message}`
        : `Failed to update last_fetched_at for feed ${feed.id}`
    );
  }

  for (const item of parsedItems) {
    if (!item.title.trim() || !item.url.trim()) {
      result.skippedInvalid += 1;
      continue;
    }

    const normalizedUrl = normalizeUrl(item.url);
    if (!normalizedUrl || !isLikelyHttpUrl(normalizedUrl)) {
      result.skippedInvalid += 1;
      continue;
    }

    try {
      const insertResult = await db
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
          fetchedAt: sql`CURRENT_TIMESTAMP`
        })
        .onConflictDoNothing({ target: newsItems.normalizedUrl })
        .run();

      if (insertResult.meta.changes > 0) {
        result.inserted += insertResult.meta.changes;
      } else {
        result.skippedDuplicates += 1;
      }
    } catch (error) {
      result.skippedInvalid += 1;
      result.errors.push(
        error instanceof Error
          ? `Failed to insert news item (${item.url}): ${error.message}`
          : `Failed to insert news item (${item.url})`
      );
    }
  }

  return result;
}
