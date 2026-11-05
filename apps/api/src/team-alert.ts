import type { FastifyBaseLogger } from 'fastify'
import type { SpendSettings } from './models/settings'

/** A message to the team group in Telegram: the spend alerts (T-21) and the flips of the Gemini switch (T-65). Unset, it is a log line. */
export function teamAlertOf(telegram: SpendSettings['telegram'], log: FastifyBaseLogger) {
  return async (text: string) => {
    if (!telegram) return log.warn({ text }, 'team alert')
    const res = await fetch(`https://api.telegram.org/bot${telegram.token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: telegram.chatId, text }),
      // The close of the server waits for the spend, so a slow Telegram must not hold it.
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Telegram answered ${res.status}`)
  }
}
export type TeamAlert = ReturnType<typeof teamAlertOf>
