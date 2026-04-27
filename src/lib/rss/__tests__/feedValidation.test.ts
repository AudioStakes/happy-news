import { describe, expect, it } from 'vitest';

import { validateFeedInput } from '../feedValidation';

describe('validateFeedInput', () => {
  it('accepts required fields and applies defaults', () => {
    const result = validateFeedInput({
      name: '  NHK Feed  ',
      url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
      sourceName: '  NHK  '
    });

    expect(result).toEqual({
      ok: true,
      value: {
        name: 'NHK Feed',
        url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',
        sourceName: 'NHK',
        language: 'ja',
        country: 'JP',
        defaultCategory: null
      }
    });
  });

  it('rejects invalid protocols', () => {
    const result = validateFeedInput({
      name: 'Feed',
      url: 'ftp://example.com/rss.xml',
      sourceName: 'Example'
    });

    expect(result).toEqual({
      ok: false,
      error: 'Feed URL must start with http:// or https://.'
    });
  });

  it('rejects missing required values', () => {
    const result = validateFeedInput({
      name: ' ',
      url: 'https://example.com/rss.xml',
      sourceName: 'Example'
    });

    expect(result).toEqual({
      ok: false,
      error: 'Feed name is required.'
    });
  });
});
