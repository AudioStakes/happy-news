import { describe, expect, it } from 'vitest';

import { normalizeUrl } from '../normalizeUrl';

describe('normalizeUrl', () => {
  it('normalizes protocol and hostname with trimmed whitespace', () => {
    expect(normalizeUrl('  HTTPS://Example.COM/news?id=123  ')).toBe('https://example.com/news?id=123');
  });

  it('removes tracking query parameters', () => {
    expect(normalizeUrl('https://example.com/news?utm_source=rss&fbclid=abc&id=9')).toBe(
      'https://example.com/news?id=9'
    );
  });

  it('preserves meaningful query parameters', () => {
    expect(normalizeUrl('https://example.com/news?article=123&lang=ja&utm_medium=email')).toBe(
      'https://example.com/news?article=123&lang=ja'
    );
  });

  it('removes hash fragments', () => {
    expect(normalizeUrl('https://example.com/news?id=1#section-2')).toBe('https://example.com/news?id=1');
  });

  it('removes trailing slash for non-root paths', () => {
    expect(normalizeUrl('https://example.com/news/')).toBe('https://example.com/news');
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com/');
  });

  it('returns trimmed input when URL parsing fails', () => {
    expect(normalizeUrl('  not a valid url  ')).toBe('not a valid url');
  });
});
