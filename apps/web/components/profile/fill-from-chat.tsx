'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil01 } from '@untitledui/icons'
import { goalResponse, profileResponse, type ProfileEditBody } from '@roomsie/contract'
import { api, chatApi, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { chatFill, newestOpenGoal } from '../../lib/profile-form'
import { queryKeys, useGoals, useProfile } from '../../lib/queries'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'

/**
 * "Fill using our chat" of the profile header (91:6678, 94:22749): the answers of the open chat that the person used last go
 * into the profile after a confirm. The save rewrites those fields, and the page shows the saved profile again, so the
 * unsaved changes of the page go, as the confirm says. With no open chat, the button does not show.
 */
export function FillFromChat({ onFilled }: { onFilled: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const profile = useProfile()
  const newest = newestOpenGoal(useGoals().data?.goals ?? [])
  const goal = useQuery({
    queryKey: queryKeys.goal(newest?.id ?? ''),
    queryFn: () => chatApi(user, `/v1/goals/${newest!.id}`, goalResponse),
    enabled: Boolean(newest),
  })
  const [asking, setAsking] = useState(false)
  const fill = useMutation({
    mutationFn: (body: ProfileEditBody) => api(user, '/v1/me/profile', profileResponse, { method: 'PATCH', body }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.profile, saved)
      setAsking(false)
      onFilled()
    },
  })
  if (!profile.data || !newest) return null
  const changes = goal.data ? chatFill(goal.data.form, profile.data) : null
  const close = () => { setAsking(false); fill.reset() }
  return (
    <>
      <Button variant="secondary" size="sm" disabled={!changes} onClick={() => setAsking(true)}>Fill using our chat</Button>
      {asking && changes && (Object.keys(changes).length ? (
        <Modal icon={Pencil01} iconTone="neutral" title="Overwrite profile changes?" place="middle" onClose={close}
          actions={
            <>
              <Button variant="secondary" size="md" className="flex-1" onClick={close}>Cancel</Button>
              <Button variant="primary" size="md" className="flex-1" disabled={fill.isPending} onClick={() => fill.mutate(changes)}>Confirm</Button>
            </>
          }>
          Some fields of your profile will be rewritten based on our newer conversations. Shall we proceed?
          {fill.isError && <span role="alert" className="mt-2 block text-error-primary">{errorText(fill.error)}</span>}
        </Modal>
      ) : (
        <Modal icon={Pencil01} iconTone="neutral" title="Your profile is up to date" place="middle" onClose={close}
          actions={<Button variant="primary" size="md" className="flex-1" onClick={close}>OK</Button>}>
          Your newest chat has nothing that your profile does not have already.
        </Modal>
      ))}
    </>
  )
}
