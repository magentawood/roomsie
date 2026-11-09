'use client'

import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sameMoveLabels, sameMoveResponse, type GoalResponse, type SameMoveAnswer } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { goalHref } from '../../lib/goals'
import { queryKeys } from '../../lib/queries'
import { Button } from '../ui/button'

/**
 * The two answers of "Same move?" (Figma 67:6489). "Same move" opens the other goal with the message in it, and the new goal goes.
 * "No, it's a separate move" goes on here. A tap calls no model.
 */
export function SameMoveChips({ goalId, title }: { goalId: string; title: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const pick = useMutation({
    mutationFn: (answer: SameMoveAnswer) => chatApi(user, `/v1/goals/${goalId}/same-move`, sameMoveResponse, { method: 'POST', body: { answer } }),
    onSuccess: ({ goalId: id, turns, ...rest }) => {
      // A goal that this tab has read gets the new turns. A goal that it has not read loads with them.
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(id), (old) => old && { ...old, ...rest, turns: [...old.turns, ...turns] })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      if (id !== goalId) router.replace(goalHref(id))
    },
  })
  return (
    <div className="flex flex-col items-start gap-3">
      <div role="group" aria-label="Is this the same move?" className="flex flex-wrap gap-2">
        {/* A long title wraps on a phone. */}
        <Button variant="primary" size="xs" className="text-left whitespace-normal!" disabled={pick.isPending} onClick={() => pick.mutate('same')}>{sameMoveLabels.same(title)}</Button>
        <Button variant="secondary" size="xs" disabled={pick.isPending} onClick={() => pick.mutate('separate')}>{sameMoveLabels.separate}</Button>
      </div>
      {pick.error && <p role="alert" className="text-sm text-error-primary">{errorText(pick.error)}</p>}
    </div>
  )
}
