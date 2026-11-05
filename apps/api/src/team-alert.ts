import type { FastifyBaseLogger } from 'fastify'

export type TelegramSettings = { token: string; chatId: string } | null

/** A message to the team group in Telegram: the spend alerts (T-21) and the flips of the Gemini switch (T-65). Unset, it is a log line. */
export function teamAlertOf(telegram: TelegramSettings, log: FastifyBaseLogger) {
  return async (text: string) => {
    if (!telegram) return log.warn({ text }, 'team alert')
    const res = await fetch(`https://api.telegram.org/bot${telegram.token}/sendMessage`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: telegram.chatId, text }),
      // A slow Telegram must not hold the close of the server, which waits for the spend, or a flip of the switch.
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Telegram answered ${res.status}`)
  }
}
export type TeamAlert = ReturnType<typeof teamAlertOf>
