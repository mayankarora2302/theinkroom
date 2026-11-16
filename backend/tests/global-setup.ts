import { execSync } from 'node:child_process';

/**
 * Applies migrations to the dedicated test database before the suite runs.
 * Tests clear their own rows between cases (see helpers.resetDb), so point
 * TEST_DATABASE_URL at a database used only for tests — never production.
 */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('Set TEST_DATABASE_URL to a PostgreSQL database used only for tests (its rows are deleted during the run).');
  }
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
  });
}
