import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  APP_NAME: z.string().default('HostMaster Panel'),
  APP_URL: z.string().url().default('http://localhost:8080'),
  API_PREFIX: z.string().default('/api'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  AGENT_URL: z.string().default('http://localhost:9090'),
  AGENT_TOKEN: z.string().min(24).default('change-me-hostmaster-agent-secret-change-me'),
  AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().default('admin@hostmaster.local'),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  ADMIN_BOOTSTRAP_USERNAME: z.string().default('admin'),
  BOOTSTRAP_TOKEN: z.string().default(''),
  DEFAULT_LOCALE: z.string().default('en'),
  DEFAULT_THEME: z.string().default('dark'),
  MOCK_SYSTEM_MODE: z.coerce.boolean().default(true),
  ARGON2_TIME_COST: z.coerce.number().int().positive().default(3),
  ARGON2_MEMORY_COST: z.coerce.number().int().positive().default(65536),
  ARGON2_PARALLELISM: z.coerce.number().int().positive().default(1)
});

export const env = envSchema.parse(process.env);
