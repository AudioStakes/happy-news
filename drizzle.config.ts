import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: 'REPLACE_WITH_CF_ACCOUNT_ID',
    databaseId: 'REPLACE_WITH_D1_DATABASE_ID',
    token: 'REPLACE_WITH_CF_API_TOKEN'
  }
});
