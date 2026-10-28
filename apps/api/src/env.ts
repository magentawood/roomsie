import { z } from 'zod'
import { mailerSettings } from './alerts/settings'
import { unsetIfEmpty } from './env-values'
import { messagingSettings } from './messages/settings'
import { moderationSettings } from './moderation/settings'
import { idStoreSettings } from './verification/settings'

const envSchema = z.object({
  PORT: z.coerce.number().int().default(8080),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.url(),
  /** Unset: the API writes no events (T-24). */
  ANALYTICS_DATABASE_URL: unsetIfEmpty.pipe(z.url().optional()),
  FIREBASE_PROJECT_ID: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_PHOTOS: z.string().min(1),
  R2_PUBLIC_URL: z.url(),
})

export const env = { ...envSchema.parse(process.env), moderation: moderationSettings.parse(process.env), messaging: messagingSettings.parse(process.env), mailer: mailerSettings.parse(process.env), idStore: idStoreSettings.parse(process.env) }
