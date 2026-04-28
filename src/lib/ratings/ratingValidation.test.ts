import { describe, expect, it } from 'vitest';

import { validateRatingInput } from './ratingValidation';

describe('validateRatingInput', () => {
  it('passes for valid input', () => {
    expect(
      validateRatingInput({
        newsId: '12',
        happyRating: '5',
        reactionTags: ['癒された', '感動した']
      })
    ).toEqual({
      ok: true,
      value: {
        newsId: 12,
        happyRating: 5,
        reactionTags: ['癒された', '感動した']
      }
    });
  });

  it('fails when news_id is missing', () => {
    expect(
      validateRatingInput({
        newsId: null,
        happyRating: '3',
        reactionTags: []
      })
    ).toEqual({ ok: false, error: 'Invalid article id.' });
  });

  it('fails when news_id is invalid', () => {
    expect(
      validateRatingInput({
        newsId: 'abc',
        happyRating: '3',
        reactionTags: []
      })
    ).toEqual({ ok: false, error: 'Invalid article id.' });
  });

  it('fails when happy_rating is below 1', () => {
    expect(
      validateRatingInput({
        newsId: '2',
        happyRating: '0',
        reactionTags: []
      })
    ).toEqual({ ok: false, error: 'Happy rating must be between 1 and 5.' });
  });

  it('fails when happy_rating is above 5', () => {
    expect(
      validateRatingInput({
        newsId: '2',
        happyRating: '6',
        reactionTags: []
      })
    ).toEqual({ ok: false, error: 'Happy rating must be between 1 and 5.' });
  });

  it('fails when happy_rating is non-integer', () => {
    expect(
      validateRatingInput({
        newsId: '2',
        happyRating: '2.5',
        reactionTags: []
      })
    ).toEqual({ ok: false, error: 'Happy rating must be an integer from 1 to 5.' });
  });

  it('fails when reaction tag is unknown', () => {
    expect(
      validateRatingInput({
        newsId: '2',
        happyRating: '4',
        reactionTags: ['not-a-tag']
      })
    ).toEqual({ ok: false, error: 'Unknown reaction tag: not-a-tag' });
  });

  it('fails when reaction tags include duplicates', () => {
    expect(
      validateRatingInput({
        newsId: '2',
        happyRating: '4',
        reactionTags: ['癒された', '癒された']
      })
    ).toEqual({ ok: false, error: 'Duplicate reaction tag: 癒された' });
  });
});
