# Server-only modules

Put server-only modules here to avoid exposing secrets to the client.
SvelteKit enforces this boundary: any code imported via `$lib/server/*` cannot be bundled into client code.

- `db.ts`: Drizzle D1 client factory (`createDb`) and `Database` type.
- `ingestFeed.ts`: fetch → parse → normalize → dedupe → persist RSS/Atom feed items into `news_items`.
