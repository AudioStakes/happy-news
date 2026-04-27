import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? 'REPLACE_WITH_CF_ACCOUNT_ID',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? 'REPLACE_WITH_D1_DATABASE_ID',
    token: process.env.CLOUDFLARE_API_TOKEN ?? 'REPLACE_WITH_CF_API_TOKEN'
  }
});
