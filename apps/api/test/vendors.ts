import { vi } from 'vitest'

export const deepseek = 'https://api.deepseek.com/chat/completions'
export const gemini = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
export const keys = { DEEPSEEK_API_KEY: 'deepseek-key', GEMINI_API_KEY: 'gemini-key' }

/** Each vendor answers with the next reply of its list. A reply that is an Error makes fetch throw it, as a timeout does. */
export function fakeVendors(replies: { deepseek?: (Response | Error)[]; gemini?: (Response | Error)[] }) {
  const requests: { url: string; body: Record<string, unknown>; authorization: string | null }[] = []
  vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(init.body)), authorization: new Headers(init.headers).get('authorization') })
    const reply = (url === deepseek ? replies.deepseek : replies.gemini)?.shift()
    if (!reply) throw new Error(`no reply left for ${url}`)
    if (reply instanceof Error) throw reply
    return reply
  })
  return requests
}

/** A completion of the chat format of OpenAI. `tokens` gives the token probabilities, as DeepSeek does. */
export const answer = (content: string, usage: Record<string, unknown> = { prompt_tokens: 120, completion_tokens: 8, prompt_cache_hit_tokens: 100 }, tokens?: { token: string; logprob: number }[]) =>
  Response.json({ choices: [{ message: { role: 'assistant', content }, ...(tokens && { logprobs: { content: tokens } }) }], usage })
