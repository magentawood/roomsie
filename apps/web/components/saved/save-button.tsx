'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck } from '@untitledui/icons'
import { noContent, type SavedKind } from '@roomsie/contract'
import { api } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useSavedIds } from '../../lib/queries'
import { Button } from '../ui/button'

/** The saved state of one item, and its toggle. While the request runs, `shown` is already the new state. */
export function useSaved(kind: SavedKind, id: string) {
  const user = useUser()
  const queryClient = useQueryClient()
  const saved = useSavedIds(kind).has(id)
  const toggle = useMutation({
    mutationFn: (save: boolean) => api(user, `/v1/saved/${kind}/${id}`, noContent, { method: save ? 'PUT' : 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved(kind) }),
  })
  return { shown: toggle.isPending ? toggle.variables : saved, pending: toggle.isPending, toggle: () => toggle.mutate(!saved) }
}

export function SaveButton({ kind, id, className }: { kind: SavedKind; id: string; className?: string }) {
  const { shown, pending, toggle } = useSaved(kind, id)
  return (
    <Button variant="secondary" size="xs" iconTrailing={shown ? BookmarkCheck : Bookmark} pressed={shown}
      disabled={pending} onClick={toggle} className={className}>
      {shown ? 'Saved' : 'Save'}
    </Button>
  )
}
