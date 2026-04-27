# Happy News App (MVP Foundation)

Happy News App is a free-tier MVP that will recommend uplifting news links to users based on their ratings.

This repository currently contains **only the initial deployable foundation** using SvelteKit + Cloudflare.

## Scope of this phase

Implemented now:
- SvelteKit + TypeScript project scaffold
- Tailwind CSS setup
- Cloudflare Pages adapter/config placeholders
- Cloudflare D1 + Drizzle schema foundation
- Placeholder pages for user/admin routes
- Basic `src/lib` folder structure for future business logic

Not implemented yet:
- Classification workflow logic
- Recommendation logic
- Authentication

## Tech stack

- SvelteKit
- TypeScript
- Tailwind CSS
- Cloudflare Pages (Workers-compatible runtime)
- Cloudflare D1
- Drizzle ORM

## Product constraints (must keep)

- Free-tier-first design; no paid services required.
- **No OpenAI API usage.**
- No external paid AI providers.
- ChatGPT is used manually by admin in the browser.
- App generates prompts for manual copy/paste.
- ChatGPT output must be **JSON only** (never SQL).
- Admin-pasted JSON must be validated before DB writes.
- Do not scrape, store, or summarize article body text.
- User-facing news card fields should stay minimal:
  - title
  - source name
  - published date
  - external article link

## High-level MVP flow (target)

1. Admin registers RSS feeds.
2. App fetches and stores RSS metadata.
3. Admin reviews unclassified items.
4. App generates a Japanese ChatGPT prompt.
5. Admin pastes prompt into ChatGPT (browser).
6. ChatGPT returns classification JSON.
7. Admin pastes JSON back into app.
8. App validates JSON and stores tags.
9. Users view happy news cards and open external links.
10. Users rate how happy each article made them.
11. App later improves ranking based on scores.

## Local development

```bash
npm install
npm run dev
```

Useful scripts:

- `npm run dev` – start local dev server
- `npm run build` – production build
- `npm run preview` – preview build locally
- `npm run check` – Svelte sync + TypeScript checks
- `npm run lint` – Prettier + ESLint checks
- `npm run format` – auto-format with Prettier
- `npm run test` – run test suite (placeholder)
- `npm run db:generate` – generate Drizzle migrations from current schema
- `npm run db:migrate` – Drizzle migration command (for SQLite/local workflows)

## Cloudflare / D1 setup notes

- Update `wrangler.toml` with your D1 database ID.
- Copy `.env.example` to `.env` and fill placeholders when using Drizzle CLI.
- Keep DB access server-side only.

## Database foundation (Drizzle + D1)

- Drizzle schema lives in `src/lib/db/schema.ts`.
- Classification/status constants live in `src/lib/constants/classification.ts`.
- The D1 Drizzle client helper is in `src/lib/db/client.ts` (server-side use only).
- `wrangler.toml` still uses a placeholder D1 database ID; replace it before deployment.

Generate a migration locally:

```bash
npm run db:generate
```

Apply generated migrations to D1 with Wrangler:

```bash
npx wrangler d1 migrations apply <YOUR_DATABASE_NAME> --local
npx wrangler d1 migrations apply <YOUR_DATABASE_NAME> --remote
```

> This project stores RSS metadata only. Do not store article body text or generated summaries.
> RSS ingestion helpers live in `src/lib/rss/*` (`fetchFeed`, `parseRssXml`, `normalizeUrl`, `ingestFeed`) for future admin/cron server-side routes.


## Admin RSS management (current)

- `/admin/rss` can register RSS feeds and manually run ingestion for one feed.
- Manual ingestion stores RSS metadata only (title, source, published date, link, and related feed metadata).
- Admin protection is not implemented yet and will be added in a later task.

## Future implementation phases

1. Implement RSS feed registration and metadata ingestion.
2. Build admin classification prompt + JSON validation flow.
3. Add user rating capture and simple recommendation scoring.
4. Add admin auth protection and security hardening.
