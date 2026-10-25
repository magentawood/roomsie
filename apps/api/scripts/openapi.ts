import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { googleKeys } from '../src/auth'
import { createDb } from '../src/db/client'
import { buildServer } from '../src/server'

export const openapiPath = fileURLToPath(new URL('../../../packages/contract/openapi.json', import.meta.url))

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // The document needs the routes only, so the database and the keys are never used.
  const app = buildServer({
    webOrigin: 'http://localhost:3000',
    db: createDb('postgres://unused@localhost/unused'),
    firebaseProjectId: 'unused',
    firebaseKeys: googleKeys,
  })
  await app.ready()
  writeFileSync(openapiPath, `${JSON.stringify(app.swagger(), null, 2)}\n`)
  await app.close()
}
