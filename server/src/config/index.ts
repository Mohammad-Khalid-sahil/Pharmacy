import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

const envPath = path.resolve(__dirname, '../../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`Failed to load environment file at ${envPath}:`, result.error);
  process.exit(1);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().min(1, 'PORT is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required')
});

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error('Environment validation failed:', parsedEnv.error.format());
  process.exit(1);
}

export default {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: Number(parsedEnv.data.PORT),
  database_url: parsedEnv.data.DATABASE_URL,
  jwt_secret: parsedEnv.data.JWT_SECRET
};
