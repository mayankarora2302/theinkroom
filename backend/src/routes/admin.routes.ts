import { Router } from 'express';
import * as auth from '../controllers/auth.controller.js';
import * as c from '../controllers/admin.controller.js';
import { checkOrigin, requireAdmin, requireCsrf } from '../middleware/auth.js';
import { accountLoginLimiter, loginLimiter } from '../middleware/rate-limit.js';
import { imageUpload } from '../middleware/upload.js';
import { handler } from '../utils/async-handler.js';

export const adminRouter = Router();

adminRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
adminRouter.use(checkOrigin);

// Authentication (no public registration — admins are created with `npm run admin:create`).
adminRouter.post('/auth/login', loginLimiter, accountLoginLimiter, handler(auth.login));

// Everything below requires a valid session + CSRF token for mutations.
adminRouter.use(handler(requireAdmin), requireCsrf);

adminRouter.post('/auth/logout', handler(auth.logout));
adminRouter.get('/auth/me', handler(auth.me));

adminRouter.get('/stats', handler(c.stats));

adminRouter.get('/tattoos', handler(c.listTattoos));
adminRouter.post('/tattoos', imageUpload(), handler(c.createTattoo));
adminRouter.get('/tattoos/:id', handler(c.getTattoo));
adminRouter.put('/tattoos/:id', imageUpload(), handler(c.updateTattoo));
adminRouter.delete('/tattoos/:id', handler(c.deleteTattoo));
adminRouter.patch('/tattoos/:id/featured', handler(c.toggleFeatured));
adminRouter.put('/featured/reorder', handler(c.reorderFeatured));

adminRouter.get('/settings', handler(c.getSettings));
adminRouter.put('/settings', handler(c.putSettings));
adminRouter.put('/settings/portrait', imageUpload(), handler(c.putPortrait));
adminRouter.delete('/settings/portrait', handler(c.deletePortrait));

adminRouter.get('/enquiries', handler(c.getEnquiries));
adminRouter.patch('/enquiries/:id', handler(c.patchEnquiry));
adminRouter.delete('/enquiries/:id', handler(c.removeEnquiry));
