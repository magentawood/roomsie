'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alertSettings } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { pushState, turnOffPush, turnOnPush, type PushState } from '../../lib/push'
import { queryKeys, useAlertSettings } from '../../lib/queries'
import { Toggle } from '../ui/toggle'

const pushProblems: Partial<Record<PushState, string>> = {
  blocked: 'Notifications are blocked for roomsie in this browser. Allow them in the site settings of the browser, then turn this on.',
  unsupported: 'This browser can’t show notifications. On an iPhone, add roomsie to the home screen first.',
}

/** "Email alerts" and "Push alerts" (T-55). Each tap saves at once, also with no profile. */
export function AlertSwitches() {
  const user = useUser()
  const queryClient = useQueryClient()
  const settings = useAlertSettings()
  const email = useMutation({
    mutationFn: (on: boolean) => api(user, '/v1/me/alerts', alertSettings, { method: 'PUT', body: { emailAlerts: on } }),
    onSuccess: (saved) => queryClient.setQueryData(queryKeys.alerts, saved),
  })
  const pushQuery = useQuery({ queryKey: queryKeys.push, queryFn: () => pushState(user) })
  const push = pushQuery.data
  const tapPush = useMutation({
    mutationFn: (on: boolean) => (on ? turnOnPush(user) : turnOffPush(user)),
    onSuccess: (state) => queryClient.setQueryData(queryKeys.push, state),
  })

  const emailError = email.error ?? settings.error
  return (
    <>
      <Toggle title="Email alerts" help="An email when someone messages you or replies." checked={email.isPending ? email.variables : settings.data?.emailAlerts ?? true}
        disabled={!settings.data || email.isPending} onChange={(on) => email.mutate(on)} problem={emailError && errorText(emailError)} />
      <Toggle title="Push alerts" help="A browser notification when someone messages you or replies." checked={push === 'on'}
        disabled={!push || push === 'unsupported' || tapPush.isPending} onChange={(on) => tapPush.mutate(on)}
        problem={tapPush.error || pushQuery.error ? errorText(tapPush.error ?? pushQuery.error) : push && pushProblems[push]} />
    </>
  )
}
