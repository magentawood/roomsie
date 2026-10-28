import { env } from './env'
import { createAnalyticsDb } from './analytics/client'
import { googleKeys } from './auth'
import { createDb } from './db/client'
import { buildServer } from './server'
import { r2Storage } from './storage'

const app = buildServer({
  webOrigin: env.WEB_ORIGIN,
  db: createDb(env.DATABASE_URL),
  analyticsDb: env.ANALYTICS_DATABASE_URL ? createAnalyticsDb(env.ANALYTICS_DATABASE_URL) : undefined,
  firebaseProjectId: env.FIREBASE_PROJECT_ID,
  firebaseKeys: googleKeys,
  moderation: env.moderation,
  messaging: env.messaging,
  mailer: env.mailer,
  idStore: env.idStore,
  storage: r2Storage({
    accountId: env.R2_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucket: env.R2_BUCKET_PHOTOS,
    publicUrl: env.R2_PUBLIC_URL,
  }),
})
await app.listen({ port: env.PORT, host: '0.0.0.0' })
