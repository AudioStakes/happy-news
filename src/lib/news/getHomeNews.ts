import { and, desc, eq, sql } from 'drizzle-orm';

import type { DbClient } from '$lib/db/client';
import { newsFeatures, newsItems, userPreferenceScores, userRatings } from '$lib/db/schema';
import { parseNewsFeatureTags } from '$lib/preferences/preferenceScoring';

import { scoreCandidateForUser } from './recommendationScoring';

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 10;
const DEFAULT_CANDIDATE_POOL_SIZE = 50;

export type HomeNewsItem = {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  fetchedAt: string;
};

type CandidateNewsRow = HomeNewsItem & {
  happyScore: number | null;
  topicsJson: string | null;
  emotionsJson: string | null;
  storyTypesJson: string | null;
  riskFlagsJson: string | null;
};

function parseDateValue(dateValue: string | null): number {
  if (!dateValue) {
    return 0;
  }

  const timestamp = Date.parse(dateValue);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getRecencyTimestamp(row: Pick<HomeNewsItem, 'publishedAt' | 'fetchedAt'>): number {
  const publishedTimestamp = parseDateValue(row.publishedAt);
  if (publishedTimestamp > 0) {
    return publishedTimestamp;
  }

  return parseDateValue(row.fetchedAt);
}

function compareCandidateRows(
  left: CandidateNewsRow & { recommendationScore: number },
  right: CandidateNewsRow & { recommendationScore: number }
): number {
  if (left.recommendationScore !== right.recommendationScore) {
    return right.recommendationScore - left.recommendationScore;
  }

  if (left.happyScore !== right.happyScore) {
    return (right.happyScore ?? 0) - (left.happyScore ?? 0);
  }

  const rightRecency = getRecencyTimestamp(right);
  const leftRecency = getRecencyTimestamp(left);
  if (leftRecency !== rightRecency) {
    return rightRecency - leftRecency;
  }

  return right.id - left.id;
}

export async function getHomeNews(db: DbClient, userId: number, limit = DEFAULT_LIMIT): Promise<HomeNewsItem[]> {
  const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, MAX_LIMIT) : DEFAULT_LIMIT;
  const candidatePoolSize = Math.max(DEFAULT_CANDIDATE_POOL_SIZE, safeLimit);

  const [preferences, candidateRows] = await Promise.all([
    db
      .select({
        targetType: userPreferenceScores.targetType,
        targetKey: userPreferenceScores.targetKey,
        score: userPreferenceScores.score
      })
      .from(userPreferenceScores)
      .where(eq(userPreferenceScores.userId, userId)),
    db
      .select({
        id: newsItems.id,
        title: newsItems.title,
        url: newsItems.url,
        sourceName: newsItems.sourceName,
        publishedAt: newsItems.publishedAt,
        fetchedAt: sql<string>`strftime('%Y-%m-%dT%H:%M:%SZ', ${newsItems.fetchedAt})`,
        happyScore: newsFeatures.happyScore,
        topicsJson: newsFeatures.topicsJson,
        emotionsJson: newsFeatures.emotionsJson,
        storyTypesJson: newsFeatures.storyTypesJson,
        riskFlagsJson: newsFeatures.riskFlagsJson
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
      .orderBy(sql`coalesce(${newsFeatures.happyScore}, 0) desc`, desc(newsItems.fetchedAt), desc(newsItems.id))
      .limit(candidatePoolSize)
  ]);

  const scoredCandidates = candidateRows
    .map((row) => {
      const featureTags = parseNewsFeatureTags({
        topicsJson: row.topicsJson,
        emotionsJson: row.emotionsJson,
        storyTypesJson: row.storyTypesJson,
        riskFlagsJson: row.riskFlagsJson
      });

      return {
        ...row,
        recommendationScore: scoreCandidateForUser(
          {
            happyScore: row.happyScore,
            topics: featureTags.topics,
            emotions: featureTags.emotions,
            storyTypes: featureTags.storyTypes,
            riskFlags: featureTags.riskFlags
          },
          preferences
        )
      };
    })
    .sort(compareCandidateRows)
    .slice(0, safeLimit);

  return scoredCandidates.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    sourceName: row.sourceName,
    publishedAt: row.publishedAt,
    fetchedAt: row.fetchedAt
  }));
}
