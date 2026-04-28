import { describe, expect, it } from 'vitest';

import {
  applyRatingDelta,
  clampScore,
  getTagDelta,
  parseNewsFeatureTags,
  parseTagArrayJson
} from './preferenceScoring';

describe('preferenceScoring', () => {
  it('clampScore keeps values between 0 and 1', () => {
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(0.4)).toBe(0.4);
    expect(clampScore(2)).toBe(1);
  });

  it('getTagDelta returns positive delta for topic rating 5', () => {
    expect(getTagDelta('topic', 5)).toBeGreaterThan(0);
  });

  it('getTagDelta returns negative delta for topic rating 1', () => {
    expect(getTagDelta('topic', 1)).toBeLessThan(0);
  });

  it('uses expected deltas for content and risk flags', () => {
    expect(getTagDelta('topic', 5)).toBe(0.15);
    expect(getTagDelta('topic', 2)).toBe(-0.08);
    expect(getTagDelta('risk_flag', 5)).toBe(-0.08);
    expect(getTagDelta('risk_flag', 2)).toBe(0.08);
  });

  it('getTagDelta increases risk_flag score for low ratings', () => {
    expect(getTagDelta('risk_flag', 1)).toBeGreaterThan(0);
  });

  it('getTagDelta decreases risk_flag score for high ratings', () => {
    expect(getTagDelta('risk_flag', 5)).toBeLessThan(0);
  });

  it('high rating increases topic score', () => {
    expect(applyRatingDelta(0.5, 'topic', 5)).toBeGreaterThan(0.5);
  });

  it('low rating decreases topic score', () => {
    expect(applyRatingDelta(0.5, 'topic', 1)).toBeLessThan(0.5);
  });

  it('low rating increases risk_flag score', () => {
    expect(applyRatingDelta(0.5, 'risk_flag', 1)).toBeGreaterThan(0.5);
  });

  it('high rating decreases risk_flag score', () => {
    expect(applyRatingDelta(0.5, 'risk_flag', 5)).toBeLessThan(0.5);
  });

  it('scores never go below 0', () => {
    expect(applyRatingDelta(0.01, 'topic', 1)).toBe(0);
  });

  it('scores never go above 1', () => {
    expect(applyRatingDelta(0.95, 'risk_flag', 1)).toBe(1);
  });

  it('starts from neutral baseline for missing score rows', () => {
    expect(applyRatingDelta(undefined, 'topic', 4)).toBe(0.58);
  });

  it('invalid JSON tag arrays become empty', () => {
    expect(parseTagArrayJson('not-json')).toEqual([]);
    expect(parseTagArrayJson('{"a":1}')).toEqual([]);
  });

  it('duplicate tags are deduplicated and non-strings are ignored', () => {
    expect(parseTagArrayJson('["地域社会", "地域社会", 123, null, "科学技術"]')).toEqual([
      '地域社会',
      '科学技術'
    ]);
  });

  it('parses all feature tag arrays safely', () => {
    expect(
      parseNewsFeatureTags({
        topicsJson: '["地域社会", "地域社会"]',
        emotionsJson: '[]',
        storyTypesJson: 'invalid',
        riskFlagsJson: '["災害", false]'
      })
    ).toEqual({
      topics: ['地域社会'],
      emotions: [],
      storyTypes: [],
      riskFlags: ['災害']
    });
  });
});
