'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { closeAnswer, closeGoalResponse, feedbackRatings, noContent, type CloseAnswer, type FeedbackRating, type GoalResponse } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { faces } from '../../lib/feedback'
import { queryKeys } from '../../lib/queries'
import { Button } from '../ui/button'
import { Field, inputClassOf } from '../ui/field'
import { ModalFrame, ModalHead } from '../ui/modal'

const answers: Record<CloseAnswer, string> = { roomsie: 'On Roomsie', elsewhere: 'Somewhere else', dropped: 'None, I dropped the plan' }

/** The radio cards of the designs: 16 in from the outer edge, also with the 2 px line of a picked card. */
const choiceBox = 'rounded-xl border border-secondary outline-focus-ring has-checked:border-2 has-checked:border-brand has-focus-visible:outline-2 hover:bg-primary_hover'

function Frame({ titleId, art, title, text, wide, onClose, children }: {
  titleId: string; art: string; title: string; text: string; wide?: boolean; onClose: () => void; children: ReactNode
}) {
  return (
    <ModalFrame labelledBy={titleId} onClose={onClose} place={wide ? 'wider' : 'wide'}>
      <div className="flex flex-col gap-5 px-4 pt-6 pb-4 sm:p-6">
        <ModalHead art={art} titleId={titleId} title={title} onClose={onClose}>{text}</ModalHead>
        {children}
      </div>
    </ModalFrame>
  )
}

/** "I found a place" closes the goal, then the feedback pop-up of flow 02 follows (T-50). On the first step, Cancel and ✕ leave the goal open. */
export function FoundFlow({ goalId, title, onDone }: { goalId: string; title: string; onDone: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'found' | 'feedback'>('found')
  const [answer, setAnswer] = useState<CloseAnswer | null>(null)
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [text, setText] = useState('')
  const close = useMutation({
    mutationFn: (where: CloseAnswer) => chatApi(user, `/v1/goals/${goalId}/close`, closeGoalResponse, { method: 'POST', body: { where } }),
    onSuccess: ({ askFeedback }) => {
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(goalId), (old) => old && { ...old, status: 'closed' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      // Only a goal with no feedback gets the pop-up, also after a reopen.
      if (askFeedback) setStep('feedback')
      else onDone()
    },
  })
  const feedback = useMutation({
    mutationFn: (sent: FeedbackRating) => chatApi(user, `/v1/goals/${goalId}/feedback`, noContent, { method: 'POST', body: { rating: sent, text: text.trim() || null } }),
    onSuccess: onDone,
  })
  const failed = (err: Error | null) => err && <p role="alert" className="text-sm text-error-primary">{errorText(err)}</p>

  if (step === 'found') return (
    <Frame titleId="found-title" art="/landing/mascot-celebrating.webp" title="Yay! Where did you find it?" text={`This closes your current goal “${title}”.`} onClose={onDone}>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Where did you find it?</legend>
        {closeAnswer.options.map((key) => (
          <label key={key} className={`flex cursor-pointer items-center gap-2 p-3.75 text-sm font-medium text-secondary has-checked:p-3.5 ${choiceBox}`}>
            <input type="radio" name="found" value={key} checked={answer === key} onChange={() => setAnswer(key)} className="size-4 accent-current" />
            {answers[key]}
          </label>
        ))}
      </fieldset>
      {failed(close.error)}
      {/* Stacked on a phone, Confirm on top (24 above); side by side from sm (32 above). */}
      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:pt-3">
        <Button variant="secondary" size="md" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button variant="primary" size="md" className="flex-1" disabled={!answer || close.isPending} onClick={() => answer && close.mutate(answer)}>Confirm</Button>
      </div>
    </Frame>
  )
  return (
    <Frame titleId="feedback-title" art="/landing/mascot-love.webp" title="Feedback please!" wide onClose={onDone}
      text="Thank you for using Roomsie. We would love to hear from you on how you feel and where we can improve.">
      {/* The faces and the text box sit 24 in on a phone (16 + 8), 16 apart, with 24 under the box. */}
      <div className="flex flex-col gap-4 px-2 pb-6 sm:px-0">
        <fieldset className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <legend className="sr-only">How do you feel?</legend>
          {feedbackRatings.map((key) => {
            const { label, icon: FaceIcon } = faces[key]
            return (
              <label key={key} className={`flex cursor-pointer flex-col items-center gap-3 px-2 py-3.75 text-sm text-secondary has-checked:py-3.5 ${choiceBox}`}>
                <input type="radio" name="feeling" value={key} checked={rating === key} onChange={() => setRating(key)} className="sr-only" />
                <span className="flex size-8 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs"><FaceIcon size={16} aria-hidden /></span>
                {label}
              </label>
            )
          })}
        </fieldset>
        <Field label="What do you feel?">
          {(id) => <textarea id={id} value={text} maxLength={2000} rows={4} placeholder="Enter a description" onChange={(e) => setText(e.target.value)} className={`h-23.5 resize-none py-2.75! ${inputClassOf('sm')}`} />}
        </Field>
      </div>
      {failed(feedback.error)}
      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:pt-3">
        <Button variant="secondary" size="md" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button variant="primary" size="md" className="flex-1" disabled={!rating || feedback.isPending} onClick={() => rating && feedback.mutate(rating)}>Done</Button>
      </div>
    </Frame>
  )
}
