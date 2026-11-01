import type { FastifyRequest } from 'fastify'
import { z } from 'zod'
import type { ModelRole } from '@roomsie/contract'
import { reportError } from '@roomsie/config/report'

/** Both vendors serve the chat format of OpenAI, so one request fits both (PD7). */
const endpoints = {
  deepseek: 'https://api.deepseek.com/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
}

const completion = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: z.object({
    prompt_tokens: z.int(),
    completion_tokens: z.int(),
    // DeepSeek gives its cache hits in its own field, and Gemini in the field of OpenAI.
    prompt_cache_hit_tokens: z.int().optional(),
    prompt_tokens_details: z.object({ cached_tokens: z.int().optional() }).nullish(),
  }),
})

export type Message = { role: 'user' | 'assistant'; content: string }
export type ModelCall = { req: FastifyRequest; role: ModelRole; system: string; messages: Message[]; session?: string | null }

/** No model gave a valid answer. The caller selects what the user sees. */
export class ModelUnavailable extends Error {}

type Attempt<T> = { outcome: 'ok'; value: T; tokensIn: number; tokensOut: number; ms: number } | { outcome: 'invalid' | 'failed'; tokensIn: number; tokensOut: number; ms: number }

/** The only code that calls a model (PD7, ADR-0014). */
export function modelsOf(options: { deepseekKey: string; geminiKey: string; primary: string; fallback: string; timeoutMs: number }) {
  const { primary, fallback, timeoutMs } = options
  const vendorOf = (model: string) => (model.startsWith('gemini')
    ? { url: endpoints.gemini, key: options.geminiKey }
    : { url: endpoints.deepseek, key: options.deepseekKey })

  async function attempt<T>(call: ModelCall, model: string, json: boolean, read: (content: string) => T | undefined): Promise<Attempt<T>> {
    const { url, key } = vendorOf(model)
    const started = performance.now()
    let result: Attempt<T> = { outcome: 'failed', tokensIn: 0, tokensOut: 0, ms: 0 }
    let cachedTokensIn = 0
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        // The fixed system prompt comes first, so the automatic cache of each vendor applies.
        body: JSON.stringify({ model, messages: [{ role: 'system', content: call.system }, ...call.messages], ...(json && { response_format: { type: 'json_object' } }) }),
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (res.ok) {
        const body = completion.safeParse(await res.json())
        const usage = body.success ? body.data.usage : null
        cachedTokensIn = usage?.prompt_cache_hit_tokens ?? usage?.prompt_tokens_details?.cached_tokens ?? 0
        const value = body.success ? read(body.data.choices[0]!.message.content ?? '') : undefined
        const counts = { tokensIn: usage?.prompt_tokens ?? 0, tokensOut: usage?.completion_tokens ?? 0 }
        result = value === undefined ? { outcome: 'invalid', ...counts, ms: 0 } : { outcome: 'ok', value, ...counts, ms: 0 }
      } else if (res.status !== 429 && res.status < 500) {
        // A 4xx other than 429 is our own error, for example a bad key: no fallback hides it (PD7).
        throw new Error(`${model} answered ${res.status}`)
      }
    } catch (err) {
      if (!(err instanceof Error && ['TimeoutError', 'TypeError'].includes(err.name))) throw err
    } finally {
      result.ms = Math.round(performance.now() - started)
      const record = {
        role: call.role, model, tokensIn: result.tokensIn, cachedTokensIn, tokensOut: result.tokensOut, ms: result.ms,
        fallback: model === fallback, outcome: result.outcome, session: call.session ?? null,
      }
      call.req.server.analytics.track(call.req, { name: 'model_called', ...record })
      call.req.log.info(record, 'model call')
    }
    return result
  }

  async function run<T>(call: ModelCall, json: boolean, read: (content: string) => T | undefined) {
    const first = await attempt(call, primary, json, read)
    const second = first.outcome === 'invalid' ? await attempt(call, primary, json, read) : first
    const last = second.outcome === 'ok' ? second : await attempt(call, fallback, json, read)
    if (last.outcome === 'ok') return last.value
    const err = new ModelUnavailable(`No model answered the ${call.role}`)
    reportError(err, { where: `models.${call.role}`, userId: call.req.user?.id, log: call.req.log })
    throw err
  }

  return {
    /** The answer in the JSON mode of the vendor, parsed with `schema`. */
    json: <S extends z.ZodType>(call: ModelCall & { schema: S }) => run(call, true, (content): z.infer<S> | undefined => {
      try {
        const parsed = call.schema.safeParse(JSON.parse(content))
        return parsed.success ? parsed.data : undefined
      } catch {
        return undefined
      }
    }),
    text: (call: ModelCall) => run(call, false, (content) => content.trim() || undefined),
    /** One short prompt to each model, with no fallback: the live check of the keys. */
    check: (req: FastifyRequest) => Promise.all([primary, fallback].map(async (model) => {
      const a = await attempt({ req, role: 'check', system: 'Answer with one word.', messages: [{ role: 'user', content: 'Say ok.' }] }, model, false, (c) => c.trim() || undefined)
      return { model, answered: a.outcome === 'ok', ms: a.ms, tokensIn: a.tokensIn, tokensOut: a.tokensOut }
    })),
  }
}
export type Models = ReturnType<typeof modelsOf>
