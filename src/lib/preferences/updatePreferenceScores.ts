import { eq, sql } from 'drizzle-orm';

import type { UserPreferenceTargetType } from '$lib/constants/classification';
import type { DbClient } from '$lib/db/client';
import { newsFeatures, userPreferenceScores } from '$lib/db/schema';

import { BASELINE_SCORE, clampScore, getTagDelta, parseNewsFeatureTags } from './preferenceScoring';

export type UpdatePreferenceScoresInput = {
  db: DbClient;
  userId: number;
  newsId: number;
  happyRating: number;
};

export async function updatePreferenceScores(input: UpdatePreferenceScoresInput): Promise<void> {
  const [featureRow] = await input.db
    .select({
      topicsJson: newsFeatures.topicsJson,
      emotionsJson: newsFeatures.emotionsJson,
      storyTypesJson: newsFeatures.storyTypesJson,
      riskFlagsJson: newsFeatures.riskFlagsJson
    })
    .from(newsFeatures)
    .where(eq(newsFeatures.newsId, input.newsId))
    .limit(1);

  if (!featureRow) {
    return;
  }

  const parsedTags = parseNewsFeatureTags(featureRow);

  const deltas: Record<UserPreferenceTargetType, number> = {
    topic: getTagDelta('topic', input.happyRating),
    emotion: getTagDelta('emotion', input.happyRating),
    story_type: getTagDelta('story_type', input.happyRating),
    risk_flag: getTagDelta('risk_flag', input.happyRating)
  };

  const tagGroups: Array<{ targetType: UserPreferenceTargetType; targetKeys: string[] }> = [
    { targetType: 'topic', targetKeys: parsedTags.topics },
    { targetType: 'emotion', targetKeys: parsedTags.emotions },
    { targetType: 'story_type', targetKeys: parsedTags.storyTypes },
    { targetType: 'risk_flag', targetKeys: parsedTags.riskFlags }
  ];

  const insertRows = tagGroups.flatMap(({ targetType, targetKeys }) => {
    const initialScore = clampScore(BASELINE_SCORE + deltas[targetType]);
    return targetKeys.map((targetKey) => ({
      userId: input.userId,
      targetType,
      targetKey,
      score: initialScore,
      updatedAt: sql`CURRENT_TIMESTAMP`
    }));
  });

  if (insertRows.length === 0) {
    return;
  }

  await input.db
    .insert(userPreferenceScores)
    .values(insertRows)
    .onConflictDoUpdate({
      target: [userPreferenceScores.userId, userPreferenceScores.targetType, userPreferenceScores.targetKey],
      set: {
        score: sql`min(1, max(0, ${userPreferenceScores.score} + case
          when ${userPreferenceScores.targetType} = 'topic' then ${deltas.topic}
          when ${userPreferenceScores.targetType} = 'emotion' then ${deltas.emotion}
          when ${userPreferenceScores.targetType} = 'story_type' then ${deltas.story_type}
          when ${userPreferenceScores.targetType} = 'risk_flag' then ${deltas.risk_flag}
          else 0
        end))`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      }
    });
}
