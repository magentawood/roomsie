import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ModelRole, ModelUsage } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'

/** The probability of each token of an answer, as a natural log (PD7). */
const tokenSchema = z.object({ token: z.string(), logprob: z.number() })
export type Token = z.infer<typeof tokenSchema>

const completion = z.object({
  choices: z.array(z.object({
    message: z.object({ content: z.string().nullable() }),
    logprobs: z.object({ content: z.array(tokenSchema).nullable() }).nullish(),
  })).min(1),
  usage: z.object({
    prompt_tokens: z.int(),
    completion_tokens: z.int(),
    // DeepSeek gives its cache hits in its own field, and Gemini in the field of OpenAI.
    prompt_cache_hit_tokens: z.int().optional(),
    prompt_tokens_details: z.object({ cached_tokens: z.int().optional() }).nullish(),
  }).transform((u): ModelUsage => ({
    tokensIn: u.prompt_tokens, cachedTokensIn: u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0, tokensOut: u.completion_tokens,
  })),
})

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
const readText = (content: string) => content.trim() || undefined

// Both vendors serve the chat format of OpenAI, so one request fits both (PD7).
const vendors = ['deepseek', 'gemini'] as const
type Vendor = (typeof vendors)[number]
const urls: Record<Vendor, string> = {
  deepseek: 'https://api.deepseek.com/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
}
/** The first word of a model name is its vendor, such as `deepseek` in `deepseek-flash`. */
export const vendorOf = (model: string) => vendors.find((vendor) => model.startsWith(`${vendor}-`))

export type ModelCall = {
  req: FastifyRequest
  role: ModelRole
  system: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  /** The cost of an interview is the sum of the calls of its session (PD5). */
  session: string | null
}

/** No model gave a valid answer. The caller selects what the user sees. */
export class ModelUnavailable extends Error {}

type Outcome<T> = { outcome: 'ok'; value: T } | { outcome: 'invalid' | 'failed' }
/** `refused` is the status of a 4xx other than 429: a bad key or an empty balance. */
type Answer<T> = Outcome<T> & { usage: ModelUsage; refused?: number }
const noUsage: ModelUsage = { tokensIn: 0, cachedTokensIn: 0, tokensOut: 0 }

type Read<T> = (content: string, tokens: Token[] | null, model: string) => T | undefined

async function readAnswer<T>(res: Response | null, read: Read<T>, model: string): Promise<Answer<T>> {
  if (!res?.ok) return { outcome: 'failed', usage: noUsage, ...(res && res.status !== 429 && res.status < 500 && { refused: res.status }) }
  let json: unknown
  try {
    json = await res.json()
  } catch (err) {
    // A timeout or a lost connection can also come while the body arrives. Then the vendor is slow, not wrong.
    if (!(err instanceof SyntaxError)) return { outcome: 'failed', usage: noUsage }
  }
  const body = completion.safeParse(json)
  const usage = body.success ? body.data.usage : noUsage
  const choice = body.success ? body.data.choices[0]! : undefined
  const value = choice ? read(choice.message.content ?? '', choice.logprobs?.content ?? null, model) : undefined
  return value === undefined ? { outcome: 'invalid', usage } : { outcome: 'ok', value, usage }
}

/** The only code that calls a model (PD7, ADR-0014). */
export function modelsOf({ keys, primary, fallback, timeoutMs }: { keys: Record<Vendor, string>; primary: string; fallback: string; timeoutMs: number }) {
  type Mode = { json: boolean; logprobs?: boolean }
  async function attempt<T>(call: ModelCall, model: string, { json, logprobs }: Mode, read: Read<T>) {
    // The settings let only a model name of a known vendor through.
    const vendor = vendorOf(model)!
    const started = performance.now()
    const res = await fetch(urls[vendor], {
      method: 'POST',
      headers: { authorization: `Bearer ${keys[vendor]}`, 'content-type': 'application/json' },
      // The fixed system prompt comes first, so the automatic cache of each vendor applies.
      // Gemini refuses the logprobs field, so only DeepSeek gets it.
      body: JSON.stringify({
        model, messages: [{ role: 'system', content: call.system }, ...call.messages],
        ...(json && { response_format: { type: 'json_object' } }), ...(logprobs && vendor === 'deepseek' && { logprobs: true }),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null)
    const answer = await readAnswer(res, read, model)
    const ms = Math.round(performance.now() - started)
    const record = { role: call.role, model, ...answer.usage, ms, fallback: model === fallback, outcome: answer.outcome, session: call.session }
    call.req.server.analytics.track(call.req, { name: 'model_called', ...record })
    call.req.log.info(record, 'model call')
    return { ...answer, ms }
  }

  async function run<T>(call: ModelCall, mode: Mode, read: Read<T>) {
    const first = await attempt(call, primary, mode, read)
    // Gemini answers, but a person must fix the key or the balance of DeepSeek.
    if (first.refused) reportError(new Error(`${primary} answered ${first.refused}`), { where: `models.${call.role}`, log: call.req.log })
    const second = first.outcome === 'invalid' ? await attempt(call, primary, mode, read) : first
    const last = second.outcome === 'ok' ? second : await attempt(call, fallback, mode, read)
    if (last.outcome === 'ok') return last.value
    const err = new ModelUnavailable(`No model answered the ${call.role}: the last attempt was ${last.outcome}`)
    reportError(err, { where: `models.${call.role}`, userId: call.req.user?.id, log: call.req.log })
    throw err
  }

  const parseWith = <S extends z.ZodType>(schema: S) => (content: string): z.infer<S> | undefined => {
    const parsed = schema.safeParse(parseJson(content))
    return parsed.success ? parsed.data : undefined
  }

  return {
    json: <S extends z.ZodType>(call: ModelCall & { schema: S }) => run(call, { json: true }, parseWith(call.schema)),
    /** A JSON call that also gives the probability of each token. Gemini gives none, so `tokens` is then null. */
    /** `model` tells the vendor of the answer: DeepSeek gives token probabilities, and Gemini does not. */
    scored: <S extends z.ZodType>(call: ModelCall & { schema: S }) => run(call, { json: true, logprobs: true }, (content, tokens, model) => {
      const value = parseWith(call.schema)(content)
      return value === undefined ? undefined : { value, tokens, model }
    }),
    text: (call: ModelCall) => run(call, { json: false }, readText),
    /** One short prompt to each model, with no fallback: the live check of the keys. */
    check: (req: FastifyRequest) => Promise.all([primary, fallback].map(async (model) => {
      const answer = await attempt({ req, role: 'check', system: 'Answer with one word.', messages: [{ role: 'user', content: 'Say ok.' }], session: null }, model, { json: false }, readText)
      return { model, answered: answer.outcome === 'ok', ms: answer.ms, ...answer.usage }
    })),
  }
}
export type Models = ReturnType<typeof modelsOf>
