export async function fetchFeed(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'happy-news-rss-ingestor/1.0 (+https://github.com/AudioStakes/happy-news)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}
