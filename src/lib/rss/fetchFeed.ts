function toSafeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Invalid feed URL: ${trimmed}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported feed URL protocol: ${parsed.protocol}`);
  }

  return parsed.toString();
}

export async function fetchFeed(url: string): Promise<string> {
  const safeUrl = toSafeUrl(url);

  const response = await fetch(safeUrl, {
    headers: {
      'user-agent': 'happy-news-rss-ingestor/1.0 (+https://github.com/AudioStakes/happy-news)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed (${safeUrl}): ${response.status} ${response.statusText}`);
  }

  return response.text();
}
