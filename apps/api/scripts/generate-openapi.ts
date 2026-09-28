// Writes the OpenAPI document to packages/contract/openapi.json.
// Run after changing any route schema, and commit the result.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { buildApp } from '../src/app'

const out = fileURLToPath(new URL('../../../packages/contract/openapi.json', import.meta.url))

const app = await buildApp()
await app.ready()
await writeFile(out, JSON.stringify(app.swagger(), null, 2) + '\n')
await app.close()

console.log(`Wrote ${out}`)
