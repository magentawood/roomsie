import { vi } from 'vitest'
import type { FastifyRequest } from 'fastify'
import { analyticsEvent, type AnalyticsEvent, type RouterAnswer } from '@roomsie/contract'
import { composerPrompt } from '../src/assistant/handlers/composer/prompt'
import { observerIntro } from '../src/assistant/handlers/observer/prompt'
import { routerPrompt } from '../src/assistant/handlers/router/prompt'

export const deepseek = 'https://api.deepseek.com/chat/completions'
export const gemini = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
export const keys = { DEEPSEEK_API_KEY: 'deepseek-key', GEMINI_API_KEY: 'gemini-key' }

/** A reply that never comes: the call ends only when its signal aborts, as at a deadline. */
export const hang = Symbol('hang')
type Reply = Response | Promise<Response> | Error | typeof hang
type Replies = { deepseek?: Reply[]; gemini?: Reply[] }
type SentRequest = { url: string; body: Record<string, unknown>; authorization: string | null }

/** A vendor that is down. */
export const down = () => new Response('down', { status: 500 })

/** A sure label of the router for a message about the search: the label of a test that gives the router no replies. */
export const coreLabel = { kinds: ['filters'], band: 'core', register: { language: 'english', script: 'latin' }, danger: false, community: false, notes: false } satisfies Omit<RouterAnswer, 'version'>

/**
 * Each vendor answers with the next reply of its list. A reply that is an Error makes fetch throw it, as a timeout does.
 * The calls of the router get the replies of `router`, or `coreLabel` from DeepSeek when the test gives none.
 * The calls of the composer get the replies of `composer`, or fail when the test gives none, so the scripted reply goes out.
 * The calls of the observer get the replies of `observer`, or no notes from DeepSeek when the test gives none.
 * `requests` has the other calls, `requests.router`, `requests.composer` and `requests.observer` the calls of those handlers, and `requests.telegram` the alerts of the spend.
 */
export function fakeVendors(replies: Replies & { router?: Replies; composer?: Replies; observer?: Replies; telegram?: Response[] }) {
  const requests = Object.assign([] as SentRequest[], { router: [] as SentRequest[], composer: [] as SentRequest[], observer: [] as SentRequest[], telegram: [] as SentRequest[] })
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url.startsWith('https://api.telegram.org/')) {
      requests.telegram.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown>, authorization: null })
      return replies.telegram?.shift() ?? Response.json({ ok: true })
    }
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] }
    const system = body.messages[0]?.content
    const handler = system === routerPrompt ? 'router' : system === composerPrompt ? 'composer' : system?.startsWith(observerIntro) ? 'observer' : null
    ;(handler ? requests[handler] : requests).push({ url, body, authorization: new Headers(init.headers).get('authorization') })
    if (handler === 'router' && !replies.router) return scored(coreLabel)
    if (handler === 'observer' && !replies.observer) return scored({ notes: [] })
    if (handler === 'composer' && !replies.composer) return down()
    const lists = handler ? replies[handler] : replies
    const reply = (url === deepseek ? lists?.deepseek : lists?.gemini)?.shift()
    if (!reply) throw new Error(`no reply left for ${url}`)
    if (reply instanceof Error) throw reply
    if (reply === hang) return new Promise<Response>((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason)))
    return reply
  })
  return requests
}

/** A completion of the chat format of OpenAI. `tokens` gives the token probabilities, as DeepSeek does. */
export const answer = (content: string, usage: Record<string, unknown> = { prompt_tokens: 120, completion_tokens: 8, prompt_cache_hit_tokens: 100 }, tokens?: { token: string; logprob: number }[]) =>
  Response.json({ choices: [{ message: { role: 'assistant', content }, ...(tokens && { logprobs: { content: tokens } }) }], usage })

/**
 * A DeepSeek answer with one token for each character. Each value in `unsure` gets that probability on its first character,
 * so the probability of the value is that number.
 */
export function scored(fields: object, unsure: Record<string, number> = {}) {
  const content = JSON.stringify(fields)
  const tokens = [...content].map((token) => ({ token, logprob: 0 }))
  for (const [value, probability] of Object.entries(unsure)) tokens[content.indexOf(`"${value}"`) + 1]!.logprob = Math.log(probability)
  return answer(content, undefined, tokens)
}

/** The text that a model request sent after its system prompt. */
export const sentMessageOf = (request: SentRequest) => (request.body as { messages: { content: string }[] }).messages[1]!.content

/** A sure label of the router, with `fields` in place of those of `coreLabel`. */
export const routed = (fields: object, unsure?: Record<string, number>) => ({ router: { deepseek: [scored({ ...coreLabel, ...fields }, unsure)] } })
/** The extractor answer of the message "room chahiye", and the scripted reply around it. */
export const room = () => scored({ intent: 'room' })
export const roomAck = 'Got it: a room in a shared flat. Which areas of Mumbai work for you?'
export const intentQuestion = 'What are you looking for: a room in a shared flat, a PG, a whole flat, or flatmates to rent with?'

/** A request with a fake analytics, so a test reads the events that the module records. Each event must pass the strict schema, as in track(). */
export function fakeRequest({ geminiOnly = false } = {}) {
  const events: AnalyticsEvent[] = []
  const log = { info: vi.fn(), error: vi.fn() }
  const req = {
    server: { analytics: { track: (_req: unknown, event: AnalyticsEvent) => events.push(analyticsEvent.parse(event)) }, spend: { record: () => {} }, modelSwitch: { geminiOnly: async () => geminiOnly } },
    log, user: null,
  } as unknown as FastifyRequest
  return { req, events }
}
