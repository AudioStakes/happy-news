import { describe, expect, it } from 'vitest';

import {
  ANONYMOUS_USER_COOKIE_MAX_AGE_SECONDS,
  ANONYMOUS_USER_COOKIE_NAME,
  buildAnonymousCookieOptions,
  generateAnonymousPublicId,
  isValidAnonymousPublicId
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

  it('validates public id format and length', () => {
    expect(isValidAnonymousPublicId('bcf9aefa-9454-4e17-b8cb-9b8375a4a6f7')).toBe(true);
    expect(isValidAnonymousPublicId('anon_1710000000_abcd1234')).toBe(true);
    expect(isValidAnonymousPublicId('not valid with spaces')).toBe(false);
    expect(isValidAnonymousPublicId('')).toBe(false);
    expect(isValidAnonymousPublicId('a'.repeat(129))).toBe(false);
  });

  it('generates a non-empty public id', () => {
    const id = generateAnonymousPublicId();

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });
});
