import Fastify from 'fastify'
import cors from '@fastify/cors'
import type { HealthResponse } from '@roomsie/contract'

export function buildServer(options: { webOrigin: string }) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] } })
  app.register(cors, { origin: options.webOrigin })
  app.register(
    async (v1) => {
      v1.get('/health', async (): Promise<HealthResponse> => ({ status: 'ok' }))
    },
    { prefix: '/v1' },
  )
  return app
}
