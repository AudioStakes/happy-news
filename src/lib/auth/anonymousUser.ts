import { dev } from '$app/environment';
import type { RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';

import type { DbClient } from '$lib/db/client';
import { anonymousUsers } from '$lib/db/schema';

export const ANONYMOUS_USER_COOKIE_NAME = 'happy_news_user_id';
export const ANONYMOUS_USER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const MAX_PUBLIC_ID_LENGTH = 128;
const PUBLIC_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type AnonymousUser = {
  id: number;
  publicId: string;
};

export function generateAnonymousPublicId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `anon_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function isValidAnonymousPublicId(publicId: string): boolean {
  const value = publicId.trim();
  return value.length > 0 && value.length <= MAX_PUBLIC_ID_LENGTH && PUBLIC_ID_PATTERN.test(value);
}

export function buildAnonymousCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: ANONYMOUS_USER_COOKIE_MAX_AGE_SECONDS
  };
}

function shouldUseSecureCookie(): boolean {
  return !dev;
}

async function createAnonymousUser(db: DbClient, preferredPublicId?: string): Promise<AnonymousUser> {
  let publicId =
    preferredPublicId && isValidAnonymousPublicId(preferredPublicId)
      ? preferredPublicId
      : generateAnonymousPublicId();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const createdRows = await db
        .insert(anonymousUsers)
        .values({
          publicId,
          lastSeenAt: sql`CURRENT_TIMESTAMP`
        })
        .returning({
          id: anonymousUsers.id,
          publicId: anonymousUsers.publicId
        });

      if (createdRows[0]) {
        return createdRows[0];
      }
    } catch {
      publicId = generateAnonymousPublicId();
    }
  }

  throw new Error('Failed to create anonymous user.');
}

export async function getOrCreateAnonymousUser(event: RequestEvent, db: DbClient): Promise<AnonymousUser> {
  const secure = shouldUseSecureCookie();
  const rawCookieValue = event.cookies.get(ANONYMOUS_USER_COOKIE_NAME);
  const cookiePublicId = rawCookieValue && isValidAnonymousPublicId(rawCookieValue) ? rawCookieValue : null;

  if (cookiePublicId) {
    const existingRows = await db
      .select({
        id: anonymousUsers.id,
        publicId: anonymousUsers.publicId
      })
      .from(anonymousUsers)
      .where(eq(anonymousUsers.publicId, cookiePublicId))
      .limit(1);

    const existing = existingRows[0];
    if (existing) {
      await db
        .update(anonymousUsers)
        .set({ lastSeenAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(anonymousUsers.id, existing.id));

      event.cookies.set(ANONYMOUS_USER_COOKIE_NAME, existing.publicId, buildAnonymousCookieOptions(secure));
      return existing;
    }
  }

  const created = await createAnonymousUser(db, cookiePublicId ?? undefined);
  event.cookies.set(ANONYMOUS_USER_COOKIE_NAME, created.publicId, buildAnonymousCookieOptions(secure));
  return created;
}
