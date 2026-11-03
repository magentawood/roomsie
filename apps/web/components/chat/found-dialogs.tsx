'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FaceFrown, FaceHappy, FaceNeutral, FaceSad, FaceSmile } from '@untitledui/icons'
import { noContent, type CloseAnswer, type FeedbackRating, type GoalResponse } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { deployRefusal } from '../../lib/goals'
import { queryKeys } from '../../lib/queries'
import { Button, type Icon } from '../ui/button'
import { Field, inputClass } from '../ui/field'
import { CloseButton, ModalFrame } from '../ui/modal'

const answers: Record<CloseAnswer, string> = { roomsie: 'On Roomsie', elsewhere: 'Somewhere else', dropped: 'None, I dropped the plan' }
/** The faces of the feedback pop-up, also on the admin list. */
export const faces: Record<FeedbackRating, { label: string; icon: Icon }> = {
  satisfied: { label: 'Satisfied', icon: FaceHappy },
  good: { label: 'Good', icon: FaceSmile },
  neutral: { label: 'Neutral', icon: FaceNeutral },
  bad: { label: 'Bad', icon: FaceFrown },
  unsatisfied: { label: 'Unsatisfied', icon: FaceSad },
}

const pick = 'rounded-xl border border-secondary outline-focus-ring has-checked:border-2 has-checked:border-brand has-focus-visible:outline-2 hover:bg-primary_hover'

function Frame({ titleId, art, title, text, wide, onClose, children }: {
  titleId: string; art: string; title: string; text: ReactNode; wide?: boolean; onClose: () => void; children: ReactNode
}) {
  return (
    <ModalFrame labelledBy={titleId} onClose={onClose} place={wide ? 'wideSheet' : 'sheet'}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <img src={art} alt="" className="size-29" />
          <CloseButton onClose={onClose} />
        </div>
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-md font-semibold text-primary">{title}</h2>
          <p className="text-sm text-tertiary">{text}</p>
        </div>
        {children}
      </div>
    </ModalFrame>
  )
}

/** "I found a place" closes the goal, then the feedback pop-up of flow 02 follows (T-50). Cancel and ✕ leave the goal open. */
export function FoundFlow({ goalId, title, onDone }: { goalId: string; title: string; onDone: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<'found' | 'feedback'>('found')
  const [answer, setAnswer] = useState<CloseAnswer | null>(null)
  const [rating, setRating] = useState<FeedbackRating | null>(null)
  const [text, setText] = useState('')
  const close = useMutation({
    mutationFn: (where: CloseAnswer) => chatApi(user, `/v1/goals/${goalId}/close`, noContent, { method: 'POST', body: { where } }),
    onSuccess: () => {
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(goalId), (old) => old && { ...old, status: 'closed' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals })
      setStep('feedback')
    },
  })
  const feedback = useMutation({
    mutationFn: (sent: FeedbackRating) => chatApi(user, `/v1/goals/${goalId}/feedback`, noContent, { method: 'POST', body: { rating: sent, text: text.trim() || null } }),
    onSuccess: onDone,
  })
  const failed = (err: Error | null) => err && <p role="alert" className="text-sm text-error-primary">{deployRefusal(err) ?? errorText(err)}</p>

  if (step === 'found') return (
    <Frame titleId="found-title" art="/landing/mascot-celebrating.webp" title="Yay! Where did you find it?" text={`This closes your current goal “${title}”.`} onClose={onDone}>
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Where did you find it?</legend>
        {(Object.keys(answers) as CloseAnswer[]).map((key) => (
          <label key={key} className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 text-sm font-medium text-secondary ${pick}`}>
            <input type="radio" name="found" value={key} checked={answer === key} onChange={() => setAnswer(key)} className="size-4 accent-current" />
            {answers[key]}
          </label>
        ))}
      </fieldset>
      {failed(close.error)}
      <div className="flex gap-3 pt-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button variant="primary" size="lg" className="flex-1" disabled={!answer || close.isPending} onClick={() => answer && close.mutate(answer)}>Confirm</Button>
      </div>
    </Frame>
  )
  return (
    <Frame titleId="feedback-title" art="/landing/mascot-love.webp" title="Feedback please!" wide onClose={onDone}
      text="Thank you for using Roomsie. We would love to hear how you feel and where we can improve.">
      <fieldset className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        <legend className="sr-only">How do you feel?</legend>
        {(Object.keys(faces) as FeedbackRating[]).map((key) => {
          const { label, icon: FaceIcon } = faces[key]
          return (
            <label key={key} className={`flex cursor-pointer flex-col items-center gap-3 px-2 py-4 text-sm text-secondary ${pick}`}>
              <input type="radio" name="feeling" value={key} checked={rating === key} onChange={() => setRating(key)} className="sr-only" />
              <span className="flex size-8 items-center justify-center rounded-md border border-primary text-fg-quaternary shadow-xs"><FaceIcon size={16} aria-hidden /></span>
              {label}
            </label>
          )
        })}
      </fieldset>
      <Field label="What do you feel?">
        {(id) => <textarea id={id} value={text} maxLength={2000} rows={4} placeholder="Enter a description" onChange={(e) => setText(e.target.value)} className={`resize-none ${inputClass}`} />}
      </Field>
      {failed(feedback.error)}
      <div className="flex gap-3 pt-3">
        <Button variant="secondary" size="lg" className="flex-1" onClick={onDone}>Cancel</Button>
        <Button variant="primary" size="lg" className="flex-1" disabled={!rating || feedback.isPending} onClick={() => rating && feedback.mutate(rating)}>Done</Button>
      </div>
    </Frame>
  )
}
