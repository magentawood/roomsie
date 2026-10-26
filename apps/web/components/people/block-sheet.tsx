'use client'

import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { SlashCircle01 } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { noContent } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { queryKeys } from '../../lib/queries'
import type { PersonTarget } from '../reports/report-sheet'
import { Button } from '../ui/button'
import { Modal } from '../ui/modal'

/** A block hides the two people from each other. The other person is not told (T-19). */
export function BlockSheet({ target: { profileId, firstName: name }, onClose, onBlocked }: { target: PersonTarget; onClose: () => void; onBlocked: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  // ADR-0015: the id comes from the first tap, so a retry blocks one time.
  const id = useRef<string | null>(null)
  const block = useMutation({
    mutationFn: () => api(user, '/v1/blocks', noContent, { method: 'POST', body: { id: (id.current ??= uuidv7()), profileId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.saved('people') })
      void queryClient.invalidateQueries({ queryKey: queryKeys.saved('places') })
      queryClient.removeQueries({ queryKey: queryKeys.person(profileId) })
      onBlocked()
    },
  })
  return (
    <Modal icon={SlashCircle01} title={`Block ${name}?`} onClose={onClose}
      actions={(
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={block.isPending} onClick={() => block.mutate()}>Block</Button>
        </>
      )}>
      <p>You and {name} won’t see each other on roomsie anymore: not in results, profiles, listings or messages. {name} isn’t told.</p>
      {block.isError && <p role="alert" className="mt-2 text-error-primary">{errorText(block.error)}</p>}
    </Modal>
  )
}
