export type ParsedRssItem = {
  title: string;
  url: string;
  publishedAt: string | null;
  description: string | null;
};

export type IngestFeedInput = {
  id: number;
  url: string;
  sourceName: string;
  language: string;
  country: string;
};

export type IngestFeedResult = {
  feedId: number;
  fetched: number;
  inserted: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
};
