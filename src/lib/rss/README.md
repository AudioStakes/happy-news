# RSS module

This directory contains RSS ingestion foundation helpers:

- `fetchFeed.ts`: fetch RSS/Atom XML from a feed URL.
- `parseRss.ts`: parse RSS/Atom entries into safe metadata records.
- `normalizeUrl.ts`: normalize article URLs for deduplication.
- `ingestFeed.ts`: insert parsed feed metadata into `news_items` with dedupe.

The ingestion flow stores metadata only (title, link, source, date, and short feed description).
It does not fetch article pages, scrape article bodies, or generate summaries.
