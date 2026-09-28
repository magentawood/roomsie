import { z } from 'zod'

// Environment is an external boundary, so it is parsed like any other input.
const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),
  WEB_ORIGIN: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().optional(),
})

export type Env = z.infer<typeof Env>

export const env: Env = Env.parse(process.env)
