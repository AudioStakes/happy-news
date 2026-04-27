# AGENTS.md - Happy News App rules

## Project rules

- Use SvelteKit with TypeScript.
- Use Tailwind CSS for styling.
- Use Cloudflare D1 as the only database.
- Use Drizzle ORM for schema and migrations.
- Do not add paid services.
- Do not add OpenAI API integration.
- Do not add article body scraping.
- Do not generate article summaries.
- Do not generate or execute SQL from ChatGPT output.
- ChatGPT classification import must accept JSON only.
- Validate all admin-pasted JSON before database writes.
- Keep the MVP simple and deployable on Cloudflare free tier.

## Code style

- Prefer simple, readable TypeScript.
- Keep business logic in `src/lib`.
- Keep route handlers thin.
- Add validation for all external inputs.
- Avoid unnecessary dependencies.
- Use server-side code for DB access only.

## Testing expectations

Future implementation should add tests for:
- RSS parsing
- URL normalization
- classification JSON validation
- recommendation scoring
- user preference score updates

For this initial setup task, adding a light test framework is acceptable, but avoid overbuilding.

## Security rules

- Never trust RSS content.
- Never trust ChatGPT output.
- Escape or sanitize user-visible external text.
- Admin routes must be protected in a later task.
- Do not expose secrets to the client.
