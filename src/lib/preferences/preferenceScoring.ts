import type { UserPreferenceTargetType } from '$lib/constants/classification';

const BASELINE_SCORE = 0.5;

const CONTENT_DELTAS_BY_RATING: Record<number, number> = {
  1: -0.15,
  2: -0.08,
  3: 0.02,
  4: 0.08,
  5: 0.15
};

const RISK_FLAG_DELTAS_BY_RATING: Record<number, number> = {
  1: 0.15,
  2: 0.08,
  3: 0,
  4: -0.04,
  5: -0.08
};

export function clampScore(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

export function getTagDelta(targetType: UserPreferenceTargetType, rating: number): number {
  const deltas = targetType === 'risk_flag' ? RISK_FLAG_DELTAS_BY_RATING : CONTENT_DELTAS_BY_RATING;
  return deltas[rating] ?? 0;
}

export function applyRatingDelta(
  currentScore: number | null | undefined,
  targetType: UserPreferenceTargetType,
  rating: number
): number {
  const base = currentScore ?? BASELINE_SCORE;
  const delta = getTagDelta(targetType, rating);

  return clampScore(base + delta);
}

export function parseTagArrayJson(jsonText: string | null): string[] {
  if (typeof jsonText !== 'string' || jsonText.trim().length === 0) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(jsonText);

    if (!Array.isArray(parsed)) {
      return [];
    }

    const unique = new Set<string>();
    for (const value of parsed) {
      if (typeof value !== 'string') {
        continue;
      }

      const normalized = value.trim();
      if (normalized.length === 0) {
        continue;
      }

      unique.add(normalized);
    }

    return [...unique];
  } catch {
    return [];
  }
}

export function parseNewsFeatureTags(feature: {
  topicsJson: string | null;
  emotionsJson: string | null;
  storyTypesJson: string | null;
  riskFlagsJson: string | null;
}) {
  return {
    topics: parseTagArrayJson(feature.topicsJson),
    emotions: parseTagArrayJson(feature.emotionsJson),
    storyTypes: parseTagArrayJson(feature.storyTypesJson),
    riskFlags: parseTagArrayJson(feature.riskFlagsJson)
  };
}
