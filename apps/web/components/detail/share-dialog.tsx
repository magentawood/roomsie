'use client'

import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Copy01, Share07 } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { message } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { shareText } from '../../lib/share'
import { siteUrl } from '../../lib/site'
import { useConversations } from '../../lib/queries'
import { Avatar } from '../messages/parts'
import { Button } from '../ui/button'
import { ModalFrame, ModalHead } from '../ui/modal'

/**
 * The Share modal of flow 02: the card goes as a message to each ticked conversation, or the link goes anywhere (T-50).
 * `onDone` gets the line to show after the modal closes, or null.
 */
export function ShareDialog({ title, path, onDone }: { title: string; path: string; onDone: (line: string | null) => void }) {
  const user = useUser()
  const conversations = (useConversations().data?.conversations ?? []).filter((c) => c.canSend)
  const [ticked, setTicked] = useState<string[]>([])
  const url = `${siteUrl}${path}`
  // One id for each conversation, so a retry after a failure stores each message once (ADR-0015).
  const ids = useRef<Record<string, string>>({})
  const send = useMutation({
    mutationFn: () => Promise.all(ticked.map((id) => api(user, `/v1/conversations/${id}/messages`, message, {
      method: 'POST', body: { id: (ids.current[id] ??= uuidv7()), text: shareText(title, path) },
    }))),
    onSuccess: () => onDone(`Shared with ${ticked.length} ${ticked.length === 1 ? 'person' : 'people'}`),
  })
  const copy = async () => {
    await navigator.clipboard.writeText(url)
    onDone('Link copied')
  }
  // A closed share sheet rejects, and that is no error.
  const shareLink = () => (navigator.share ? navigator.share({ title, url }).then(() => onDone(null), () => undefined) : copy())
  const toggle = (id: string) => setTicked(ticked.includes(id) ? ticked.filter((t) => t !== id) : [...ticked, id])

  return (
    <ModalFrame labelledBy="share-title" onClose={() => onDone(null)} place="sheet">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <ModalHead icon={Share07} iconTone="neutral" titleId="share-title" title={path.startsWith('/people/') ? 'Share the profile' : 'Share the listing'} onClose={() => onDone(null)}>
          {conversations.length
            ? 'Select and share with people you want, or copy the link to share externally. You can only share with people you have an accepted request with.'
            : 'Copy the link to share externally. You can share in Roomsie with people you have an accepted request with.'}
        </ModalHead>
        {conversations.length > 0 && (
          <ul aria-label="Your conversations" className="flex max-h-72 flex-col gap-3 overflow-y-auto">
            {conversations.map(({ id, other }) => (
              <li key={id}>
                <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-secondary">
                  <input type="checkbox" checked={ticked.includes(id)} onChange={() => toggle(id)} className="size-4 shrink-0 accent-current" />
                  <Avatar photoUrl={other.photoUrl} name={other.name} />
                  <span className="truncate">{other.name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {send.error && <p role="alert" className="text-sm text-error-primary">{errorText(send.error)}</p>}
      </div>
      <div className="flex gap-3 border-t border-secondary p-5 sm:px-6">
        <span className="flex flex-1 lg:hidden"><Button variant="secondary" size="lg" iconLeading={Share07} className="w-full" onClick={() => void shareLink()}>Share link</Button></span>
        <span className="hidden flex-1 lg:flex"><Button variant="secondary" size="lg" iconLeading={Copy01} className="w-full" onClick={() => void copy()}>Copy link</Button></span>
        {conversations.length > 0 && (
          <Button variant="primary" size="lg" className="flex-1" disabled={!ticked.length || send.isPending} onClick={() => send.mutate()}>Share</Button>
        )}
      </div>
    </ModalFrame>
  )
}
