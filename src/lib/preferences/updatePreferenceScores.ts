import { eq, sql } from 'drizzle-orm';

import type { UserPreferenceTargetType } from '$lib/constants/classification';
import type { DbClient } from '$lib/db/client';
import { newsFeatures, userPreferenceScores } from '$lib/db/schema';

import { clampScore, getTagDelta, parseNewsFeatureTags } from './preferenceScoring';

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

  await updateTagsForType(input, 'topic', parsedTags.topics);
  await updateTagsForType(input, 'emotion', parsedTags.emotions);
  await updateTagsForType(input, 'story_type', parsedTags.storyTypes);
  await updateTagsForType(input, 'risk_flag', parsedTags.riskFlags);
}

async function updateTagsForType(
  input: UpdatePreferenceScoresInput,
  targetType: UserPreferenceTargetType,
  targetKeys: string[]
): Promise<void> {
  if (targetKeys.length === 0) {
    return;
  }

  const delta = getTagDelta(targetType, input.happyRating);
  const initialScore = clampScore(0.5 + delta);
  const insertRows = targetKeys.map((targetKey) => ({
    userId: input.userId,
    targetType,
    targetKey,
    score: initialScore,
    updatedAt: sql`CURRENT_TIMESTAMP`
  }));

  await input.db
    .insert(userPreferenceScores)
    .values(insertRows)
    .onConflictDoUpdate({
      target: [userPreferenceScores.userId, userPreferenceScores.targetType, userPreferenceScores.targetKey],
      set: {
        score: sql`min(1, max(0, ${userPreferenceScores.score} + ${delta}))`,
        updatedAt: sql`CURRENT_TIMESTAMP`
      }
    });
}
