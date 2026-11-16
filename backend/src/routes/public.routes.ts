import { Router } from 'express';
import * as c from '../controllers/public.controller.js';
import { checkOrigin } from '../middleware/auth.js';
import { enquiryGlobalLimiter, enquiryLimiter, publicLimiter } from '../middleware/rate-limit.js';
import { handler } from '../utils/async-handler.js';

export const publicRouter = Router();

publicRouter.use(publicLimiter);
publicRouter.get('/tattoos', handler(c.listTattoos));
publicRouter.get('/tattoos/:slug', handler(c.getTattoo));
publicRouter.get('/featured', handler(c.getFeatured));
publicRouter.get('/slugs', handler(c.getSlugs));
publicRouter.get('/settings', handler(c.getSettings));
publicRouter.post('/enquiries', checkOrigin, enquiryLimiter, enquiryGlobalLimiter, handler(c.postEnquiry));
