import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BASELINE_SCORE, clampScore, getTagDelta } from './preferenceScoring';
import { updatePreferenceScores } from './updatePreferenceScores';

type InsertRow = {
  userId: number;
  targetType: string;
  targetKey: string;
  score: number;
  updatedAt: unknown;
};

type ConflictOptions = {
  target: unknown[];
  set: { score: unknown; updatedAt: unknown };
};

function createMockDb(featureRow: Record<string, string | null> | null = null) {
  const insertedRows: InsertRow[] = [];
  let conflictOptions: ConflictOptions | null = null;

  const onConflictDoUpdate = vi.fn((opts: ConflictOptions) => {
    conflictOptions = opts;
    return Promise.resolve();
  });

  const valuesChain = vi.fn((rows: InsertRow[]) => {
    insertedRows.push(...rows);
    return { onConflictDoUpdate };
  });

  const db = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => (featureRow ? [featureRow] : []))
        }))
      }))
    })),
    insert: vi.fn(() => ({ values: valuesChain }))
  };

  return { db, insertedRows, onConflictDoUpdate, get conflictOptions() { return conflictOptions; } };
}

describe('updatePreferenceScores', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early without inserting when news_features row is missing', async () => {
    const { db, insertedRows } = createMockDb(null);

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 99, happyRating: 4 });

    expect(db.insert).not.toHaveBeenCalled();
    expect(insertedRows).toHaveLength(0);
  });

  it('returns early without inserting when all tag arrays are empty', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: '[]',
      emotionsJson: '[]',
      storyTypesJson: '[]',
      riskFlagsJson: '[]'
    });

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 10, happyRating: 3 });

    expect(db.insert).not.toHaveBeenCalled();
    expect(insertedRows).toHaveLength(0);
  });

  it('inserts one row per deduplicated tag across all types', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: '["科学技術", "科学技術"]',
      emotionsJson: '["希望", "喜び"]',
      storyTypesJson: null,
      riskFlagsJson: '["災害"]'
    });

    await updatePreferenceScores({ db: db as never, userId: 5, newsId: 10, happyRating: 4 });

    expect(insertedRows).toHaveLength(4);
    expect(insertedRows.map((r) => r.targetKey)).toEqual(
      expect.arrayContaining(['科学技術', '希望', '喜び', '災害'])
    );
  });

  it('sets correct userId on all inserted rows', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: '["地域社会"]',
      emotionsJson: null,
      storyTypesJson: null,
      riskFlagsJson: null
    });

    await updatePreferenceScores({ db: db as never, userId: 42, newsId: 10, happyRating: 5 });

    expect(insertedRows.every((r) => r.userId === 42)).toBe(true);
  });

  it('initial score for topic is baseline + delta for rating 5 (clamped to [0,1])', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: '["科学技術"]',
      emotionsJson: null,
      storyTypesJson: null,
      riskFlagsJson: null
    });

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 10, happyRating: 5 });

    const topicRow = insertedRows.find((r) => r.targetType === 'topic');
    expect(topicRow).toBeDefined();
    // rating 5 topic delta = +0.15, baseline = 0.5 → 0.65
    expect(topicRow!.score).toBeCloseTo(clampScore(BASELINE_SCORE + getTagDelta('topic', 5)));
  });

  it('initial score for risk_flag uses risk delta (inverse of content)', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: null,
      emotionsJson: null,
      storyTypesJson: null,
      riskFlagsJson: '["災害"]'
    });

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 10, happyRating: 5 });

    const riskRow = insertedRows.find((r) => r.targetType === 'risk_flag');
    expect(riskRow).toBeDefined();
    // rating 5 risk_flag delta = -0.08, baseline = 0.5 → 0.42
    expect(riskRow!.score).toBeCloseTo(clampScore(BASELINE_SCORE + getTagDelta('risk_flag', 5)));
  });

  it('passes onConflictDoUpdate with target covering userId, targetType, targetKey', async () => {
    const { db, onConflictDoUpdate } = createMockDb({
      topicsJson: '["科学技術"]',
      emotionsJson: null,
      storyTypesJson: null,
      riskFlagsJson: null
    });

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 10, happyRating: 4 });

    expect(onConflictDoUpdate).toHaveBeenCalledOnce();
    const opts = onConflictDoUpdate.mock.calls[0][0] as ConflictOptions;
    expect(opts.target).toHaveLength(3);
    expect(opts.set).toHaveProperty('score');
    expect(opts.set).toHaveProperty('updatedAt');
  });

  it('initial scores are clamped to [0, 1]', async () => {
    const { db, insertedRows } = createMockDb({
      topicsJson: '["科学技術"]',
      emotionsJson: null,
      storyTypesJson: null,
      riskFlagsJson: null
    });

    await updatePreferenceScores({ db: db as never, userId: 1, newsId: 10, happyRating: 1 });

    for (const row of insertedRows) {
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(1);
    }
  });
});
