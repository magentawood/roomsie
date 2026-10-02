import { describe, expect, it } from 'vitest'
import { healthResponse } from '@roomsie/contract'
import { buildServer } from '../src/server'

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
