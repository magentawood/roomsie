import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { buildServer } from '../src/server'

export const openapiPath = fileURLToPath(new URL('../../../packages/contract/openapi.json', import.meta.url))

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = buildServer({ webOrigin: 'http://localhost:3000' })
  await app.ready()
  writeFileSync(openapiPath, `${JSON.stringify(app.swagger(), null, 2)}\n`)
  await app.close()
}
