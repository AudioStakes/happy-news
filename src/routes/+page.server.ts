import { and, eq, sql } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

import { getOrCreateAnonymousUser } from '$lib/auth/anonymousUser';
import { createDb } from '$lib/db/client';
import { newsFeatures, newsItems, userRatings } from '$lib/db/schema';
import { getHomeNews } from '$lib/news/getHomeNews';
import { validateRatingInput } from '$lib/ratings/ratingValidation';

const HOME_DB_MISSING_MESSAGE = 'Happy news is unavailable right now. Please try again later.';

const HOME_USER_ERROR_MESSAGE =
  'Unable to initialize anonymous user for this visit. Please refresh and try again.';

const HOME_LOAD_ERROR_MESSAGE = 'Unable to load happy news right now. Please try again in a moment.';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  const database = event.platform?.env?.DB;
  if (!database) {
    console.error('Cloudflare D1 binding is missing. Add DB to event.platform.env.DB.');
    return {
      dbError: HOME_DB_MISSING_MESSAGE,
      userError: null,
      items: []
    };
  }

  const db = createDb(database);

  let anonymousUser;
  try {
    anonymousUser = await getOrCreateAnonymousUser(event, db);
  } catch {
    return {
      dbError: null,
      userError: HOME_USER_ERROR_MESSAGE,
      items: []
    };
  }

  try {
    const items = await getHomeNews(db, anonymousUser.id);

    return {
      dbError: null,
      userError: null,
      items
    };
  } catch {
    return {
      dbError: HOME_LOAD_ERROR_MESSAGE,
      userError: null,
      items: []
    };
  }
};

function isDuplicateRatingError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('unique') && message.includes('user_ratings.user_id') && message.includes('news_id');
}

export const actions: Actions = {
  submitRating: async (event) => {
    const database = event.platform?.env?.DB;
    if (!database) {
      return fail(500, {
        success: false,
        message: HOME_DB_MISSING_MESSAGE
      });
    }

    const db = createDb(database);

    let anonymousUser;
    try {
      anonymousUser = await getOrCreateAnonymousUser(event, db);
    } catch {
      return fail(500, {
        success: false,
        message: HOME_USER_ERROR_MESSAGE
      });
    }

    const formData = await event.request.formData();
    const validated = validateRatingInput({
      newsId: formData.get('news_id'),
      happyRating: formData.get('happy_rating'),
      reactionTags: formData.getAll('reaction_tags'),
      // Do not trust the client-controlled hidden field for opened/read state.
      // Treat submission time as the only server-observed signal available here.
      openedFlag: 'true'
    });

    if (!validated.ok) {
      return fail(400, {
        success: false,
        message: validated.error
      });
    }

    const [news] = await db
      .select({ id: newsItems.id })
      .from(newsItems)
      .innerJoin(newsFeatures, eq(newsFeatures.newsId, newsItems.id))
      .where(
        and(
          eq(newsItems.id, validated.value.newsId),
          eq(newsItems.status, 'candidate'),
          eq(newsFeatures.isHappyCandidate, true)
        )
      )
      .limit(1);

    if (!news) {
      return fail(404, {
        success: false,
        message: 'This article is not available for rating.'
      });
    }

    const [existingRating] = await db
      .select({ id: userRatings.id })
      .from(userRatings)
      .where(and(eq(userRatings.userId, anonymousUser.id), eq(userRatings.newsId, validated.value.newsId)))
      .limit(1);

    if (existingRating) {
      return fail(409, {
        success: false,
        message: 'You already rated this article.'
      });
    }

    try {
      await db.insert(userRatings).values({
        userId: anonymousUser.id,
        newsId: validated.value.newsId,
        happyRating: validated.value.happyRating,
        reactionTagsJson:
          validated.value.reactionTags.length > 0 ? JSON.stringify(validated.value.reactionTags) : null,
        openedAt: validated.value.opened ? sql`CURRENT_TIMESTAMP` : null,
        ratedAt: sql`CURRENT_TIMESTAMP`
      });
    } catch (error) {
      if (isDuplicateRatingError(error)) {
        return fail(409, {
          success: false,
          message: 'You already rated this article.'
        });
      }

      return fail(500, {
        success: false,
        message: 'Unable to save your rating right now. Please try again.'
      });
    }

    return {
      success: true,
      message: 'Thanks! Your rating was saved.'
    };
  }
};
