export type FeedValidationInput = {
  name: string;
  url: string;
  sourceName: string;
  language?: string;
  country?: string;
  defaultCategory?: string;
};

export type FeedValidationResult =
  | {
      ok: true;
      value: {
        name: string;
        url: string;
        sourceName: string;
        language: string;
        country: string;
        defaultCategory: string | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

function normalizeOptionalText(value: string | undefined): string {
  return value?.trim() ?? '';
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateFeedInput(input: FeedValidationInput): FeedValidationResult {
  const name = input.name.trim();
  const url = input.url.trim();
  const sourceName = input.sourceName.trim();
  const language = normalizeOptionalText(input.language) || 'ja';
  const country = normalizeOptionalText(input.country) || 'JP';
  const defaultCategory = normalizeOptionalText(input.defaultCategory);

  if (!name) {
    return { ok: false, error: 'Feed name is required.' };
  }

  if (!sourceName) {
    return { ok: false, error: 'Source name is required.' };
  }

  if (!url) {
    return { ok: false, error: 'Feed URL is required.' };
  }

  if (!isHttpUrl(url)) {
    return { ok: false, error: 'Feed URL must start with http:// or https://.' };
  }

  return {
    ok: true,
    value: {
      name,
      url,
      sourceName,
      language,
      country,
      defaultCategory: defaultCategory || null
    }
  };
}
