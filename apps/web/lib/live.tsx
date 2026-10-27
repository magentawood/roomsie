'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { RealtimeClient } from '@supabase/realtime-js'
import { message, realtimeResponse } from '@roomsie/contract'
import { api } from './api'
import { useUser } from './auth'
import { addMessage, type MessagePages } from './messages'
import { queryKeys } from './queries'

const Live = createContext(false)

/** The only web code that talks to Supabase: the private channel of the user (T-44), for broadcasts only (ADR-0005). */
export function LiveMessages({ children }: { children: ReactNode }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [live, setLive] = useState(false)
  // A 503 means that Realtime is not set up yet. The screens then ask the API again, so there is no retry.
  const setup = useQuery({
    queryKey: ['realtime'], queryFn: () => api(user, '/v1/me/realtime', realtimeResponse, { method: 'POST' }), staleTime: Infinity, retry: false,
  })

  useEffect(() => {
    if (!setup.data) return
    const { url, key, channel, mustRefreshIdToken } = setup.data
    // The first token after the API adds the claims must be a fresh one.
    let refresh = mustRefreshIdToken
    const client = new RealtimeClient(`${url.replace(/^http/, 'ws')}/realtime/v1`, {
      params: { apikey: key },
      accessToken: async () => { const token = await user.getIdToken(refresh); refresh = false; return token },
    })
    client.channel(channel, { config: { private: true } })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const got = message.safeParse(payload)
        if (!got.success) return
        queryClient.setQueryData<MessagePages>(queryKeys.messages(got.data.conversationId), (data) => addMessage(data, got.data))
        // The last message, the unread count, and a new chat after an accept.
        void queryClient.invalidateQueries({ queryKey: queryKeys.conversations })
        void queryClient.invalidateQueries({ queryKey: queryKeys.requests('outgoing') })
      })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'))
    return () => {
      setLive(false)
      void client.removeAllChannels().then(() => client.disconnect())
    }
  }, [setup.data, user, queryClient])

  return <Live.Provider value={live}>{children}</Live.Provider>
}

const pollWhileDown = 30_000

/** The beat of a messages screen: none while the channel is live. */
export const useMessagesPoll = () => (useContext(Live) ? false : pollWhileDown)
