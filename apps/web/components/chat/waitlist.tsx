'use client'

import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Mail01, MarkerPin01 } from '@untitledui/icons'
import { noContent, waitlistBody, waitlistPlace, waitlistPlaceNames, type WaitlistPlace } from '@roomsie/contract'
import { chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { joinedPlaces, placeOf, rememberJoin } from '../../lib/waitlist'
import { Button } from '../ui/button'
import { TapChip } from '../ui/choice'
import { Field, inputClass } from '../ui/field'
import { CloseButton } from '../ui/modal'

const nameOf = (place: WaitlistPlace) => waitlistPlaceNames[place].name
/** Examples of Mumbai areas, not a list of the open areas (drafts section 18). */
const mumbaiExamples = [['andheri-goregaon', 'Andheri–Goregaon'], ['bandra-santacruz', 'Bandra–Santacruz'], ['powai-vikhroli', 'Powai–Vikhroli']] as const
const emailError = 'Enter a valid email address'

/** One join of the waitlist from a chat, remembered by the browser (T-22b). */
function useJoin(goalId: string) {
  const { user } = useAuth()
  const [joined, setJoined] = useState(() => joinedPlaces(goalId))
  const join = useMutation({
    mutationFn: (body: { email: string; place: WaitlistPlace }) => chatApi(user, `/v1/goals/${goalId}/waitlist`, noContent, { method: 'POST', body }),
    onSuccess: (_, { place }) => {
      rememberJoin(goalId, place)
      setJoined(joinedPlaces(goalId))
    },
  })
  return { join, joined, email: user?.email ?? '' }
}

function EmailInput({ id, value, onChange, invalid }: { id?: string; value: string; onChange: (value: string) => void; invalid: boolean }) {
  return (
    <div className="relative flex-1">
      <Mail01 size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-quaternary" />
      <input id={id} type="email" autoComplete="email" placeholder="you@example.com" aria-label={id ? undefined : 'Email'} aria-invalid={invalid}
        value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} pl-10.5`} />
    </div>
  )
}

function Joined({ place }: { place: WaitlistPlace }) {
  return (
    <div role="status" className="flex flex-col gap-1">
      <h3 className="text-md font-semibold text-primary">You're on the {nameOf(place)} waitlist</h3>
      <p className="text-sm text-tertiary">We'll email you once, on the day {nameOf(place)} opens. Nothing else.</p>
    </div>
  )
}

/** The form of the waitlist screen: the email, and the area, which takes each waitlist place (T-22b). */
export function WaitlistForm({ goalId, place: chatPlace, footer }: { goalId: string; place: WaitlistPlace; footer?: ReactNode }) {
  const { join, joined, email: accountEmail } = useJoin(goalId)
  const [email, setEmail] = useState(accountEmail)
  const [area, setArea] = useState(nameOf(chatPlace))
  const [errors, setErrors] = useState<{ email?: string; area?: string }>({})
  const suggestions = useId()
  const typed = placeOf(area)
  const place = typed ?? chatPlace
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const checked = waitlistBody.shape.email.safeParse(email)
    const next = { email: checked.success ? undefined : emailError, area: typed ? undefined : 'Pick a place outside Mumbai from the list' }
    setErrors(next)
    if (checked.success && typed) join.mutate({ email: checked.data, place: typed })
  }
  return (
    <section aria-label="Waitlist" className="flex flex-col gap-5 rounded-xl border border-secondary bg-primary p-5 shadow-xs lg:p-6">
      {joined.includes(place) ? <Joined place={place} /> : (
        <>
          <div className="flex flex-col gap-1">
            <h3 className="text-md font-semibold text-primary">Join the {nameOf(place)} waitlist</h3>
            <p className="text-sm text-tertiary">We'll email you once, on the day {nameOf(place)} opens. Nothing else.</p>
          </div>
          <form noValidate onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Email" error={errors.email}>
              {(id) => <EmailInput id={id} value={email} onChange={setEmail} invalid={Boolean(errors.email)} />}
            </Field>
            <Field label="Area" hint="We took this from your chat. Change it if you need to." error={errors.area}>
              {(id) => (
                <div className="relative">
                  <MarkerPin01 size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-quaternary" />
                  <input id={id} list={suggestions} autoComplete="off" aria-invalid={Boolean(errors.area)} value={area} onChange={(e) => setArea(e.target.value)} className={`${inputClass} pl-10.5`} />
                  <datalist id={suggestions}>{waitlistPlace.options.map((slug) => <option key={slug} value={nameOf(slug)} />)}</datalist>
                </div>
              )}
            </Field>
            <Button type="submit" variant="primary" size="lg" className="w-full" disabled={join.isPending}>Join the waitlist</Button>
            {join.isError && <p role="alert" className="text-sm text-error-primary">{errorText(join.error)}</p>}
          </form>
        </>
      )}
      {footer}
    </section>
  )
}

/** "Look in Mumbai": a tap is the area chip of the chat (T-09). */
export function LookInMumbai({ onPick }: { onPick: (areaSlug: string) => void }) {
  return (
    <div role="group" aria-label="Look in Mumbai" className="flex flex-wrap items-center justify-center gap-2">
      <span className="text-sm text-tertiary">Look in Mumbai</span>
      {mumbaiExamples.map(([slug, name]) => <TapChip key={slug} label={name} onTap={() => onPick(slug)} />)}
    </div>
  )
}

/** The panel of a search with no Mumbai area (PD6c). */
export function WaitlistPanel({ goalId, place, onPick, onClose }: { goalId: string; place: WaitlistPlace; onPick: (areaSlug: string) => void; onClose: () => void }) {
  return (
    <section aria-label="Waitlist" className="flex min-h-0 flex-col bg-primary">
      <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4 lg:px-6">
        <h2 className="text-lg font-semibold text-primary">{nameOf(place)} is not open yet</h2>
        <CloseButton onClose={onClose} />
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-10 lg:px-14">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-secondary shadow-xs"><MarkerPin01 size={24} aria-hidden /></span>
          <div className="flex max-w-88 flex-col gap-1">
            <h3 className="text-md font-semibold text-primary">Roomsie isn't in {nameOf(place)} yet</h3>
            <p className="text-sm text-tertiary">Roomsie is only in Mumbai for now. Join the waitlist and you'll be the first to know when {nameOf(place)} opens.</p>
          </div>
        </div>
        <LookInMumbai onPick={onPick} />
        <WaitlistForm goalId={goalId} place={place} />
      </div>
    </section>
  )
}

/** One waitlist line above the results of a search with Mumbai and a place outside it (PD6c). */
export function WaitlistLine({ goalId, place, onClose }: { goalId: string; place: WaitlistPlace; onClose: () => void }) {
  const { join, joined, email: accountEmail } = useJoin(goalId)
  const [email, setEmail] = useState(accountEmail)
  const [error, setError] = useState<string>()
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const checked = waitlistBody.shape.email.safeParse(email)
    setError(checked.success ? undefined : emailError)
    if (checked.success) join.mutate({ email: checked.data, place })
  }
  return (
    <section aria-label="Waitlist" className="mb-5 flex flex-col gap-3 rounded-xl border border-secondary bg-secondary p-4">
      <div className="flex items-start gap-3">
        <MarkerPin01 size={20} aria-hidden className="mt-0.5 shrink-0 text-fg-secondary" />
        <p className="flex-1 text-sm font-medium text-secondary">
          {joined.includes(place) ? `You're on the ${nameOf(place)} waitlist.` : `Roomsie is only in Mumbai for now. Join the waitlist and we'll email you the day we open in ${nameOf(place)}.`}
        </p>
        <CloseButton onClose={onClose} />
      </div>
      {!joined.includes(place) && (
        <form noValidate onSubmit={submit} className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <EmailInput value={email} onChange={setEmail} invalid={Boolean(error)} />
            <Button type="submit" variant="primary" size="lg" disabled={join.isPending}>Join</Button>
          </div>
          {(error ?? (join.isError && errorText(join.error))) && <p role="alert" className="text-sm text-error-primary">{error ?? errorText(join.error)}</p>}
        </form>
      )}
    </section>
  )
}
