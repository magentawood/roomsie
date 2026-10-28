import Fastify, { type FastifyError } from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { areasResponse, healthResponse, meResponse, noContent } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'
import { deleteAccount } from './account'
import { alertsOf, type Alerts } from './alerts/alerts'
import type { AnalyticsDb } from './analytics/client'
import { analyticsOf, type Analytics } from './analytics/track'
import { alertRoutes } from './alerts/routes'
import { listAreas } from './areas'
import { articleRoutes } from './articles/routes'
import { requireUser, type AuthOptions } from './auth'
import { blockRoutes } from './blocks/routes'
import { feedbackRoutes } from './feedback/routes'
import { inviteRoutes } from './invites/routes'
import { listingRoutes } from './listings/routes'
import { messageRoutes } from './messages/routes'
import { moderationRoutes } from './moderation/routes'
import { profileRoutes } from './profiles/routes'
import { reportRoutes } from './reports/routes'
import { requestRoutes } from './requests/routes'
import { savedRoutes } from './saved/routes'
import { siteRoutes } from './site/routes'
import { noMailer, type Mailer } from './email'
import type { Messaging } from './messages/settings'
import type { IdStore } from './id-store'
import type { Storage } from './storage'
import { verificationRoutes } from './verification/routes'

declare module 'fastify' {
  interface FastifyInstance {
    alerts: Alerts
    analytics: Analytics
  }
}

export function buildServer(options: { webOrigin: string; storage: Storage; messaging: Messaging; mailer?: Mailer; idStore?: IdStore; analyticsDb?: AnalyticsDb } & AuthOptions) {
  const app = Fastify({ logger: { redact: ['req.headers.authorization'] } }).withTypeProvider<ZodTypeProvider>()
  const alerts = alertsOf({ db: options.db, mailer: options.mailer ?? noMailer, firebaseAdmin: options.messaging.firebaseAdmin, webOrigin: options.webOrigin, log: app.log })
  app.decorate('alerts', alerts)
  app.addHook('onClose', () => alerts.settled())
  const analytics = analyticsOf(options.analyticsDb, app.log)
  app.decorate('analytics', analytics)
  app.addHook('onClose', () => analytics.close())
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)
  app.decorateRequest('user', null)
  app.decorateRequest('identity', null)
  app.decorateRequest('analyticsId', null)
  // A 400 names the fields, so a client can show which value is wrong. Other errors keep the default reply.
  app.setErrorHandler<FastifyError>((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      const fields = new Set(err.validation.map((v) => v.instancePath.split('/')[1] || err.validationContext))
      return reply.code(400).send({ error: `not valid: ${[...fields].join(', ')}` })
    }
    // A 4xx is a fault of the request. Fastify writes the log line of each error (T-07).
    if ((err.statusCode ?? 500) >= 500) reportError(err, { where: `${req.method} ${req.routeOptions.url}`, userId: req.user?.id })
    throw err
  })
  // Saved uses PUT, and the listing flow uses PATCH and DELETE. The default allows only GET, HEAD and POST.
  app.register(cors, { origin: options.webOrigin, methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] })
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
        { preHandler: requireUser(options, { forDeletion: true }), schema: { response: { 204: noContent } } },
        async (req, reply) => {
          await deleteAccount({ ...options, firebaseAdmin: options.messaging.firebaseAdmin }, req.user!.id, req.identity!)
          return reply.code(204).send(null)
        },
      )
      v1.withTypeProvider<ZodTypeProvider>().get(
        '/areas',
        { schema: { response: { 200: areasResponse } } },
        async () => ({ areas: await listAreas(options.db) }),
      )
      listingRoutes(v1, options)
      savedRoutes(v1, options)
      reportRoutes(v1, options)
      profileRoutes(v1, options)
      requestRoutes(v1, options)
      blockRoutes(v1, options)
      moderationRoutes(v1, options)
      messageRoutes(v1, options)
      alertRoutes(v1, options)
      verificationRoutes(v1, options)
      siteRoutes(v1, options)
      feedbackRoutes(v1, options)
      inviteRoutes(v1, options)
      articleRoutes(v1, options)
    },
    { prefix: '/v1' },
  )
  return app
}
