import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().default(8080),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
})

export const env = schema.parse(process.env)
