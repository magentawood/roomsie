import { env } from './env'
import { buildServer } from './server'

const app = buildServer({ webOrigin: env.WEB_ORIGIN })
await app.listen({ port: env.PORT, host: '0.0.0.0' })
