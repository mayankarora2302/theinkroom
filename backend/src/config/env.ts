import { z } from 'zod';

const bool = z
  .union([z.boolean(), z.string()])
  .transform((v) => v === true || v === '1' || v === 'true');

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_ORIGIN: z.string().url().default('http://localhost:3000'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    STORAGE_DRIVER: z.enum(['supabase', 'local']).default('supabase'),
    SUPABASE_URL: z.string().url().optional().or(z.literal('')),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    SUPABASE_STORAGE_BUCKET: z.string().min(1).default('portfolio'),
    LOCAL_UPLOAD_DIR: z.string().default('./uploads'),
    PUBLIC_API_URL: z.string().url().default('http://localhost:4000'),
    MAX_UPLOAD_MB: z.coerce.number().positive().max(50).default(15),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().max(24 * 30).default(168),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    FRONTEND_REVALIDATE_URL: z.string().url().optional().or(z.literal('')),
    REVALIDATE_SECRET: z.string().optional(),
    DISABLE_RATE_LIMIT: bool.default(false),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER === 'supabase') {
      if (!env.SUPABASE_URL) ctx.addIssue({ code: 'custom', path: ['SUPABASE_URL'], message: 'Required when STORAGE_DRIVER=supabase' });
      if (!env.SUPABASE_SERVICE_ROLE_KEY)
        ctx.addIssue({ code: 'custom', path: ['SUPABASE_SERVICE_ROLE_KEY'], message: 'Required when STORAGE_DRIVER=supabase' });
    }
    if (env.NODE_ENV === 'production' && env.STORAGE_DRIVER === 'local') {
      ctx.addIssue({ code: 'custom', path: ['STORAGE_DRIVER'], message: 'The local storage driver is for development only' });
    }
    if (env.NODE_ENV === 'production' && env.DISABLE_RATE_LIMIT) {
      ctx.addIssue({ code: 'custom', path: ['DISABLE_RATE_LIMIT'], message: 'Rate limiting cannot be disabled in production' });
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`);
  console.error(`\nInvalid backend environment configuration:\n${lines.join('\n')}\n\nSee backend/.env.example.\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const maxUploadBytes = Math.round(env.MAX_UPLOAD_MB * 1024 * 1024);
