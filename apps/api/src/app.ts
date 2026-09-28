import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { env } from './env'
import { healthRoutes } from './routes/health'

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'test' ? false : true,
  }).withTypeProvider<ZodTypeProvider>()

  // Zod parses every request and response (ADR 0004).
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: env.WEB_ORIGIN })

  // The OpenAPI document is generated from the route schemas.
  await app.register(swagger, {
    openapi: {
      info: { title: 'roomsie API', version: '0.0.0' },
    },
    transform: jsonSchemaTransform,
  })

  await app.register(healthRoutes)

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
