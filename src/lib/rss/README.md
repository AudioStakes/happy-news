# RSS module

This directory contains RSS ingestion helpers:

- `fetchFeed.ts`: fetch RSS/Atom XML from a feed URL.
- `parseRss.ts`: parse RSS/Atom entries into safe metadata records.
- `normalizeUrl.ts`: normalize article URLs for deduplication.

The ingestion flow stores metadata only (title, link, source, date, and short item/article description).
It does not fetch article pages, scrape article bodies, or generate summaries.

`ingestFeed.ts` (the DB-writing step) lives in `src/lib/server/ingestFeed.ts` to enforce server-only access.
