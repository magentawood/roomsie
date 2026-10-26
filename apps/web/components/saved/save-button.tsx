'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bookmark, BookmarkCheck } from '@untitledui/icons'
import { z } from 'zod'
import { api } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys, useSavedPeople, useSavedPlaces } from '../../lib/queries'
import { Button } from '../ui/button'

/** Save, and after a save "Saved". A second press unsaves (T-47). T-43 and T-18b put it on their detail screens. */
export function SaveButton({ kind, id }: { kind: 'places' | 'people'; id: string }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const places = useSavedPlaces()
  const people = useSavedPeople()
  const saved = kind === 'places'
    ? (places.data?.places ?? []).some((p) => p.listing.id === id)
    : (people.data?.people ?? []).some((p) => p.profileId === id)
  const toggle = useMutation({
    mutationFn: (save: boolean) => api(user, `/v1/saved/${kind}/${id}`, z.null(), { method: save ? 'PUT' : 'DELETE' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: kind === 'places' ? queryKeys.savedPlaces : queryKeys.savedPeople }),
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
