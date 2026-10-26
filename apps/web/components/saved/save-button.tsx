'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck } from '@untitledui/icons'
import { z } from 'zod'
import { api } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useSavedIds, type SavedKind } from '../../lib/queries'
import { Button } from '../ui/button'

export function SaveButton({ kind, id }: { kind: SavedKind; id: string }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const saved = useSavedIds(kind).has(id)
  const toggle = useMutation({
    mutationFn: (save: boolean) => api(user, `/v1/saved/${kind}/${id}`, z.null(), { method: save ? 'PUT' : 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved(kind) }),
  })
  // While the request runs, the button already shows the new state.
  const shown = toggle.isPending ? toggle.variables : saved
  return (
    <Button variant="secondary" size="xs" iconTrailing={shown ? BookmarkCheck : Bookmark} pressed={shown}
      disabled={toggle.isPending} onClick={() => toggle.mutate(!saved)}>
      {shown ? 'Saved' : 'Save'}
    </Button>
  )
}
