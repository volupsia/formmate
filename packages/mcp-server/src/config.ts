import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
    PORT: z.string().transform(Number).default('3002'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    FORMCMS_BASE_URL: z.string().url().default('http://127.0.0.1:3001'),
    FORMCMS_API_KEY: z.string().min(1).default(''),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('warn'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    process.exit(1);
}

export const config = _env.data;
export type Config = typeof config;
