import { z } from 'zod'

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8080),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.url(),
  FIREBASE_PROJECT_ID: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_PHOTOS: z.string().min(1),
  R2_PUBLIC_URL: z.url(),
})

export const env = envSchema.parse(process.env)
