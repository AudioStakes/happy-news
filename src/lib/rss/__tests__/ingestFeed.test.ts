import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ParsedRssItem } from '../types';
import { ingestFeed } from '../ingestFeed';

const fetchFeedMock = vi.fn<(url: string) => Promise<string>>();
const parseRssXmlMock = vi.fn<(xml: string) => ParsedRssItem[]>();
const normalizeUrlMock = vi.fn<(url: string) => string>();

vi.mock('../fetchFeed', () => ({
  fetchFeed: (url: string) => fetchFeedMock(url)
}));

vi.mock('../parseRss', () => ({
  parseRssXml: (xml: string) => parseRssXmlMock(xml)
}));

vi.mock('../normalizeUrl', () => ({
  normalizeUrl: (url: string) => normalizeUrlMock(url)
}));

type InsertValues = Record<string, unknown>;

function createMockDb(options?: { duplicates?: Set<string> }) {
  const inserted: InsertValues[] = [];
  const updateWhere = vi.fn(async () => undefined);

  const db = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere
      }))
    })),
    insert: vi.fn(() => ({
      values: (values: InsertValues) => {
        inserted.push(values);

        return {
          onConflictDoNothing: () => ({
            run: async () => {
              const normalizedUrl = String(values.normalizedUrl ?? '');
              const isDuplicate = options?.duplicates?.has(normalizedUrl) ?? false;
              return { meta: { changes: isDuplicate ? 0 : 1 } };
            }
          })
        };
      }
    }))
  };

  return { db, inserted, updateWhere };
}

const feed = {
  id: 7,
  url: 'https://example.com/rss.xml',
  sourceName: 'Example News',
  language: 'en',
  country: 'US'
};

describe('ingestFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchFeedMock.mockResolvedValue('<rss />');
    parseRssXmlMock.mockReturnValue([]);
    normalizeUrlMock.mockImplementation((url) => url);
  });

  it('inserts valid parsed items and stores only metadata', async () => {
    parseRssXmlMock.mockReturnValue([
      {
        title: 'Good News',
        url: 'https://example.com/story?id=1',
        publishedAt: '2026-04-20T10:00:00Z',
        description: 'Short summary'
      }
    ]);
    normalizeUrlMock.mockReturnValue('https://example.com/story?id=1');

    const { db, inserted, updateWhere } = createMockDb();
    const result = await ingestFeed(db as never, feed);

    expect(result).toEqual({
      feedId: 7,
      fetched: 1,
      inserted: 1,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: []
    });

    expect(updateWhere).toHaveBeenCalledTimes(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      title: 'Good News',
      url: 'https://example.com/story?id=1',
      normalizedUrl: 'https://example.com/story?id=1',
      sourceName: 'Example News',
      rssFeedId: 7,
      publishedAt: '2026-04-20T10:00:00Z',
      description: 'Short summary',
      language: 'en',
      country: 'US',
      status: 'unclassified'
    });
    expect(inserted[0]).not.toHaveProperty('body');
    expect(inserted[0]).not.toHaveProperty('summary');
  });

  it('counts duplicates and invalid items', async () => {
    parseRssXmlMock.mockReturnValue([
      {
        title: 'Valid one',
        url: 'https://example.com/a',
        publishedAt: null,
        description: null
      },
      {
        title: 'Duplicate one',
        url: 'https://example.com/b',
        publishedAt: null,
        description: null
      },
      {
        title: 'No URL',
        url: '',
        publishedAt: null,
        description: null
      }
    ]);

    normalizeUrlMock.mockImplementation((url) => {
      if (url.includes('/a')) return 'https://example.com/a';
      if (url.includes('/b')) return 'https://example.com/b';
      return '';
    });

    const { db } = createMockDb({ duplicates: new Set(['https://example.com/b']) });
    const result = await ingestFeed(db as never, feed);

    expect(result).toEqual({
      feedId: 7,
      fetched: 3,
      inserted: 1,
      skippedDuplicates: 1,
      skippedInvalid: 1,
      errors: []
    });
  });

  it('returns fetch error and does not update feed timestamps on fetch failure', async () => {
    fetchFeedMock.mockRejectedValue(new Error('network down'));

    const { db, updateWhere } = createMockDb();
    const result = await ingestFeed(db as never, feed);

    expect(result).toEqual({
      feedId: 7,
      fetched: 0,
      inserted: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: ['network down']
    });

    expect(updateWhere).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });
});
