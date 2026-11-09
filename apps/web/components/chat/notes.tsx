'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash01 } from '@untitledui/icons'
import { noContent, notesResponse, type NotesResponse } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { queryKeys } from '../../lib/queries'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'

type Note = NotesResponse['notes'][number]

/** The answer to "What do you know about me?": the current notes of the owner (T-36). */
export function NotesList() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const notes = useQuery({ queryKey: queryKeys.notes, queryFn: () => chatApi(user, '/v1/notes', notesResponse) })
  const [confirming, setConfirming] = useState<Note | null>(null)
  const remove = useMutation({
    mutationFn: (id: string) => chatApi(user, `/v1/notes/${id}`, noContent, { method: 'DELETE' }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<NotesResponse>(queryKeys.notes, (old) => old && { notes: old.notes.filter((note) => note.id !== id) })
      setConfirming(null)
    },
  })

  if (notes.isPending) return <p className="text-sm text-tertiary">Loading your notes…</p>
  if (notes.isError) return (
    <p role="alert" className="flex items-center gap-3 text-sm text-error-primary">
      Your notes did not load.
      <Button variant="secondary" size="sm" onClick={() => void notes.refetch()}>Try again</Button>
    </p>
  )
  if (!notes.data.notes.length) return <p className="text-sm text-tertiary">No notes now.</p>
  return (
    <>
      <ul aria-label="Your notes" className="flex flex-col gap-3">
        {notes.data.notes.map((note) => (
          <li key={note.id} className="flex items-start gap-3 rounded-xl border border-secondary p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="text-xs font-medium text-tertiary">{note.label}</p>
              <p className="text-sm font-medium text-primary">{note.value}</p>
              <p className="text-sm break-words text-tertiary">“{note.evidence}”</p>
            </div>
            <Button variant="tertiary" size="sm" iconLeading={Trash01} label={`Delete the note: ${note.value}`} onClick={() => { remove.reset(); setConfirming(note) }} />
          </li>
        ))}
      </ul>
      {confirming && (
        <Modal icon={Trash01} title="Delete this note?" onClose={() => setConfirming(null)}
          actions={(
            <>
              <Button variant="secondary" size="md" className="flex-1" onClick={() => setConfirming(null)}>Cancel</Button>
              <Button variant="destructive" size="md" className="flex-1" disabled={remove.isPending} onClick={() => remove.mutate(confirming.id)}>Delete</Button>
            </>
          )}>
          <p>“{confirming.value}” leaves your notes. Your messages stay in the chat.</p>
          {remove.isError && <p role="alert" className="mt-2 text-error-primary">{errorText(remove.error)}</p>}
        </Modal>
      )}
    </>
  )
}
