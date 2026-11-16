import multer from 'multer';
import { maxUploadBytes } from '../config/env.js';
import { HttpError } from '../utils/http-error.js';

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Single in-memory image upload; the buffer is optimised by Sharp and never written to disk. */
export const imageUpload = (field = 'image') =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxUploadBytes, files: 1, fields: 30, fieldSize: 64 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ACCEPTED_MIME.includes(file.mimetype)) {
        return cb(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Please upload a JPEG, PNG or WebP photograph.'));
      }
      cb(null, true);
    },
  }).single(field);
