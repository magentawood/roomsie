import type { RealtimeMessageEvent } from '@roomsie/contract'

/** The only code that calls Supabase Realtime (ADR-0005: broadcast only). Each user has one private channel. */
export type Realtime = { send(userId: string, event: RealtimeMessageEvent): Promise<void> }

export const userChannel = (userId: string) => `user:${userId}`

export function supabaseRealtime({ url, serviceKey }: { url: string; serviceKey: string }): Realtime {
  return {
    async send(userId, { event, payload }) {
      const res = await fetch(new URL('/realtime/v1/api/broadcast', url), {
        method: 'POST',
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ topic: userChannel(userId), event, payload, private: true }] }),
      })
      if (!res.ok) throw new Error(`Realtime broadcast failed: ${res.status}`)
    },
  }
}

export const noRealtime: Realtime = { send: async () => {} }
