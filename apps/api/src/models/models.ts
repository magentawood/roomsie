import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ModelRole, ModelUsage } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'

const completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
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
const isTimeout = (err: unknown) => err instanceof Error && err.name === 'TimeoutError'

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

/** The only code that calls a model (PD7, ADR-0014). */
export function modelsOf({ deepseekKey, geminiKey, primary, fallback, timeoutMs }: { deepseekKey: string; geminiKey: string; primary: string; fallback: string; timeoutMs: number }) {
  // Both vendors serve the chat format of OpenAI, so one request fits both (PD7).
  const vendorOf = (model: string) => (model.startsWith('gemini')
    ? { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: geminiKey }
    : { url: 'https://api.deepseek.com/chat/completions', key: deepseekKey })

  async function attempt<T>(call: ModelCall, model: string, json: boolean, read: (content: string) => T | undefined) {
    const { url, key } = vendorOf(model)
    const started = performance.now()
    let usage: ModelUsage = { tokensIn: 0, cachedTokensIn: 0, tokensOut: 0 }
    let result: Outcome<T> = { outcome: 'failed' }
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      // The fixed system prompt comes first, so the automatic cache of each vendor applies.
      body: JSON.stringify({ model, messages: [{ role: 'system', content: call.system }, ...call.messages], ...(json && { response_format: { type: 'json_object' } }) }),
      signal: AbortSignal.timeout(timeoutMs),
    }).catch(() => null)
    if (res && !res.ok && res.status !== 429 && res.status < 500) {
      // A bad key or an empty balance: the fallback answers, but a person must act.
      reportError(new Error(`${model} answered ${res.status}`), { where: `models.${call.role}`, log: call.req.log })
    } else if (res?.ok) {
      // The timeout can also come while the body arrives. Then the vendor is slow, not wrong.
      const body = await res.json().then((json: unknown) => completion.safeParse(json), (err: unknown) => (isTimeout(err) ? 'timeout' : undefined))
      if (body !== 'timeout') {
        if (body?.success) usage = body.data.usage
        const value = body?.success ? read(body.data.choices[0]!.message.content ?? '') : undefined
        result = value === undefined ? { outcome: 'invalid' } : { outcome: 'ok', value }
      }
    }
    const ms = Math.round(performance.now() - started)
    const record = { role: call.role, model, ...usage, ms, fallback: model === fallback, outcome: result.outcome, session: call.session }
    call.req.server.analytics.track(call.req, { name: 'model_called', ...record })
    call.req.log.info(record, 'model call')
    return { ...result, usage, ms }
  }

  async function run<T>(call: ModelCall, json: boolean, read: (content: string) => T | undefined) {
    const first = await attempt(call, primary, json, read)
    const second = first.outcome === 'invalid' ? await attempt(call, primary, json, read) : first
    const last = second.outcome === 'ok' ? second : await attempt(call, fallback, json, read)
    if (last.outcome === 'ok') return last.value
    const err = new ModelUnavailable(`No model answered the ${call.role}: the last attempt was ${last.outcome}`)
    reportError(err, { where: `models.${call.role}`, userId: call.req.user?.id, log: call.req.log })
    throw err
  }

  return {
    json: <S extends z.ZodType>(call: ModelCall & { schema: S }) => run(call, true, (content): z.infer<S> | undefined => {
      const parsed = call.schema.safeParse(parseJson(content))
      return parsed.success ? parsed.data : undefined
    }),
    text: (call: ModelCall) => run(call, false, readText),
    /** One short prompt to each model, with no fallback: the live check of the keys. */
    check: (req: FastifyRequest) => Promise.all([primary, fallback].map(async (model) => {
      const answer = await attempt({ req, role: 'check', system: 'Answer with one word.', messages: [{ role: 'user', content: 'Say ok.' }], session: null }, model, false, readText)
      return { model, answered: answer.outcome === 'ok', ms: answer.ms, ...answer.usage }
    })),
  }
}
export type Models = ReturnType<typeof modelsOf>
