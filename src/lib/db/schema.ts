import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  CLASSIFIED_BY_VALUES,
  IMPORT_BATCH_STATUSES,
  NEWS_STATUSES,
  USER_PREFERENCE_TARGET_TYPES
} from '$lib/constants/classification';

const newsStatusSql = NEWS_STATUSES.map((value) => `'${value}'`).join(', ');
const classifiedBySql = CLASSIFIED_BY_VALUES.map((value) => `'${value}'`).join(', ');
const importBatchStatusSql = IMPORT_BATCH_STATUSES.map((value) => `'${value}'`).join(', ');
const userPreferenceTargetTypeSql = USER_PREFERENCE_TARGET_TYPES.map((value) => `'${value}'`).join(', ');

export const rssFeeds = sqliteTable(
  'rss_feeds',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    sourceName: text('source_name').notNull(),
    language: text('language').notNull().default('ja'),
    country: text('country').notNull().default('JP'),
    defaultCategory: text('default_category'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastFetchedAt: text('last_fetched_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    urlUnique: uniqueIndex('rss_feeds_url_unique').on(table.url),
    isActiveIdx: index('rss_feeds_is_active_idx').on(table.isActive)
  })
);

export const newsItems = sqliteTable(
  'news_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    url: text('url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    sourceName: text('source_name').notNull(),
    rssFeedId: integer('rss_feed_id')
      .notNull()
      .references(() => rssFeeds.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    publishedAt: text('published_at'),
    description: text('description'),
    language: text('language').notNull().default('ja'),
    country: text('country').notNull().default('JP'),
    status: text('status').notNull().default('unclassified'),
    fetchedAt: text('fetched_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    normalizedUrlUnique: uniqueIndex('news_items_normalized_url_unique').on(table.normalizedUrl),
    statusIdx: index('news_items_status_idx').on(table.status),
    publishedAtIdx: index('news_items_published_at_idx').on(table.publishedAt),
    rssFeedIdIdx: index('news_items_rss_feed_id_idx').on(table.rssFeedId),
    statusCheck: check('news_items_status_check', sql`${table.status} in (${sql.raw(newsStatusSql)})`)
  })
);

export const newsFeatures = sqliteTable(
  'news_features',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    newsId: integer('news_id')
      .notNull()
      .references(() => newsItems.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    isHappyCandidate: integer('is_happy_candidate', { mode: 'boolean' }).notNull().default(false),
    happyScore: integer('happy_score'),
    topicsJson: text('topics_json'),
    emotionsJson: text('emotions_json'),
    storyTypesJson: text('story_types_json'),
    riskFlagsJson: text('risk_flags_json'),
    negativeContextLevel: integer('negative_context_level'),
    commercialPrLevel: integer('commercial_pr_level'),
    classifiedBy: text('classified_by'),
    classifiedAt: text('classified_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    newsIdUnique: uniqueIndex('news_features_news_id_unique').on(table.newsId),
    isHappyCandidateIdx: index('news_features_is_happy_candidate_idx').on(table.isHappyCandidate),
    happyScoreCheck: check(
      'news_features_happy_score_check',
      sql`${table.happyScore} is null or (${table.happyScore} >= 0 and ${table.happyScore} <= 100)`
    ),
    negativeContextLevelCheck: check(
      'news_features_negative_context_level_check',
      sql`${table.negativeContextLevel} is null or (${table.negativeContextLevel} >= 0 and ${table.negativeContextLevel} <= 5)`
    ),
    commercialPrLevelCheck: check(
      'news_features_commercial_pr_level_check',
      sql`${table.commercialPrLevel} is null or (${table.commercialPrLevel} >= 0 and ${table.commercialPrLevel} <= 5)`
    ),
    classifiedByCheck: check(
      'news_features_classified_by_check',
      sql`${table.classifiedBy} is null or ${table.classifiedBy} in (${sql.raw(classifiedBySql)})`
    )
  })
);

export const anonymousUsers = sqliteTable(
  'anonymous_users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    publicId: text('public_id').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    lastSeenAt: text('last_seen_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    publicIdUnique: uniqueIndex('anonymous_users_public_id_unique').on(table.publicId)
  })
);

export const userOnboardingPreferences = sqliteTable('user_onboarding_preferences', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id')
    .notNull()
    .references(() => anonymousUsers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
  selectedTopicsJson: text('selected_topics_json').notNull(),
  selectedEmotionsJson: text('selected_emotions_json').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
});

export const userRatings = sqliteTable(
  'user_ratings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => anonymousUsers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    newsId: integer('news_id')
      .notNull()
      .references(() => newsItems.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    happyRating: integer('happy_rating').notNull(),
    reactionTagsJson: text('reaction_tags_json'),
    openedAt: text('opened_at'),
    ratedAt: text('rated_at'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdIdx: index('user_ratings_user_id_idx').on(table.userId),
    newsIdIdx: index('user_ratings_news_id_idx').on(table.newsId),
    userIdNewsIdUnique: uniqueIndex('user_ratings_user_id_news_id_unique').on(table.userId, table.newsId),
    happyRatingCheck: check(
      'user_ratings_happy_rating_check',
      sql`${table.happyRating} >= 1 and ${table.happyRating} <= 5`
    )
  })
);

export const userPreferenceScores = sqliteTable(
  'user_preference_scores',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => anonymousUsers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetKey: text('target_key').notNull(),
    score: real('score').notNull().default(0),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`)
  },
  (table) => ({
    userIdIdx: index('user_preference_scores_user_id_idx').on(table.userId),
    userTargetUnique: uniqueIndex('user_preference_scores_user_target_unique').on(
      table.userId,
      table.targetType,
      table.targetKey
    ),
    targetTypeCheck: check(
      'user_preference_scores_target_type_check',
      sql`${table.targetType} in (${sql.raw(userPreferenceTargetTypeSql)})`
    ),
    scoreCheck: check('user_preference_scores_score_check', sql`${table.score} >= 0 and ${table.score} <= 1`)
  })
);

export const adminImportBatches = sqliteTable(
  'admin_import_batches',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    status: text('status').notNull().default('pending'),
    inputNewsIdsJson: text('input_news_ids_json').notNull(),
    rawJson: text('raw_json').notNull(),
    validationErrorsJson: text('validation_errors_json'),
    importedCount: integer('imported_count').notNull().default(0),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    importedAt: text('imported_at')
  },
  (table) => ({
    statusIdx: index('admin_import_batches_status_idx').on(table.status),
    createdAtIdx: index('admin_import_batches_created_at_idx').on(table.createdAt),
    statusCheck: check(
      'admin_import_batches_status_check',
      sql`${table.status} in (${sql.raw(importBatchStatusSql)})`
    )
  })
);
