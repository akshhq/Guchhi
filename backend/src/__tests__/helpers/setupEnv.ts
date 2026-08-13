/**
 * Runs before every test file (see vitest.config.ts `setupFiles`).
 *
 * SAFETY: integration tests call resetDb(), which truncates real tables.
 * This file forces DATABASE_URL to a `_test` suffixed database so a
 * misconfigured .env can never point the test run at dev or prod data.
 * Create that database once with:
 *   createdb guchhi_test
 *   DATABASE_URL=postgresql://guchhi:guchhi@localhost:5432/guchhi_test npx prisma migrate deploy
 */
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL;
if (url && !/_test(\?|$)/.test(url)) {
  const testUrl = url.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
  process.env.DATABASE_URL = testUrl;
}

process.env.NODE_ENV = 'test';
