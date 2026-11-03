'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { ArrowLeft, ArrowRight, Home03, Key01, Lock01 } from '@untitledui/icons'
import { intentLabels, newGoalResponse, type GoalResponse } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { areaTree } from '../../lib/areas'
import { useAuth } from '../../lib/auth'
import { chatStorage, readStored, writeStored } from '../../lib/chat'
import { answered, progressOf, startOf, stepBeside, withoutAnswer, type Answers, type Step } from '../../lib/onboarding'
import { profileLabels } from '../../lib/profile-form'
import { queryKeys, useAreas } from '../../lib/queries'
import { GoogleMark, LegalLine } from '../shell/google-sign-in'
import { Button } from '../ui/button'
import { ChoiceCard, ChoiceChips } from '../ui/choice'
import { StepBar } from '../ui/step-bar'

/** Each step of the Product file: its words, its art, and the part of the art in the band of a phone, then on a computer. */
const screens: Record<Step, { title: string; text?: string; art: string; position: string }> = {
  purpose: { title: 'What brings you to Roomsie?', art: 'purpose', position: 'object-[50%_77%] lg:object-[33%_50%]' },
  whosMoving: { title: 'Who’s moving?', text: 'So I show you the right kind of places.', art: 'whos-moving', position: 'object-[50%_77%] lg:object-[68%_50%]' },
  intent: { title: 'What kind of place?', text: 'Pick one. You can add more later in the chat.', art: 'place-type', position: 'object-[50%_66%] lg:object-[68%_50%]' },
  budget: { title: 'Budget per month?', text: 'Your share of the rent.', art: 'budget', position: 'object-[50%_80%] lg:object-[50%_50%]' },
  area: { title: 'Where do you want to live?', text: 'Pick one for now. Or skip and I’ll look across Mumbai.', art: 'area', position: 'object-[50%_90%] lg:object-[87%_50%]' },
  signIn: { title: 'Sign in to continue', text: 'Unlimited chats and multiple goals, all synced up with your account.', art: 'sign-in', position: 'object-[50%_77%] lg:object-[87%_50%]' },
}

function Answer({ step, answers, onChange }: { step: Step; answers: Answers; onChange: (answers: Answers) => void }) {
  const groups = areaTree(useAreas().data?.areas ?? []).groups
  const pick = <K extends keyof Answers>(key: K) => (value: Answers[K] | null) => onChange({ ...answers, [key]: value ?? undefined })
  switch (step) {
    case 'purpose':
      return (
        <div role="radiogroup" aria-label={screens.purpose.title} className="flex flex-col gap-4 text-left">
          <ChoiceCard icon={Home03} title="I’m looking for a place" subtitle="A room, a flat, a PG, or people to live with" selected={answers.purpose === 'look'} onSelect={() => pick('purpose')('look')} />
          <ChoiceCard icon={Key01} title="I have a place to list" subtitle="A room in my flat, a whole flat, a PG, or a flat I broker" selected={answers.purpose === 'list'} onSelect={() => pick('purpose')('list')} />
        </div>
      )
    case 'whosMoving':
      return (
        <div className="flex flex-col gap-6">
          <ChoiceChips labelHidden label={screens.whosMoving.title} labels={profileLabels.describesYou} value={answers.whosMoving}
            onChange={(whosMoving) => onChange({ ...answers, whosMoving: whosMoving ?? undefined, childType: undefined })} />
          {answers.whosMoving === 'parent' && (
            <div className="flex flex-col gap-3">
              <p aria-hidden className="text-sm font-medium text-secondary">What does your son or daughter do?</p>
              <ChoiceChips labelHidden label="What does your son or daughter do?" labels={profileLabels.childType} value={answers.childType} onChange={pick('childType')} />
            </div>
          )}
        </div>
      )
    case 'intent':
      return <ChoiceChips labelHidden label={screens.intent.title} labels={intentLabels} value={answers.intent} onChange={pick('intent')} />
    case 'budget':
      return <ChoiceChips labelHidden label={screens.budget.title} labels={profileLabels.budget} value={answers.budget} onChange={pick('budget')} />
    case 'area':
      return <ChoiceChips labelHidden label={screens.area.title} labels={Object.fromEntries(groups.map((group) => [group.slug, group.name]))} value={answers.area} onChange={pick('area')} />
    case 'signIn':
      return null
  }
}

/** Flow 01 of the Product file: the first questions, then the sign-in, then the chat with the answers (T-48). */
export function Onboarding() {
  const { user, loading, signIn } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [hasChat, setHasChat] = useState<boolean>()
  const [step, setStep] = useState<Step>('purpose')
  const [answers, setAnswers] = useState<Answers>({})
  const [signInError, setSignInError] = useState<string | null>(null)
  // A person with a chat on this browser goes on with it. Local storage exists only in the browser.
  useEffect(() => {
    const stored = readStored(chatStorage.goal) !== null
    setHasChat(stored)
    if (stored) router.replace('/chat')
  }, [router])
  const start = useMutation({
    mutationFn: (asker: User | null) => chatApi(asker, '/v1/goals', newGoalResponse, { method: 'POST', body: startOf(answers) }),
    onSuccess: ({ visitorKey, ...goal }) => {
      if (visitorKey) writeStored(chatStorage.visitorKey, visitorKey)
      writeStored(chatStorage.goal, goal.id)
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(goal.id), goal)
      router.push('/chat')
    },
  })
  const finish = (asker: User | null) => (answers.purpose === 'list' ? router.push('/listings/new') : start.mutate(asker))
  const previous = stepBeside(step, -1, answers, user !== null)
  const goOn = (next: Answers) => {
    const after = stepBeside(step, 1, next, user !== null)
    setAnswers(next)
    if (after) setStep(after)
    else finish(user)
  }
  const google = () => {
    setSignInError(null)
    signIn().then((signedInUser) => { if (signedInUser) finish(signedInUser) }, (err: unknown) => setSignInError(errorText(err)))
  }
  const busy = start.isPending || start.isSuccess
  const error = signInError ?? (start.isError ? errorText(start.error) : null)
  const bar = progressOf(step, answers)
  const { title, text, art, position } = screens[step]

  if (loading || hasChat !== false) return <main className="min-h-dvh" aria-busy="true" />
  return (
    <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
      <div className="relative h-52 shrink-0 lg:sticky lg:top-0 lg:h-dvh lg:w-5/9 lg:[clip-path:polygon(0_0,94%_0,85%_30%,94%_59%,85%_100%,0_100%)]">
        <img src={`/onboarding/${art}.webp`} alt="" className={`size-full object-cover ${position}`} />
        <p className="absolute bottom-8 left-8 hidden text-sm text-primary_on-dark lg:block">© Roomsie 2026</p>
      </div>
      <main className="flex flex-1 flex-col gap-8 p-6 lg:px-20 lg:py-10">
        <div className="mx-auto h-1 w-full max-w-120">{bar !== null && <StepBar step={bar} total={4} countHidden />}</div>
        <div className="mx-auto flex w-full max-w-120 flex-1 flex-col gap-16 lg:my-auto lg:flex-none">
          <div className="flex flex-1 flex-col justify-center gap-8 text-center lg:flex-none">
            <div className="flex flex-col gap-3">
              <h1 className="text-display-sm font-semibold text-primary lg:text-display-md">{title}</h1>
              {text && <p className="text-md text-tertiary">{text}</p>}
            </div>
            {step === 'signIn' ? (
              <div className="flex flex-col items-center gap-4">
                <Button variant="secondary" size="lg" iconLeading={GoogleMark} className="w-full" disabled={busy} onClick={google}>Sign up with Google</Button>
                {/* A listing needs an account, so a lister has no guest login. */}
                {answers.purpose !== 'list' && <Button variant="tertiary" size="md" iconLeading={Lock01} disabled={busy} onClick={() => finish(null)}>Guest login</Button>}
                <LegalLine />
              </div>
            ) : <Answer step={step} answers={answers} onChange={setAnswers} />}
            {error && <p role="alert" className="text-sm text-error-primary">{error}</p>}
          </div>
          {step !== 'signIn' && (
            <div className="flex items-center justify-between gap-3">
              <Button variant="secondary" size="md" iconLeading={ArrowLeft} {...(previous ? { disabled: busy, onClick: () => setStep(previous) } : { href: '/' })}>Previous</Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="md" disabled={busy} onClick={() => goOn(withoutAnswer(step, answers))}>Skip</Button>
                <Button variant="primary" size="md" iconTrailing={ArrowRight} disabled={busy || !answered(step, answers)} onClick={() => goOn(answers)}>Next</Button>
              </div>
            </div>
          )}
        </div>
        <footer className="text-sm text-tertiary lg:hidden">© Roomsie 2026</footer>
      </main>
    </div>
  )
}
