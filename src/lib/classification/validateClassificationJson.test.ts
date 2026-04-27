import { describe, expect, it } from 'vitest';

import { validateClassificationJson } from './validateClassificationJson';

const validJson = JSON.stringify({
  results: [
    {
      news_id: 101,
      is_happy_candidate: true,
      happy_score: 85,
      topics: ['動物', '地域社会'],
      emotions: ['癒し', 'ほっこり'],
      story_types: ['救出', '再会'],
      risk_flags: [],
      negative_context_level: 1,
      commercial_pr_level: 0
    }
  ]
});

describe('validateClassificationJson', () => {
  it('passes with valid JSON', () => {
    const result = validateClassificationJson(validJson);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.results).toHaveLength(1);
      expect(result.inputNewsIds).toEqual([101]);
    }
  });

  it('fails for invalid JSON', () => {
    const result = validateClassificationJson('{ nope');
    expect(result.ok).toBe(false);
  });

  it('fails when results is missing', () => {
    const result = validateClassificationJson(JSON.stringify({}));
    expect(result.ok).toBe(false);
  });

  it('fails when results is not an array', () => {
    const result = validateClassificationJson(JSON.stringify({ results: {} }));
    expect(result.ok).toBe(false);
  });

  it('fails when news_id is duplicated', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 70,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 1
          },
          {
            news_id: 101,
            is_happy_candidate: false,
            happy_score: 20,
            topics: [],
            emotions: [],
            story_types: [],
            risk_flags: ['重い話題'],
            negative_context_level: 4,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for unknown topic', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 80,
            topics: ['未知トピック'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for out-of-range happy_score', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 101,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for out-of-range negative_context_level', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 80,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 9,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for out-of-range commercial_pr_level', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 80,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 9
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for non-boolean is_happy_candidate', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: 'true',
            happy_score: 80,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('fails for unknown extra fields in result items', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 80,
            topics: ['動物'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 0,
            extra_field: 'nope'
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });

  it('treats SQL-looking strings as plain data and validates by schema only', () => {
    const result = validateClassificationJson(
      JSON.stringify({
        results: [
          {
            news_id: 101,
            is_happy_candidate: true,
            happy_score: 80,
            topics: ['DROP TABLE news_items;'],
            emotions: ['癒し'],
            story_types: ['救出'],
            risk_flags: [],
            negative_context_level: 1,
            commercial_pr_level: 0
          }
        ]
      })
    );

    expect(result.ok).toBe(false);
  });
});
