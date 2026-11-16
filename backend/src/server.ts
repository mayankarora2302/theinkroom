import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { storage } from './services/storage.service.js';

async function main() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] could not connect to PostgreSQL. Check DATABASE_URL in backend/.env.\n', (err as Error).message);
    process.exit(1);
  }

  try {
    await storage.init();
    console.log(`[storage] ${storage.name} driver ready`);
  } catch (err) {
    console.error(`[storage] ${storage.name} storage is not reachable — uploads will fail until this is fixed.\n`, (err as Error).message);
  }

  const server = createApp().listen(env.PORT, () => {
    console.log(`[api] listening on http://localhost:${env.PORT}/api/v1`);
  });

  const shutdown = () => {
    server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

void main();
