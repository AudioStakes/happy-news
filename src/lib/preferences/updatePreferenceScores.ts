import { and, eq, sql } from 'drizzle-orm';

import type { UserPreferenceTargetType } from '$lib/constants/classification';
import type { DbClient } from '$lib/db/client';
import { newsFeatures, userPreferenceScores } from '$lib/db/schema';

import { applyRatingDelta, parseNewsFeatureTags } from './preferenceScoring';

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
  for (const targetKey of targetKeys) {
    const [existing] = await input.db
      .select({
        id: userPreferenceScores.id,
        score: userPreferenceScores.score
      })
      .from(userPreferenceScores)
      .where(
        and(
          eq(userPreferenceScores.userId, input.userId),
          eq(userPreferenceScores.targetType, targetType),
          eq(userPreferenceScores.targetKey, targetKey)
        )
      )
      .limit(1);

    const nextScore = applyRatingDelta(existing?.score, targetType, input.happyRating);

    if (existing) {
      await input.db
        .update(userPreferenceScores)
        .set({
          score: nextScore,
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(userPreferenceScores.id, existing.id));

      continue;
    }

    await input.db.insert(userPreferenceScores).values({
      userId: input.userId,
      targetType,
      targetKey,
      score: nextScore,
      updatedAt: sql`CURRENT_TIMESTAMP`
    });
  }
}
