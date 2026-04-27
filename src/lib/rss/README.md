# RSS module

This directory contains RSS ingestion helpers:

- `fetchFeed.ts`: fetch RSS/Atom XML from a feed URL.
- `parseRss.ts`: parse RSS/Atom entries into safe metadata records.
- `normalizeUrl.ts`: normalize article URLs for deduplication.
- `ingestFeed.ts`: fetch → parse → normalize → dedupe → persist RSS/Atom metadata into `news_items`.

The ingestion flow stores metadata only (title, link, source, date, and short item/article description).
It does not fetch article pages, scrape article bodies, or generate summaries.

Use this module from server-side routes/actions only, together with the D1 Drizzle client helper in `src/lib/db/client.ts`.
