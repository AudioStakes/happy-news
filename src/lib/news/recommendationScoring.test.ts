import { describe, expect, it } from 'vitest';

import { scoreCandidateForUser, type CandidateFeatureInput, type UserPreferenceInput } from './recommendationScoring';

function score(
  candidate: Partial<CandidateFeatureInput> = {},
  preferences: UserPreferenceInput[] = []
): number {
  return scoreCandidateForUser(
    {
      happyScore: 80,
      topics: [],
      emotions: [],
      storyTypes: [],
      riskFlags: [],
      ...candidate
    },
    preferences
  );
}

describe('scoreCandidateForUser', () => {
  it('scores candidate with matching high topic preference higher than unmatched topic', () => {
    const preferences: UserPreferenceInput[] = [{ targetType: 'topic', targetKey: 'science', score: 0.95 }];

    const matched = score({ topics: ['science'] }, preferences);
    const unmatched = score({ topics: ['sports'] }, preferences);

    expect(matched).toBeGreaterThan(unmatched);
  });

  it('increases score when matching high emotion preference exists', () => {
    const preferences: UserPreferenceInput[] = [{ targetType: 'emotion', targetKey: 'hope', score: 0.9 }];

    const matched = score({ emotions: ['hope'] }, preferences);
    const unmatched = score({ emotions: ['calm'] }, preferences);

    expect(matched).toBeGreaterThan(unmatched);
  });

  it('increases score when matching high story type preference exists', () => {
    const preferences: UserPreferenceInput[] = [{ targetType: 'story_type', targetKey: 'rescue', score: 0.88 }];

    const matched = score({ storyTypes: ['rescue'] }, preferences);
    const unmatched = score({ storyTypes: ['award'] }, preferences);

    expect(matched).toBeGreaterThan(unmatched);
  });

  it('lowers score when matching high risk-flag avoid score exists', () => {
    const preferences: UserPreferenceInput[] = [{ targetType: 'risk_flag', targetKey: 'disaster', score: 0.95 }];

    const risky = score({ riskFlags: ['disaster'] }, preferences);
    const safer = score({ riskFlags: ['none'] }, preferences);

    expect(risky).toBeLessThan(safer);
  });

  it('falls back to happy-score-driven ordering when no preferences exist', () => {
    const highHappy = score({ happyScore: 90 }, []);
    const lowHappy = score({ happyScore: 40 }, []);

    expect(highHappy).toBeGreaterThan(lowHappy);
  });

  it('uses a neutral default when happy score is missing', () => {
    const neutral = score({ happyScore: null }, []);
    const explicitNeutral = score({ happyScore: 50 }, []);

    expect(neutral).toBeCloseTo(explicitNeutral);
  });

  it('ignores unknown preferences that do not match candidate tags', () => {
    const preferences: UserPreferenceInput[] = [{ targetType: 'topic', targetKey: 'unknown-key', score: 1 }];

    const withoutMatch = score({ topics: ['science'] }, preferences);
    const noPreferences = score({ topics: ['science'] }, []);

    expect(withoutMatch).toBeCloseTo(noPreferences);
  });

  it('averages matched scores across multiple tags', () => {
    const preferences: UserPreferenceInput[] = [
      { targetType: 'topic', targetKey: 'science', score: 0.8 },
      { targetType: 'topic', targetKey: 'health', score: 0.6 }
    ];

    const mixed = score({ topics: ['science', 'health'] }, preferences);
    const lowerOnly = score({ topics: ['health'] }, preferences);

    expect(mixed).toBeGreaterThan(lowerOnly);
  });

  it('produces deterministic ordering signals for ties on weighted score', () => {
    const candidateA = score({ happyScore: 75, topics: ['science'] }, [
      { targetType: 'topic', targetKey: 'science', score: 0.8 }
    ]);
    const candidateB = score({ happyScore: 75, topics: ['science'] }, [
      { targetType: 'topic', targetKey: 'science', score: 0.8 }
    ]);

    expect(candidateA).toBe(candidateB);
  });

  it('clamps out-of-range preference scores before using them', () => {
    const overMax = score(
      { topics: ['science'] },
      [{ targetType: 'topic', targetKey: 'science', score: 99 }]
    );
    const clampedMax = score(
      { topics: ['science'] },
      [{ targetType: 'topic', targetKey: 'science', score: 1 }]
    );

    expect(overMax).toBeCloseTo(clampedMax);
  });
});
