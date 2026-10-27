'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { RealtimeClient } from '@supabase/realtime-js'
import { realtimeEvent } from '@roomsie/contract'
import { useAuth, useUser } from './auth'
import { addMessage, type MessagePages } from './messages'
import { LiveChannel, queryKeys, useRealtime } from './queries'

/** The only web code that talks to Supabase: the private channel of the user (T-44), for broadcasts only (ADR-0005). */
function Channel({ onLive }: { onLive: (live: boolean) => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const setup = useRealtime()

  useEffect(() => {
    if (!setup.data) return
    const { url, key, channel, mustRefreshIdToken } = setup.data
    // The first token after the API adds the claims must be a fresh one.
    let refresh = mustRefreshIdToken
    const client = new RealtimeClient(`${url.replace(/^http/, 'ws')}/realtime/v1`, {
      params: { apikey: key },
      accessToken: async () => { const token = await user.getIdToken(refresh); refresh = false; return token },
    })
    const onEvent = ({ event, payload }: { event: string; payload?: unknown }) => {
      const got = realtimeEvent.safeParse({ event, payload })
      if (!got.success) return
      if (got.data.event === 'request') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.requests('incoming') })
        return
      }
      const m = got.data.payload
      queryClient.setQueryData<MessagePages>(queryKeys.messages(m.conversationId), (data) => addMessage(data, m))
      // The last message, the unread count, and a new chat after an accept.
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests('outgoing') })
    }
    client.channel(channel, { config: { private: true } })
      .on('broadcast', { event: 'message' }, onEvent)
      .on('broadcast', { event: 'request' }, onEvent)
      .subscribe((status) => {
        const live = status === 'SUBSCRIBED'
        onLive(live)
        // The events from before the join are lost, so the messages data loads one more time.
        if (live) {
          for (const queryKey of [queryKeys.conversations, ['messages'], ['requests']]) void queryClient.invalidateQueries({ queryKey })
        }
      })
    return () => {
      onLive(false)
      void client.removeAllChannels().then(() => client.disconnect())
    }
  }, [setup.data, user, queryClient, onLive])

  return null
}

/** One channel for the visit of a signed-in user. Without it, the messages screens poll (lib/queries.ts). */
export function LiveMessages({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [live, setLive] = useState(false)
  return (
    <LiveChannel.Provider value={live && !!user}>
      {user && <Channel onLive={setLive} />}
      {children}
    </LiveChannel.Provider>
  )
}
