'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { alertSettings } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { pushState, turnOffPush, turnOnPush, type PushState } from '../../lib/push'
import { queryKeys, useAlertSettings, useMe } from '../../lib/queries'
import { Toggle } from '../ui/toggle'

const pushProblems: Partial<Record<PushState, string>> = {
  blocked: 'Notifications are blocked for roomsie in this browser. Allow them in the site settings of the browser, then turn this on.',
  unsupported: 'This browser can’t show notifications. On an iPhone, add roomsie to the home screen first.',
}

/** "Email alerts" and "Push alerts" (T-55). Each tap saves at once, also with no profile. */
export function AlertSwitches() {
  const user = useUser()
  const me = useMe().data?.id
  const queryClient = useQueryClient()
  const settings = useAlertSettings()
  const email = useMutation({
    mutationFn: (on: boolean) => api(user, '/v1/me/alerts', alertSettings, { method: 'PUT', body: { emailAlerts: on } }),
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.alerts, saved),
  })
  // The state of this browser: its permission and its token. It needs no call to the API.
  const [push, setPush] = useState<PushState | null>(null)
  useEffect(() => {
    if (!me) return
    let current = true
    void pushState(me).then((state) => { if (current) setPush(state) })
    return () => { current = false }
  }, [me])
  const tapPush = useMutation({ mutationFn: (on: boolean) => (on ? turnOnPush(user, me!) : turnOffPush(user)), onSuccess: setPush })

  const emailError = email.error ?? settings.error
  return (
    <>
      <Toggle title="Email alerts" help="An email when someone messages you or replies." checked={email.isPending ? email.variables : settings.data?.emailAlerts ?? true}
        disabled={!settings.data || email.isPending} onChange={(on) => email.mutate(on)} problem={emailError && errorText(emailError)} />
      <Toggle title="Push alerts" help="A browser notification when someone messages you or replies." checked={push === 'on'}
        disabled={!push || push === 'unsupported' || tapPush.isPending} onChange={(on) => tapPush.mutate(on)}
        problem={tapPush.isError ? errorText(tapPush.error) : push && pushProblems[push]} />
    </>
  )
}
