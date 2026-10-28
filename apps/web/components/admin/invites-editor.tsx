'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { LockUnlocked01 } from '@untitledui/icons'
import { noContent, type AdminInvites } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { fromIstInput, istDay, toIstInput } from '../../lib/invites'
import { queryKeys, useAdminInvites } from '../../lib/queries'
import { Button } from '../ui/button'
import { Field, inputClass, TextInput } from '../ui/field'
import { Modal } from '../ui/modal'
import { Toggle } from '../ui/toggle'

const card = 'flex flex-col gap-4 rounded-xl border border-secondary p-4 md:p-5'

/** One request for each change of the admin page. Each success loads the page again. */
function useChange<T>(send: (body: T) => Promise<unknown>, done?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      done?.()
      return queryClient.invalidateQueries({ queryKey: queryKeys.adminInvites })
    },
  })
}

/** The switch and the opening time. Turning the switch off asks first, because it opens roomsie to everyone. */
function Gate({ gate }: { gate: AdminInvites }) {
  const user = useUser()
  const [confirming, setConfirming] = useState(false)
  const [time, setTime] = useState<string | null>(null)
  const save = useChange((body: { inviteOnly: boolean; opensAt: string | null }) => api(user, '/v1/admin/invite-gate', noContent, { method: 'PUT', body }),
    () => { setConfirming(false); setTime(null) })
  const shown = time ?? toIstInput(gate.opensAt)
  return (
    <section className={card}>
      <Toggle title="Invite only" help="On: only invited emails and the moderators can sign in. Off: roomsie is open to everyone."
        checked={gate.inviteOnly} disabled={save.isPending}
        onChange={(on) => (on ? save.mutate({ inviteOnly: true, opensAt: gate.opensAt }) : setConfirming(true))} />
      <form className="flex items-center gap-3" onSubmit={(e) => { e.preventDefault(); save.mutate({ inviteOnly: gate.inviteOnly, opensAt: fromIstInput(shown) }) }}>
        <div className="flex-1">
          <Field label="Opens by itself on" hint="Time in IST. Empty: only the switch opens roomsie.">
            {(id) => <input id={id} type="datetime-local" className={inputClass} value={shown} onChange={(e) => setTime(e.target.value)} />}
          </Field>
        </div>
        <Button type="submit" variant="secondary" size="md" disabled={time === null || save.isPending}>Save</Button>
      </form>
      {save.isError && <p role="alert" className="text-sm text-error-primary">{errorText(save.error)}</p>}
      {confirming && (
        <Modal icon={LockUnlocked01} iconTone="neutral" title="Open roomsie to everyone?" onClose={() => setConfirming(false)}
          actions={
            <>
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setConfirming(false)}>Cancel</Button>
              <Button variant="primary" size="lg" className="flex-1" disabled={save.isPending} onClick={() => save.mutate({ inviteOnly: false, opensAt: gate.opensAt })}>Open roomsie</Button>
            </>
          }>
          Anyone with a Google account can sign in at once, and the opening time no longer matters. Turn Invite only on again to close it.
        </Modal>
      )}
    </section>
  )
}

function AddInvite() {
  const user = useUser()
  const [email, setEmail] = useState<string | null>(null)
  const add = useChange((body: { email: string }) => api(user, '/v1/admin/invites', noContent, { method: 'POST', body }), () => setEmail(null))
  return (
    <form className={`${card} md:flex-row md:items-end`} onSubmit={(e) => { e.preventDefault(); if (email) add.mutate({ email: email.trim() }) }}>
      <div className="flex-1">
        <TextInput label="Invite an email" value={email} onChange={setEmail} placeholder="name@example.com" maxLength={254} error={add.isError ? errorText(add.error) : undefined} />
      </div>
      <span><Button type="submit" variant="primary" size="md" disabled={!email || add.isPending}>Add</Button></span>
    </form>
  )
}

/** The invites of T-33: the gate, a form to add an email, and the invited emails. */
export function InvitesEditor() {
  const user = useUser()
  const invites = useAdminInvites()
  const remove = useChange((email: string) => api(user, '/v1/admin/invites', noContent, { method: 'DELETE', body: { email } }))
  if (invites.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(invites.error)}</p>
  if (invites.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  return (
    <>
      <Gate gate={invites.data} />
      <AddInvite />
      <section className={card}>
        <h2 className="text-sm font-semibold text-primary">{invites.data.invites.length} invited</h2>
        <ul className="flex flex-col gap-3">
          {invites.data.invites.map((invite) => (
            <li key={invite.email} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-primary">{invite.email}</span>
                <span className="text-sm text-tertiary">Added {istDay(invite.createdAt, 'short')}</span>
              </span>
              <Button variant="secondary" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(invite.email)}>Remove</Button>
            </li>
          ))}
        </ul>
        {remove.isError && <p role="alert" className="text-sm text-error-primary">{errorText(remove.error)}</p>}
      </section>
    </>
  )
}
