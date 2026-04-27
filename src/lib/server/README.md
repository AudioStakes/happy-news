# Server-only modules

Put server-only modules here to avoid exposing secrets to the client.
SvelteKit enforces this boundary: any code imported via `$lib/server/*` cannot be bundled into client code.

- `db.ts`: compatibility re-export for `src/lib/db/client.ts`.
- `ingestFeed.ts`: compatibility re-export for `src/lib/rss/ingestFeed.ts`.
