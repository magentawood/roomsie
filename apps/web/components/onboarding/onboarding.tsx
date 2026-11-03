'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { ArrowLeft, ArrowRight, Home03, Key01, Lock01 } from '@untitledui/icons'
import { intentLabels, newGoalResponse, type GoalResponse } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { chatStorage, readStored, writeStored } from '../../lib/chat'
import { firebaseAuth } from '../../lib/firebase'
import { answered, onboardingSteps, progressOf, skipped, startOf, type Answers, type Step } from '../../lib/onboarding'
import { profileLabels } from '../../lib/profile-form'
import { queryKeys, useAreas } from '../../lib/queries'
import { GoogleMark, LegalLine } from '../shell/google-sign-in'
import { Button } from '../ui/button'
import { ChoiceCard, ChoiceChips } from '../ui/choice'
import { StepBar } from '../ui/step-bar'

/** The art of each step, from the Product file. `x`: the part that a computer shows, `y`: the part of the banner of a phone. */
const art: Record<Step, { name: string; x: string; y: string }> = {
  purpose: { name: 'purpose', x: '33%', y: '77%' },
  whosMoving: { name: 'whos-moving', x: '68%', y: '77%' },
  intent: { name: 'place-type', x: '68%', y: '66%' },
  budget: { name: 'budget', x: '50%', y: '80%' },
  area: { name: 'area', x: '87%', y: '90%' },
  signIn: { name: 'sign-in', x: '87%', y: '77%' },
}

const copy: Record<Step, { title: string; text?: string }> = {
  purpose: { title: 'What brings you to Roomsie?' },
  whosMoving: { title: 'Who’s moving?', text: 'So I show you the right kind of places.' },
  intent: { title: 'What kind of place?', text: 'Pick one. You can add more later in the chat.' },
  budget: { title: 'Budget per month?', text: 'Your share of the rent.' },
  area: { title: 'Where do you want to live?', text: 'Pick one for now. Or skip and I’ll look across Mumbai.' },
  signIn: { title: 'Sign in to continue', text: 'Unlimited chats and multiple goals, all synced up with your account.' },
}

function Answer({ step, answers, onChange }: { step: Step; answers: Answers; onChange: (answers: Answers) => void }) {
  const areas = useAreas().data?.areas ?? []
  const areaLabels = Object.fromEntries(areas.filter((area) => !area.parent).map((group) => [group.slug, group.name]))
  const pick = <K extends keyof Answers>(key: K) => (value: Answers[K] | null) => onChange({ ...answers, [key]: value ?? undefined })
  switch (step) {
    case 'purpose':
      return (
        <div role="radiogroup" aria-label={copy.purpose.title} className="flex flex-col gap-4 text-left">
          <ChoiceCard icon={Home03} title="I’m looking for a place" subtitle="A room, a flat, a PG, or people to live with" selected={answers.purpose === 'look'} onSelect={() => pick('purpose')('look')} />
          <ChoiceCard icon={Key01} title="I have a place to list" subtitle="A room in my flat, a whole flat, a PG, or a flat I broker" selected={answers.purpose === 'list'} onSelect={() => pick('purpose')('list')} />
        </div>
      )
    case 'whosMoving':
      return (
        <div className="flex flex-col gap-6">
          <ChoiceChips labelHidden label={copy.whosMoving.title} labels={profileLabels.describesYou} value={answers.whosMoving}
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
      return <ChoiceChips labelHidden label={copy.intent.title} labels={intentLabels} value={answers.intent} onChange={pick('intent')} />
    case 'budget':
      return <ChoiceChips labelHidden label={copy.budget.title} labels={profileLabels.budget} value={answers.budget} onChange={pick('budget')} />
    case 'area':
      return <ChoiceChips labelHidden label={copy.area.title} labels={areaLabels} value={answers.area} onChange={pick('area')} />
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
    mutationFn: (asker: User | null) => {
      const body = startOf(answers)
      return chatApi(asker, '/v1/goals', newGoalResponse, { method: 'POST', ...(body && { body }) })
    },
    onSuccess: ({ visitorKey, ...goal }) => {
      if (visitorKey) writeStored(chatStorage.visitorKey, visitorKey)
      writeStored(chatStorage.goal, goal.id)
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(goal.id), goal)
      router.push('/chat')
    },
  })
  const finish = (asker: User | null) => (answers.purpose === 'list' ? router.push('/listings/new') : start.mutate(asker))
  const steps = onboardingSteps(answers, user !== null)
  const at = steps.indexOf(step)
  const previous = steps[at - 1]
  const goOn = (next: Answers) => {
    const after = onboardingSteps(next, user !== null)[at + 1]
    setAnswers(next)
    if (after) setStep(after)
    else finish(user)
  }
  const google = () => {
    setSignInError(null)
    // signIn also resolves when the person closes the popup, so only a signed-in person moves on.
    signIn().then(() => { const signedIn = firebaseAuth().currentUser; if (signedIn) finish(signedIn) }, (err: unknown) => setSignInError(errorText(err)))
  }
  const busy = start.isPending || start.isSuccess
  const error = signInError ?? (start.isError ? errorText(start.error) : null)
  const bar = progressOf(step, answers)
  const { title, text } = copy[step]

  if (loading || hasChat !== false) return <main className="min-h-dvh" aria-busy="true" />
  return (
    <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
      <div className="relative h-52 shrink-0 lg:sticky lg:top-0 lg:h-dvh lg:w-5/9 lg:[clip-path:polygon(0_0,94%_0,85%_30%,94%_59%,85%_100%,0_100%)]">
        <img src={`/onboarding/${art[step].name}.webp`} alt="" className="size-full object-cover object-[50%_var(--y)] lg:object-[var(--x)_50%]"
          style={{ '--x': art[step].x, '--y': art[step].y } as CSSProperties} />
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
              {/* Previous of the first step goes back to the home page. */}
              {previous
                ? <Button variant="secondary" size="md" iconLeading={ArrowLeft} disabled={busy} onClick={() => setStep(previous)}>Previous</Button>
                : <Button variant="secondary" size="md" iconLeading={ArrowLeft} href="/">Previous</Button>}
              <div className="flex gap-2">
                <Button variant="secondary" size="md" disabled={busy} onClick={() => goOn(skipped(step, answers))}>Skip</Button>
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
