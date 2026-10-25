import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { healthResponse } from '@roomsie/contract'
import { buildServer } from '../src/server'
import { openapiPath, routesOnlyOptions } from '../scripts/openapi'

const app = buildServer(routesOnlyOptions)

describe('the API', () => {
  it('serves the health check under /v1 in the contract shape', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/health' })
    expect(res.statusCode).toBe(200)
    expect(healthResponse.parse(res.json())).toEqual({ status: 'ok' })
  })

  it('lets the web origin send PATCH and DELETE, which the listing flow uses', async () => {
    const res = await app.inject({
      method: 'OPTIONS', url: '/v1/listings/0199e4b0-0000-7000-8000-000000000001',
      headers: { origin: 'http://localhost:3000', 'access-control-request-method': 'PATCH', 'access-control-request-headers': 'authorization,content-type' },
    })
    expect(res.statusCode).toBe(204)
    expect(String(res.headers['access-control-allow-methods'])).toContain('PATCH')
    expect(String(res.headers['access-control-allow-methods'])).toContain('DELETE')
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
