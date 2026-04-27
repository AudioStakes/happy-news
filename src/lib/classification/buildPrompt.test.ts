import { describe, expect, it } from 'vitest';

import {
  buildClassificationPrompt,
  MAX_CLASSIFICATION_SELECTION,
  type ClassificationPromptNewsItem
} from './buildPrompt';
import {
  ALLOWED_EMOTIONS,
  ALLOWED_RISK_FLAGS,
  ALLOWED_STORY_TYPES,
  ALLOWED_TOPICS
} from '$lib/constants/classification';

const sampleItems: ClassificationPromptNewsItem[] = [
  {
    id: 101,
    title: '保護犬の新しい家族が見つかった',
    url: 'https://example.com/news/101',
    sourceName: 'Happy Source',
    publishedAt: '2026-04-20T09:00:00.000Z',
    description: '保護団体の活動により新しい家族と出会えたというRSS description',
    language: 'ja',
    country: 'JP'
  }
];

describe('buildClassificationPrompt', () => {
  it('includes strict JSON-only and no-SQL instructions', () => {
    const prompt = buildClassificationPrompt(sampleItems);

    expect(prompt).toContain('出力はJSONのみ');
    expect(prompt).toContain('SQLは絶対に出力しないこと');
  });

  it('includes allowed tag values from constants', () => {
    const prompt = buildClassificationPrompt(sampleItems);

    expect(prompt).toContain(JSON.stringify(ALLOWED_TOPICS));
    expect(prompt).toContain(JSON.stringify(ALLOWED_EMOTIONS));
    expect(prompt).toContain(JSON.stringify(ALLOWED_STORY_TYPES));
    expect(prompt).toContain(JSON.stringify(ALLOWED_RISK_FLAGS));
  });

  it('includes selected news item metadata and ids', () => {
    const prompt = buildClassificationPrompt(sampleItems);

    expect(prompt).toContain('"news_id": 101');
    expect(prompt).toContain('"source_name": "Happy Source"');
    expect(prompt).toContain('"rss_description": "保護団体の活動により新しい家族と出会えたというRSS description"');
  });

  it('forbids URL fetching and does not request fetching URLs', () => {
    const prompt = buildClassificationPrompt(sampleItems);

    expect(prompt).toContain('URL先の記事ページを取得・閲覧しないこと');
    expect(prompt).not.toContain('URLを取得して');
    expect(prompt).not.toContain('ページをクロール');
  });

  it('throws for empty items', () => {
    expect(() => buildClassificationPrompt([])).toThrow('At least one news item is required');
  });

  it('throws when item count exceeds max selection', () => {
    const tooManyItems = Array.from({ length: MAX_CLASSIFICATION_SELECTION + 1 }, (_, index) => ({
      ...sampleItems[0],
      id: index + 1,
      url: `https://example.com/news/${index + 1}`
    }));

    expect(() => buildClassificationPrompt(tooManyItems)).toThrow(
      `You can classify up to ${MAX_CLASSIFICATION_SELECTION} items at once.`
    );
  });
});
