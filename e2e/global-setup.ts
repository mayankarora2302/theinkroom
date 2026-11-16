import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Loads e2e/.env.e2e and makes sure the test admin exists with that password. */
export default async function globalSetup() {
  const envFile = path.join(__dirname, '.env.e2e');
  if (!fs.existsSync(envFile)) throw new Error('Create e2e/.env.e2e from e2e/.env.e2e.example first.');
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]!] = m[2];
  }
  const email = process.env.E2E_ADMIN_EMAIL!;
  const run = (extra: string) =>
    execSync(`npm run admin:create -w backend -- --email ${email} --additional ${extra}`, {
      stdio: 'pipe',
      env: { ...process.env, ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD },
    });
  try {
    run('');
  } catch {
    run('--reset');
  }
  const res = await fetch(`${process.env.E2E_BASE_URL ?? 'http://localhost:3000'}/api/v1/health`).catch(() => null);
  if (!res?.ok) throw new Error('The site/API is not running. Start it with `npm run dev` first.');
}
