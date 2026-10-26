import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { asc } from 'drizzle-orm'
import { areasResponse, deleteMeResponse, healthResponse, meResponse } from '@roomsie/contract'
import { deleteAccount } from './account'
import { requireUser, type AuthOptions } from './auth'
import { areas } from './db/schema'
import { listingRoutes } from './listings/routes'
import { savedRoutes } from './saved/routes'
import type { Storage } from './storage'

export function buildServer(options: { webOrigin: string; storage: Storage } & AuthOptions) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] } }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorateRequest('user', null)
  app.decorateRequest('identity', null)
  // A 400 names the fields, so a client can show which value is wrong. Other errors keep the default reply.
  app.setErrorHandler((err, _req, reply) => {
    if (!hasZodFastifySchemaValidationErrors(err)) throw err
    const fields = new Set(err.validation.map((v) => v.instancePath.split('/')[1] || err.validationContext))
    return reply.code(400).send({ error: `not valid: ${[...fields].join(', ')}` })
  })
  // The listing flow saves with PATCH and deletes with DELETE. The default allows only GET, HEAD and POST.
  app.register(cors, { origin: options.webOrigin, methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE'] })
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
          await deleteAccount(options.db, options.storage, req.user!.id, req.identity!)
          return reply.code(204).send(null)
        },
      )
      v1.withTypeProvider<ZodTypeProvider>().get(
        '/areas',
        { schema: { response: { 200: areasResponse } } },
        async () => ({
          areas: await options.db.select({ slug: areas.slug, name: areas.name, isLaunchArea: areas.isLaunchArea })
            .from(areas).orderBy(asc(areas.sortOrder)),
        }),
      )
      listingRoutes(v1, options)
      savedRoutes(v1, options)
    },
    { prefix: '/v1' },
  )
  return app
}
