import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { googleKeys } from '../src/auth'
import { createDb } from '../src/db/client'
import { buildServer } from '../src/server'
import { unconfiguredPhotoStore } from '../src/storage'

export const openapiPath = fileURLToPath(new URL('../../../packages/contract/openapi.json', import.meta.url))

/** For a server that serves no signed-in route: the database and the keys stay unused. */
export const routesOnlyOptions = {
  webOrigin: 'http://localhost:3000',
  db: createDb('postgres://unused@localhost/unused'),
  firebaseProjectId: 'unused',
  firebaseKeys: googleKeys,
  photos: unconfiguredPhotoStore,
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = buildServer(routesOnlyOptions)
  await app.ready()
  writeFileSync(openapiPath, `${JSON.stringify(app.swagger(), null, 2)}\n`)
  await app.close()
}
