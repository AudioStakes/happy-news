import { REACTION_TAGS, type ReactionTag } from './reactionTags';

export type RatingValidationResult =
  | {
      ok: true;
      value: {
        newsId: number;
        happyRating: number;
        reactionTags: string[];
        openedAt: string | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

function parsePositiveInteger(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseOpenedAt(value: FormDataEntryValue | null): string | null | 'invalid' {
  if (value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return 'invalid';
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return 'invalid';
  }

  return parsed.toISOString();
}

export function validateRatingInput(input: {
  newsId: FormDataEntryValue | null;
  happyRating: FormDataEntryValue | null;
  reactionTags: FormDataEntryValue[];
  openedAt: FormDataEntryValue | null;
}): RatingValidationResult {
  const newsId = parsePositiveInteger(input.newsId);
  if (newsId === null) {
    return { ok: false, error: 'Invalid article id.' };
  }

  if (typeof input.happyRating !== 'string' || input.happyRating.trim().length === 0) {
    return { ok: false, error: 'Happy rating is required.' };
  }

  const parsedRating = Number(input.happyRating);
  if (!Number.isInteger(parsedRating)) {
    return { ok: false, error: 'Happy rating must be an integer from 1 to 5.' };
  }

  if (parsedRating < 1 || parsedRating > 5) {
    return { ok: false, error: 'Happy rating must be between 1 and 5.' };
  }

  const openedAt = parseOpenedAt(input.openedAt);
  if (openedAt === 'invalid') {
    return { ok: false, error: 'Invalid opened timestamp.' };
  }

  const reactionTags: ReactionTag[] = [];
  const seenTags = new Set<ReactionTag>();
  const allowedTags = new Set<string>(REACTION_TAGS);

  for (const rawTag of input.reactionTags) {
    if (typeof rawTag !== 'string') {
      return { ok: false, error: 'Invalid reaction tags.' };
    }

    if (!allowedTags.has(rawTag)) {
      return { ok: false, error: `Unknown reaction tag: ${rawTag}` };
    }

    const typedTag = rawTag as ReactionTag;

    if (seenTags.has(typedTag)) {
      return { ok: false, error: `Duplicate reaction tag: ${rawTag}` };
    }

    seenTags.add(typedTag);
    reactionTags.push(typedTag);
  }

  return {
    ok: true,
    value: {
      newsId,
      happyRating: parsedRating,
      reactionTags,
      openedAt
    }
  };
}
