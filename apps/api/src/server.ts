import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { deleteMeResponse, healthResponse, meResponse } from '@roomsie/contract'
import { deleteAccount } from './account'
import { requireUser, type AuthOptions } from './auth'
import type { PhotoStore } from './storage'

export function buildServer(options: { webOrigin: string; photos: PhotoStore } & AuthOptions) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] } }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorateRequest('user', null)
  app.register(cors, { origin: options.webOrigin })
  app.register(swagger, {
    openapi: { info: { title: 'roomsie API', version: '1' } },
    transform: jsonSchemaTransform,
  })
  app.register(
    async (v1) => {
      v1.withTypeProvider<ZodTypeProvider>().get(
        '/health',
        { schema: { response: { 200: healthResponse } } },
        async () => ({ status: 'ok' as const }),
      )
      v1.withTypeProvider<ZodTypeProvider>().get(
        '/me',
        { preHandler: requireUser(options), schema: { response: { 200: meResponse } } },
        async (req) => req.user!,
      )
      v1.withTypeProvider<ZodTypeProvider>().delete(
        '/me',
        { preHandler: requireUser(options, { allowSuspended: true }), schema: { response: { 204: deleteMeResponse } } },
        async (req, reply) => {
          await deleteAccount(options.db, options.photos, req.user!.id)
          return reply.code(204).send(null)
        },
      )
    },
    { prefix: '/v1' },
  )
  return app
}
