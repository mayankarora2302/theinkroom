import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { adminRouter } from './routes/admin.routes.js';
import { publicRouter } from './routes/public.routes.js';
import { localUploadRoot } from './services/storage.service.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      // The API serves JSON (and dev-only media); a strict CSP is safe here.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], imgSrc: ["'self'"] } },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  if (localUploadRoot) {
    app.use('/media', express.static(localUploadRoot, { immutable: true, maxAge: '365d', index: false, dotfiles: 'deny' }));
  }

  app.get('/api/v1/health', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ data: { ok: true } });
  });
  app.use('/api/v1/public', publicRouter);
  app.use('/api/v1/admin', adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
