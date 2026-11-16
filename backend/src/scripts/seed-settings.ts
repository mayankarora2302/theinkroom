/** Ensures the single SiteSettings row exists with neutral starting content. Safe to run repeatedly. */
import { prisma } from '../lib/prisma.js';
import { getSettingsRow } from '../services/settings.service.js';

getSettingsRow()
  .then(() => console.log('Site settings are ready. Edit them in Admin → Website settings.'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
