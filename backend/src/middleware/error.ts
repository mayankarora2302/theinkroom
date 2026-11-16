import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'This endpoint does not exist.' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? (err.details as object) : {}) },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: { code: 'PAYLOAD_TOO_LARGE', message: `That photograph is larger than ${env.MAX_UPLOAD_MB} MB. Please export a smaller version.` },
      });
      return;
    }
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'The upload could not be read. Please try again.' } });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'That item no longer exists.' } });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: { code: 'CONFLICT', message: 'An item with these details already exists.' } });
      return;
    }
  }

  const e = err as { type?: string; status?: number };
  if (e?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'The request body is not valid JSON.' } });
    return;
  }
  if (e?.type === 'entity.too.large') {
    res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request is too large.' } });
    return;
  }

  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side. Please try again.' } });
};
