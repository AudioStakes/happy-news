# Happy News App (MVP Foundation)

Happy News App is a free-tier MVP that will recommend uplifting news links to users based on their ratings.

This repository currently contains **only the initial deployable foundation** using SvelteKit + Cloudflare.

## Scope of this phase

Implemented now:
- SvelteKit + TypeScript project scaffold
- Tailwind CSS setup
- Cloudflare Pages adapter/config placeholders
- Cloudflare D1 + Drizzle configuration placeholders
- Placeholder pages for user/admin routes
- Basic `src/lib` folder structure for future business logic

Not implemented yet:
- RSS fetching
- Real DB schema and migrations
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
- `npm run check` – Svelte + TypeScript checks
- `npm run lint` – Prettier + ESLint checks
- `npm run format` – auto-format with Prettier
- `npm run test` – run test suite (placeholder)

## Cloudflare / D1 setup notes

- Update `wrangler.toml` with your D1 database ID.
- Update `drizzle.config.ts` credentials/placeholders.
- Keep DB access server-side only.

## Planned next phases

1. Implement RSS feed registration and metadata ingestion.
2. Add minimal D1 schema + Drizzle migrations.
3. Build admin classification prompt + JSON validation flow.
4. Add user rating capture and simple recommendation scoring.
5. Add admin auth protection and security hardening.
