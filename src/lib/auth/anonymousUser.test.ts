import { describe, expect, it } from 'vitest';

import {
  ANONYMOUS_USER_COOKIE_MAX_AGE_SECONDS,
  ANONYMOUS_USER_COOKIE_NAME,
  buildAnonymousCookieOptions,
  generateAnonymousPublicId
} from './anonymousUser';

describe('anonymousUser helpers', () => {
  it('uses the expected cookie name and lifetime', () => {
    expect(ANONYMOUS_USER_COOKIE_NAME).toBe('happy_news_user_id');
    expect(ANONYMOUS_USER_COOKIE_MAX_AGE_SECONDS).toBe(31536000);
  });

  it('builds secure cookie options for production-like requests', () => {
    expect(buildAnonymousCookieOptions(true)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 31536000
    });
  });

  it('builds non-secure cookie options for local http requests', () => {
    expect(buildAnonymousCookieOptions(false)).toEqual({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 31536000
    });
  });

  it('generates a non-empty public id', () => {
    const id = generateAnonymousPublicId();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });
});
