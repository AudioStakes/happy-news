import {
  ALLOWED_EMOTIONS,
  ALLOWED_RISK_FLAGS,
  ALLOWED_STORY_TYPES,
  ALLOWED_TOPICS
} from '$lib/constants/classification';
import { MAX_CLASSIFICATION_SELECTION } from './buildPrompt';

const RESULT_KEYS = [
  'news_id',
  'is_happy_candidate',
  'happy_score',
  'topics',
  'emotions',
  'story_types',
  'risk_flags',
  'negative_context_level',
  'commercial_pr_level'
] as const;

type ResultKey = (typeof RESULT_KEYS)[number];

type RawClassificationResult = Record<ResultKey, unknown>;

export type ValidClassificationResult = {
  newsId: number;
  isHappyCandidate: boolean;
  happyScore: number;
  topics: string[];
  emotions: string[];
  storyTypes: string[];
  riskFlags: string[];
  negativeContextLevel: number;
  commercialPrLevel: number;
};

export type ClassificationValidationResult =
  | {
      ok: true;
      results: ValidClassificationResult[];
      inputNewsIds: number[];
      warnings: string[];
    }
  | {
      ok: false;
      errors: string[];
      warnings: string[];
    };

type ValidateOptions = {
  allowedNewsIds?: Set<number>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

function hasDuplicates(values: string[]): boolean {
  return new Set(values).size !== values.length;
}

function validateAllowedStringArray(
  value: unknown,
  fieldName: string,
  allowed: readonly string[],
  errors: string[]
): string[] | null {
  if (!Array.isArray(value)) {
    errors.push(`${fieldName} must be an array.`);
    return null;
  }

  if (!value.every((entry) => typeof entry === 'string')) {
    errors.push(`${fieldName} must contain strings only.`);
    return null;
  }

  const list = [...value];
  if (hasDuplicates(list)) {
    errors.push(`${fieldName} must not contain duplicate values.`);
  }

  const unknownValues = list.filter((entry) => !allowed.includes(entry));
  if (unknownValues.length > 0) {
    errors.push(`${fieldName} contains unknown values: ${unknownValues.join(', ')}`);
  }

  return list;
}

function validateResultShape(row: Record<string, unknown>, rowNumber: number, errors: string[]): row is RawClassificationResult {
  const keys = Object.keys(row);
  const unknownKeys = keys.filter((key) => !RESULT_KEYS.includes(key as ResultKey));
  if (unknownKeys.length > 0) {
    errors.push(`results[${rowNumber}] contains unknown fields: ${unknownKeys.join(', ')}`);
  }

  const missingKeys = RESULT_KEYS.filter((key) => !(key in row));
  if (missingKeys.length > 0) {
    errors.push(`results[${rowNumber}] is missing fields: ${missingKeys.join(', ')}`);
  }

  return unknownKeys.length === 0 && missingKeys.length === 0;
}

export function validateClassificationJson(
  rawJson: string,
  options?: ValidateOptions
): ClassificationValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return {
      ok: false,
      errors: ['Input must be valid JSON.'],
      warnings
    };
  }

  if (!isPlainObject(parsed)) {
    return {
      ok: false,
      errors: ['Top-level JSON value must be an object.'],
      warnings
    };
  }

  const topLevelKeys = Object.keys(parsed);
  const extraTopLevelKeys = topLevelKeys.filter((key) => key !== 'results');
  if (extraTopLevelKeys.length > 0) {
    errors.push(`Top-level contains unknown fields: ${extraTopLevelKeys.join(', ')}`);
  }

  if (!('results' in parsed)) {
    errors.push('Top-level object must contain results.');
  }

  if (!Array.isArray(parsed.results)) {
    errors.push('results must be an array.');
  }

  if (errors.length > 0 || !Array.isArray(parsed.results)) {
    return {
      ok: false,
      errors,
      warnings
    };
  }

  if (parsed.results.length === 0) {
    return {
      ok: false,
      errors: ['results must not be empty.'],
      warnings
    };
  }

  if (parsed.results.length > MAX_CLASSIFICATION_SELECTION) {
    return {
      ok: false,
      errors: [`results length must be ${MAX_CLASSIFICATION_SELECTION} or less.`],
      warnings
    };
  }

  const seenNewsIds = new Set<number>();
  const validResults: ValidClassificationResult[] = [];

  for (const [index, rawRow] of parsed.results.entries()) {
    const rowNumber = index + 1;
    const rowErrorsStart = errors.length;

    if (!isPlainObject(rawRow)) {
      errors.push(`results[${rowNumber}] must be an object.`);
      continue;
    }

    if (!validateResultShape(rawRow, rowNumber, errors)) {
      continue;
    }

    const newsId = asInteger(rawRow.news_id);
    if (newsId === null || newsId <= 0) {
      errors.push(`results[${rowNumber}].news_id must be a positive integer.`);
    } else if (seenNewsIds.has(newsId)) {
      errors.push(`results[${rowNumber}].news_id is duplicated (${newsId}).`);
    } else if (options?.allowedNewsIds && !options.allowedNewsIds.has(newsId)) {
      errors.push(`results[${rowNumber}].news_id is not allowed for this import (${newsId}).`);
    } else {
      seenNewsIds.add(newsId);
    }

    if (typeof rawRow.is_happy_candidate !== 'boolean') {
      errors.push(`results[${rowNumber}].is_happy_candidate must be boolean.`);
    }

    const happyScore = asInteger(rawRow.happy_score);
    if (happyScore === null || happyScore < 0 || happyScore > 100) {
      errors.push(`results[${rowNumber}].happy_score must be an integer between 0 and 100.`);
    }

    const topics = validateAllowedStringArray(rawRow.topics, `results[${rowNumber}].topics`, ALLOWED_TOPICS, errors);
    const emotions = validateAllowedStringArray(
      rawRow.emotions,
      `results[${rowNumber}].emotions`,
      ALLOWED_EMOTIONS,
      errors
    );
    const storyTypes = validateAllowedStringArray(
      rawRow.story_types,
      `results[${rowNumber}].story_types`,
      ALLOWED_STORY_TYPES,
      errors
    );
    const riskFlags = validateAllowedStringArray(
      rawRow.risk_flags,
      `results[${rowNumber}].risk_flags`,
      ALLOWED_RISK_FLAGS,
      errors
    );

    const negativeContextLevel = asInteger(rawRow.negative_context_level);
    if (negativeContextLevel === null || negativeContextLevel < 0 || negativeContextLevel > 5) {
      errors.push(`results[${rowNumber}].negative_context_level must be an integer between 0 and 5.`);
    }

    const commercialPrLevel = asInteger(rawRow.commercial_pr_level);
    if (commercialPrLevel === null || commercialPrLevel < 0 || commercialPrLevel > 5) {
      errors.push(`results[${rowNumber}].commercial_pr_level must be an integer between 0 and 5.`);
    }

    if (errors.length > rowErrorsStart) {
      continue;
    }

    const isHappyCandidate = rawRow.is_happy_candidate;
    if (
      newsId === null ||
      happyScore === null ||
      negativeContextLevel === null ||
      commercialPrLevel === null ||
      topics === null ||
      emotions === null ||
      storyTypes === null ||
      riskFlags === null ||
      typeof isHappyCandidate !== 'boolean'
    ) {
      continue;
    }

    if (isHappyCandidate && topics.length === 0) {
      warnings.push(`results[${rowNumber}].topics is empty. Confirm this item is truly unclear.`);
    }

    validResults.push({
      newsId,
      isHappyCandidate,
      happyScore,
      topics,
      emotions,
      storyTypes,
      riskFlags,
      negativeContextLevel,
      commercialPrLevel
    });
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      warnings
    };
  }

  return {
    ok: true,
    results: validResults,
    inputNewsIds: validResults.map((result) => result.newsId),
    warnings
  };
}
