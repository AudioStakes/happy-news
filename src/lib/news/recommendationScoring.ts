import type { UserPreferenceTargetType } from '$lib/constants/classification';

const NEUTRAL_HAPPY_SCORE = 50;
const DEFAULT_CONTENT_PREFERENCE = 0.5;
const DEFAULT_RISK_AVOID = 0;

const HAPPY_WEIGHT = 0.4;
const TOPIC_WEIGHT = 0.25;
const EMOTION_WEIGHT = 0.2;
const STORY_TYPE_WEIGHT = 0.15;
const RISK_PENALTY_WEIGHT = 0.3;
const MIN_SCORE = 0;
const MAX_SCORE = 1;

export type CandidateFeatureInput = {
  happyScore: number | null;
  topics: string[];
  emotions: string[];
  storyTypes: string[];
  riskFlags: string[];
};

export type UserPreferenceInput = {
  targetType: UserPreferenceTargetType;
  targetKey: string;
  score: number;
};

function averageOrDefault(values: number[], defaultValue: number): number {
  if (values.length === 0) {
    return defaultValue;
  }

  const sum = values.reduce((acc, value) => acc + value, 0);
  return sum / values.length;
}

function clampUnitScore(value: number): number {
  if (value <= MIN_SCORE) {
    return MIN_SCORE;
  }

  if (value >= MAX_SCORE) {
    return MAX_SCORE;
  }

  return value;
}

function buildPreferenceLookup(preferences: UserPreferenceInput[]): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const preference of preferences) {
    lookup.set(`${preference.targetType}:${preference.targetKey}`, clampUnitScore(preference.score));
  }

  return lookup;
}

function getAveragePreferenceScore(
  lookup: Map<string, number>,
  targetType: UserPreferenceTargetType,
  tags: string[],
  defaultValue: number
): number {
  const matchedScores: number[] = [];

  for (const tag of tags) {
    const score = lookup.get(`${targetType}:${tag}`);
    if (typeof score !== 'number') {
      continue;
    }

    matchedScores.push(score);
  }

  return averageOrDefault(matchedScores, defaultValue);
}

export function scoreCandidateForUser(
  candidate: CandidateFeatureInput,
  preferences: UserPreferenceInput[]
): number {
  const base = clampUnitScore((candidate.happyScore ?? NEUTRAL_HAPPY_SCORE) / 100);
  const lookup = buildPreferenceLookup(preferences);

  const topicScore = getAveragePreferenceScore(
    lookup,
    'topic',
    candidate.topics,
    DEFAULT_CONTENT_PREFERENCE
  );
  const emotionScore = getAveragePreferenceScore(
    lookup,
    'emotion',
    candidate.emotions,
    DEFAULT_CONTENT_PREFERENCE
  );
  const storyTypeScore = getAveragePreferenceScore(
    lookup,
    'story_type',
    candidate.storyTypes,
    DEFAULT_CONTENT_PREFERENCE
  );
  const riskPenalty = getAveragePreferenceScore(
    lookup,
    'risk_flag',
    candidate.riskFlags,
    DEFAULT_RISK_AVOID
  );

  const weightedContentScore =
    base * HAPPY_WEIGHT +
    topicScore * TOPIC_WEIGHT +
    emotionScore * EMOTION_WEIGHT +
    storyTypeScore * STORY_TYPE_WEIGHT;

  return weightedContentScore - riskPenalty * RISK_PENALTY_WEIGHT;
}
