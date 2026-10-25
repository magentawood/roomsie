import { env } from './env'
import { googleKeys } from './auth'
import { createDb } from './db/client'
import { buildServer } from './server'
import { unconfiguredPhotoStore } from './storage'

const app = buildServer({
  webOrigin: env.WEB_ORIGIN,
  db: createDb(env.DATABASE_URL),
  firebaseProjectId: env.FIREBASE_PROJECT_ID,
  firebaseKeys: googleKeys,
  photos: unconfiguredPhotoStore,
})
await app.listen({ port: env.PORT, host: '0.0.0.0' })
