import { describe, expect, it } from 'vitest';

import type { UserPreferenceTargetType } from '$lib/constants/classification';

import { getHomeNews } from './getHomeNews';

type CandidateRow = {
  id: number;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string | null;
  fetchedAt: string;
  happyScore: number | null;
  topicsJson: string | null;
  emotionsJson: string | null;
  storyTypesJson: string | null;
  riskFlagsJson: string | null;
};

type PreferenceRow = {
  targetType: UserPreferenceTargetType;
  targetKey: string;
  score: number;
};

function createMockDb(preferences: PreferenceRow[], candidates: CandidateRow[]) {
  let candidateLimit: number | undefined;

  const preferenceChain = {
    from: () => preferenceChain,
    where: () => Promise.resolve(preferences)
  };

  const candidateChain = {
    from: () => candidateChain,
    innerJoin: () => candidateChain,
    where: () => candidateChain,
    orderBy: () => candidateChain,
    limit: (n: number) => {
      candidateLimit = n;
      return Promise.resolve(candidates);
    }
  };

  const db = {
    select: (selection: Record<string, unknown>) => {
      if ('targetType' in selection && 'targetKey' in selection && 'score' in selection) {
        return preferenceChain;
      }

      return candidateChain;
    }
  };

  return {
    db,
    getCandidateLimit: () => candidateLimit
  };
}

describe('getHomeNews', () => {
  it('uses default limit and fetches a larger candidate pool', async () => {
    const { db, getCandidateLimit } = createMockDb([], []);

    const result = await getHomeNews(db as never, 10);

    expect(result).toEqual([]);
    expect(getCandidateLimit()).toBe(50);
  });

  it('clamps requested limit to maximum and still uses candidate pool fetch', async () => {
    const { db, getCandidateLimit } = createMockDb([], []);

    await getHomeNews(db as never, 10, 999);

    expect(getCandidateLimit()).toBe(50);
  });

  it('returns only user-facing fields', async () => {
    const candidateRows: CandidateRow[] = [
      {
        id: 1,
        title: 'Happy Story',
        url: 'https://example.com/1',
        sourceName: 'Example',
        publishedAt: '2026-04-20T00:00:00Z',
        fetchedAt: '2026-04-20T01:00:00Z',
        happyScore: 95,
        topicsJson: '["science"]',
        emotionsJson: '["hope"]',
        storyTypesJson: '["rescue"]',
        riskFlagsJson: '[]'
      }
    ];

    const { db } = createMockDb([], candidateRows);
    const result = await getHomeNews(db as never, 1, 1);

    expect(result).toEqual([
      {
        id: 1,
        title: 'Happy Story',
        url: 'https://example.com/1',
        sourceName: 'Example',
        publishedAt: '2026-04-20T00:00:00Z',
        fetchedAt: '2026-04-20T01:00:00Z'
      }
    ]);
  });

  it('uses preference scores for ranking and keeps deterministic tie-breakers', async () => {
    const candidateRows: CandidateRow[] = [
      {
        id: 1,
        title: 'Matched Preference',
        url: 'https://example.com/1',
        sourceName: 'Example',
        publishedAt: '2026-04-20T00:00:00Z',
        fetchedAt: '2026-04-20T01:00:00Z',
        happyScore: 70,
        topicsJson: '["science"]',
        emotionsJson: '[]',
        storyTypesJson: '[]',
        riskFlagsJson: '[]'
      },
      {
        id: 2,
        title: 'No Preference Match',
        url: 'https://example.com/2',
        sourceName: 'Example',
        publishedAt: '2026-04-22T00:00:00Z',
        fetchedAt: '2026-04-22T01:00:00Z',
        happyScore: 70,
        topicsJson: '["sports"]',
        emotionsJson: '[]',
        storyTypesJson: '[]',
        riskFlagsJson: '[]'
      }
    ];

    const preferences: PreferenceRow[] = [
      {
        targetType: 'topic',
        targetKey: 'science',
        score: 0.95
      }
    ];

    const { db } = createMockDb(preferences, candidateRows);
    const result = await getHomeNews(db as never, 1, 2);

    expect(result.map((row) => row.id)).toEqual([1, 2]);
  });

  it('falls back to recency and id ordering when recommendation scores are tied', async () => {
    const candidateRows: CandidateRow[] = [
      {
        id: 2,
        title: 'Older',
        url: 'https://example.com/2',
        sourceName: 'Example',
        publishedAt: '2026-04-20T00:00:00Z',
        fetchedAt: '2026-04-20T01:00:00Z',
        happyScore: 80,
        topicsJson: '[]',
        emotionsJson: '[]',
        storyTypesJson: '[]',
        riskFlagsJson: '[]'
      },
      {
        id: 1,
        title: 'Newer',
        url: 'https://example.com/1',
        sourceName: 'Example',
        publishedAt: '2026-04-21T00:00:00Z',
        fetchedAt: '2026-04-21T01:00:00Z',
        happyScore: 80,
        topicsJson: '[]',
        emotionsJson: '[]',
        storyTypesJson: '[]',
        riskFlagsJson: '[]'
      }
    ];

    const { db } = createMockDb([], candidateRows);
    const result = await getHomeNews(db as never, 1, 2);

    expect(result.map((row) => row.id)).toEqual([1, 2]);
  });
});
