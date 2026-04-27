import type { PageServerLoad } from './$types';

import { getOrCreateAnonymousUser } from '$lib/auth/anonymousUser';
import { createDb } from '$lib/db/client';
import { getHomeNews } from '$lib/news/getHomeNews';

const HOME_DB_MISSING_MESSAGE =
  'Cloudflare D1 binding is missing. Add DB to event.platform.env.DB before using /.';

const HOME_USER_ERROR_MESSAGE =
  'Unable to initialize anonymous user for this visit. Please refresh and try again.';

const HOME_LOAD_ERROR_MESSAGE = 'Unable to load happy news right now. Please try again in a moment.';

export const prerender = false;

export const load: PageServerLoad = async (event) => {
  const database = event.platform?.env?.DB;
  if (!database) {
    return {
      dbError: HOME_DB_MISSING_MESSAGE,
      userError: null,
      userPublicId: null,
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
      userPublicId: null,
      items: []
    };
  }

  try {
    const items = await getHomeNews(db, anonymousUser.id);

    return {
      dbError: null,
      userError: null,
      userPublicId: anonymousUser.publicId,
      items
    };
  } catch {
    return {
      dbError: HOME_LOAD_ERROR_MESSAGE,
      userError: null,
      userPublicId: anonymousUser.publicId,
      items: []
    };
  }
};
