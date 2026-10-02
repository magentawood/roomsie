import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { healthResponse } from '@roomsie/contract'
import { buildServer } from '../src/server'
import { openapiPath } from '../scripts/openapi'

const app = buildServer({ webOrigin: 'http://localhost:3000' })

describe('the API', () => {
  it('serves the health check under /v1 in the contract shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' })
    expect(res.statusCode).toBe(200)
    expect(healthResponse.parse(res.json())).toEqual({ status: 'ok' })
  })

  it('serves no route without the /v1 prefix', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(404)
  })
})

describe('the OpenAPI document', () => {
  it('describes the health route from the contract schema', async () => {
    await app.ready()
    const doc = app.swagger() as { paths: Record<string, { get?: { responses?: Record<string, unknown> } }> }
    expect(doc.paths['/v1/health']?.get?.responses?.['200']).toBeDefined()
  })

  it('is committed and current', async () => {
    await app.ready()
    const committed = JSON.parse(readFileSync(openapiPath, 'utf8'))
    expect(committed).toEqual(JSON.parse(JSON.stringify(app.swagger())))
  })
})
