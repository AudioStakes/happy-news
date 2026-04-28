import { describe, expect, it } from 'vitest';

import type { HomeNewsItem } from './getHomeNews';
import { getHomeNews } from './getHomeNews';

type MockRow = HomeNewsItem;

function createMockDb(rows: MockRow[] = []) {
  let capturedLimit: number | undefined;
  const capturedWhereArgs: unknown[] = [];
  let capturedOrderArgs: unknown[] = [];

  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    where: (...args: unknown[]) => {
      capturedWhereArgs.push(...args);
      return chain;
    },
    orderBy: (...args: unknown[]) => {
      capturedOrderArgs = args;
      return chain;
    },
    limit: (n: number) => {
      capturedLimit = n;
      return Promise.resolve(rows);
    }
  };

  const db = {
    select: () => chain
  };

  return {
    db,
    getCapturedLimit: () => capturedLimit,
    getCapturedWhereArgs: () => capturedWhereArgs,
    getCapturedOrderArgs: () => capturedOrderArgs
  };
}

const sampleRows: MockRow[] = [
  {
    id: 1,
    title: 'Happy Story',
    url: 'https://example.com/1',
    sourceName: 'Example News',
    publishedAt: '2026-04-20T10:00:00Z',
    fetchedAt: '2026-04-20T12:00:00Z'
  },
  {
    id: 2,
    title: 'Another Happy Story',
    url: 'https://example.com/2',
    sourceName: 'Example News',
    publishedAt: null,
    fetchedAt: '2026-04-20T11:00:00Z'
  }
];

describe('getHomeNews', () => {
  it('returns rows provided by the db query', async () => {
    const { db } = createMockDb(sampleRows);
    const result = await getHomeNews(db as never, 42);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 1, title: 'Happy Story' });
    expect(result[1]).toMatchObject({ id: 2, title: 'Another Happy Story' });
  });

  it('uses default limit of 3 when no limit argument is given', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1);

    expect(getCapturedLimit()).toBe(3);
  });

  it('passes the given limit through when it is within bounds', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1, 5);

    expect(getCapturedLimit()).toBe(5);
  });

  it('clamps limit to a maximum of 10', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1, 20);

    expect(getCapturedLimit()).toBe(10);
  });

  it('falls back to default limit 3 when limit is zero', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1, 0);

    expect(getCapturedLimit()).toBe(3);
  });

  it('falls back to default limit 3 when limit is negative', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1, -5);

    expect(getCapturedLimit()).toBe(3);
  });

  it('falls back to default limit 3 when limit is not an integer', async () => {
    const { db, getCapturedLimit } = createMockDb();
    await getHomeNews(db as never, 1, 2.7);

    expect(getCapturedLimit()).toBe(3);
  });

  it('returns an empty array when no rows match', async () => {
    const { db } = createMockDb([]);
    const result = await getHomeNews(db as never, 1);

    expect(result).toEqual([]);
  });

  it('applies 3 order-by expressions (score, fetchedAt, id)', async () => {
    const { db, getCapturedOrderArgs } = createMockDb();
    await getHomeNews(db as never, 1);

    // coalesce(happy_score, 0) desc, fetchedAt desc, id desc
    expect(getCapturedOrderArgs()).toHaveLength(3);
  });
});
