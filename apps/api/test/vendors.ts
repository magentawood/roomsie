import { vi } from 'vitest'
import type { FastifyRequest } from 'fastify'
import { analyticsEvent, type AnalyticsEvent, type RouterAnswer } from '@roomsie/contract'
import { routerPrompt } from '../src/assistant/handlers/router/prompt'

export const deepseek = 'https://api.deepseek.com/chat/completions'
export const gemini = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
export const keys = { DEEPSEEK_API_KEY: 'deepseek-key', GEMINI_API_KEY: 'gemini-key' }

type Reply = Response | Error
type Replies = { deepseek?: Reply[]; gemini?: Reply[] }
type SentRequest = { url: string; body: Record<string, unknown>; authorization: string | null }

/** A vendor that is down. */
export const down = () => new Response('down', { status: 500 })

/** A sure label of the router for a message about the search: the label of a test that gives the router no replies. */
export const coreLabel = { kinds: ['filters'], band: 'core', register: { language: 'english', script: 'latin' }, danger: false, community: false } satisfies Omit<RouterAnswer, 'version'>

/**
 * Each vendor answers with the next reply of its list. A reply that is an Error makes fetch throw it, as a timeout does.
 * The calls of the router get the replies of `router`, or `coreLabel` from DeepSeek when the test gives none.
 * `requests` has the other calls, `requests.router` the calls of the router, and `requests.telegram` the alerts of the spend.
 */
export function fakeVendors(replies: Replies & { router?: Replies; telegram?: Response[] }) {
  const requests = Object.assign([] as SentRequest[], { router: [] as SentRequest[], telegram: [] as SentRequest[] })
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    if (url.startsWith('https://api.telegram.org/')) {
      requests.telegram.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown>, authorization: null })
      return replies.telegram?.shift() ?? Response.json({ ok: true })
    }
    const body = JSON.parse(String(init.body)) as { messages: { content: string }[] }
    const isRouter = body.messages[0]?.content === routerPrompt
    ;(isRouter ? requests.router : requests).push({ url, body, authorization: new Headers(init.headers).get('authorization') })
    const lists = isRouter ? replies.router : replies
    const reply = isRouter && !lists ? scored(coreLabel) : (url === deepseek ? lists?.deepseek : lists?.gemini)?.shift()
    if (!reply) throw new Error(`no reply left for ${url}`)
    if (reply instanceof Error) throw reply
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

/** A request with a fake analytics, so a test reads the events that the module records. Each event must pass the strict schema, as in track(). */
export function fakeRequest() {
  const events: AnalyticsEvent[] = []
  const log = { info: vi.fn(), error: vi.fn() }
  const req = { server: { analytics: { track: (_req: unknown, event: AnalyticsEvent) => events.push(analyticsEvent.parse(event)) }, spend: { record: () => {} } }, log, user: null } as unknown as FastifyRequest
  return { req, events }
}
