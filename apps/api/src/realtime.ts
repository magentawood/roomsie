/** The only code that calls Supabase Realtime (ADR-0005: broadcast only). Each user has one private channel. */
export type Realtime = { send(userId: string, event: string, payload: object): Promise<void> }

export const userChannel = (userId: string) => `user:${userId}`

export function supabaseRealtime({ url, serviceKey }: { url: string; serviceKey: string }): Realtime {
  return {
    async send(userId, event, payload) {
      const res = await fetch(`${url.replace(/\/$/, '')}/realtime/v1/api/broadcast`, {
        method: 'POST',
        headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ topic: userChannel(userId), event, payload, private: true }] }),
      })
      if (!res.ok) throw new Error(`Realtime broadcast failed: ${res.status}`)
    },
  }
}

/** For development with no Supabase: nothing is sent. */
export const noRealtime: Realtime = { send: async () => {} }
