import Fastify from 'fastify'
import cors from '@fastify/cors'
import { healthResponse, type HealthResponse } from '@roomsie/contract'

export function buildServer(options: { webOrigin: string }) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] } })
  app.register(cors, { origin: options.webOrigin })
  app.register(
    async (v1) => {
      v1.get('/health', async (): Promise<HealthResponse> => healthResponse.parse({ status: 'ok' }))
    },
    { prefix: '/v1' },
  )
  return app
}
