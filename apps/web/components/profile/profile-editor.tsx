'use client'

import { useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, InfoCircle, Trash01 } from '@untitledui/icons'
import {
  childTypes, lifestyleAnswers, maxProfilePhotos, mustHaveKeys, profileResponse, profileTextLimits, profileUploadUrlResponse,
  type LifestyleAxis, type ProfileEditBody, type ProfileResponse,
} from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import {
  ages, bandOf, budgetBands, describesYou, editBody, firstName, formOf, pickDescribesYou, profileLabels, type ProfileForm,
} from '../../lib/profile-form'
import { initials } from '../../lib/person'
import { queryKeys, useAreas } from '../../lib/queries'
import { PhotoPicker } from '../photos'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { Field, TextArea, TextInput, inputClass } from '../ui/field'
import { Toggle } from '../ui/toggle'
import { VerifyRow } from '../verification/verify-row'
import { AlertSwitches } from './alert-switches'
import { AreaPicker } from './area-picker'
import { DeleteAccountDialog } from './delete-account-dialog'

const profileUpload = { path: '/v1/me/profile/upload-urls', reply: profileUploadUrlResponse }

export function Section({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="border-b border-secondary pb-4">
        <h2 className="text-md font-semibold text-primary">{title}</h2>
        <p className="text-sm text-tertiary">{helper}</p>
      </div>
      {children}
    </section>
  )
}

function CardBanner({ profile }: { profile: ProfileResponse }) {
  const [title, text, BannerIcon] = profile.hiddenForReview
    ? ['Hidden for review', 'Reports hid your card from others until a moderator reviews it.', EyeOff]
    : profile.visibility === 'live'
    ? profile.managedByParent
      ? [`${firstName(profile.fullName)}’s card is discoverable`, 'People looking for someone like them can find the card and say hi. You get the messages.', Eye]
      : ['You’re discoverable', 'People looking for someone like you can find you and say hi. Fuller profiles show up first.', Eye]
    : profile.visibility === 'hidden'
      ? ['Your card is hidden', 'People can’t find you in their results. Turn off “Hide my card” in the settings to show it again.', EyeOff]
      : ['Your card is not visible yet', 'Add these to show it:', InfoCircle]
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-secondary p-4">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${profile.visibility === 'live' && !profile.hiddenForReview ? 'bg-badge-success text-badge-success' : 'bg-secondary text-fg-quaternary'}`}><BannerIcon size={20} aria-hidden /></span>
      <div className="text-sm">
        <p className="font-semibold text-primary">{title}</p>
        <p className="text-tertiary">{text}</p>
        {profile.visibility === 'draft' && !profile.hiddenForReview && <ul className="mt-1 list-disc pl-5 text-tertiary">{profile.missing.map((m) => (
          <li key={m}>{m === 'whosMoving' && profile.managedByParent ? profileLabels.missingChildType : profileLabels.missing[m]}</li>
        ))}</ul>}
      </div>
    </div>
  )
}

function Header({ profile }: { profile: ProfileResponse }) {
  const photo = profile.photos[0]
  return (
    <div className="flex items-center gap-4 rounded-xl bg-secondary p-4 md:p-6">
      {photo
        ? <img src={photo.url} alt="" className="size-16 rounded-full object-cover md:size-20" />
        : <span className="flex size-16 items-center justify-center rounded-full bg-tertiary text-lg font-semibold text-tertiary md:size-20">{initials(profile.fullName)}</span>}
      <div className="flex min-w-0 flex-col">
        <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-primary">
          <span className="truncate">{profile.fullName}</span>
          {profile.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
        </p>
        <p className="text-md text-tertiary">{[profile.age && `${profile.age} years`, profile.jobRole].filter(Boolean).join(' • ')}</p>
      </div>
    </div>
  )
}

/** A photo saves at once, so a key never waits in R2 for a Save. */
function Photos({ profile, save }: { profile: ProfileResponse; save: (body: ProfileEditBody) => void }) {
  const keys = profile.photos.map((p) => p.key)
  return (
    <div className="flex flex-col gap-3 md:flex-row">
      {keys.length < maxProfilePhotos && (
        <div className="md:w-64 md:shrink-0 md:border-r md:border-secondary md:pr-3">
          <PhotoPicker target={profileUpload} label="Click to upload" onUploaded={(key) => save({ photoKeys: [...keys, key] })} />
        </div>
      )}
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {profile.photos.map((p, i) => (
          <li key={p.key} className="flex flex-col items-center gap-2 rounded-xl border border-secondary p-2">
            <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-md object-cover" />
            <Button variant="tertiary" size="xs" iconLeading={Trash01} onClick={() => save({ photoKeys: keys.filter((k) => k !== p.key) })}>Delete</Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProfileEditor({ profile }: { profile: ProfileResponse }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const areas = useAreas()
  const [draft, setDraft] = useState<ProfileForm>(() => formOf(profile))
  const [deleting, setDeleting] = useState(false)
  const set = (patch: Partial<ProfileForm>) => setDraft((d) => ({ ...d, ...patch }))
  const save = useMutation({
    mutationFn: (body: ProfileEditBody) => api(user, '/v1/me/profile', profileResponse, { method: 'PATCH', body }),
    onSuccess: (saved, body) => {
      queryClient.setQueryData(queryKeys.profile, saved)
      // A photo saves alone, so the other unsaved changes of the page stay.
      if (!('photoKeys' in body)) setDraft(formOf(saved))
    },
  })
  const changes = editBody(formOf(profile), draft)

  return (
    <div className="mx-auto flex w-full max-w-240 flex-col gap-8 px-5 py-5 md:px-6 md:py-8">
      <Header profile={profile} />
      <CardBanner profile={profile} />

      <Section title="The Basics" helper="Role only, never the company.">
        <div className="grid gap-5 md:grid-cols-3">
          <TextInput label="Full Name" required value={draft.fullName} onChange={(fullName) => set({ fullName: fullName ?? '' })} placeholder="eg. Divya Sharma" maxLength={profileTextLimits.fullName} />
          <Field label="Age" required>
            {(id) => (
              <select id={id} className={inputClass} value={draft.age} onChange={(e) => set({ age: Number(e.target.value) })}>
                {ages.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </Field>
          <TextInput label="Job Role" value={draft.jobRole} onChange={(jobRole) => set({ jobRole })} placeholder="eg. Product designer" maxLength={profileTextLimits.jobRole} />
        </div>
        <ChoiceChips label="Gender" required labels={profileLabels.gender} value={draft.gender} onChange={(gender) => gender && set({ gender })} />
      </Section>

      <Section title="Photos" helper={profile.photos.length < maxProfilePhotos
        ? `Two or more gets you far more replies. Up to ${maxProfilePhotos}.`
        : `${maxProfilePhotos} of ${maxProfilePhotos} photos. Delete one to add another.`}>
        <Photos profile={profile} save={(body) => save.mutate(body)} />
      </Section>

      <Section title="Your search" helper="Shown on your card so people can rule themselves in or out.">
        <ChoiceChips label="What best describes you?" labels={profileLabels.describesYou} value={describesYou(draft)}
          onChange={(choice) => choice && set(pickDescribesYou(choice, draft))} />
        {draft.managedByParent && (
          <>
            <ChoiceChips label="What does your son or daughter do?" required labels={profileLabels.childType}
              value={childTypes.find((c) => c === draft.whosMoving) ?? null}
              onChange={(whosMoving) => set({ whosMoving: whosMoving ?? 'unclear' })} />
            <p className="text-sm text-tertiary">You make the card for your son or daughter. They must be 18 or older. Their card shows “Managed by a parent”, and you send and get the messages.</p>
          </>
        )}
        <AreaPicker areas={areas.data?.areas ?? []} value={draft.areas} onChange={(picked) => set({ areas: picked })} />
        <ChoiceChips label="Budget" labels={profileLabels.budget} value={bandOf(draft.budgetMin, draft.budgetMax)}
          onChange={(id) => {
            const picked = budgetBands.find((b) => b.id === id)
            set({ budgetMin: picked?.min ?? null, budgetMax: picked?.max ?? null })
          }} />
        <div className="grid gap-5">
          <Field label="Moving Date">
            {(id) => <input id={id} type="date" className={inputClass} value={draft.moveDate ?? ''} onChange={(e) => set({ moveDate: e.target.value || null })} />}
          </Field>
          <TextInput label="Commute Address" value={draft.commuteAddress} onChange={(commuteAddress) => set({ commuteAddress })} placeholder="Eg: Building A, Chandni chowk, Andheri…" maxLength={profileTextLimits.commuteAddress} />
        </div>
      </Section>

      <Section title="What you are" helper="Facts about how you live. Other people’s must-haves check these.">
        {(Object.keys(lifestyleAnswers) as LifestyleAxis[]).map((axis) => (
          <ChoiceChips key={axis} label={profileLabels.axes[axis]} labels={profileLabels.answers[axis] as Record<string, string>}
            value={draft.lifestyle[axis] ?? null} onChange={(answer) => set({ lifestyle: { ...draft.lifestyle, [axis]: answer } })} />
        ))}
      </Section>

      <Section title="What you need from other seekers" helper="Choose Prefer or Dealbreaker. I hide anything that breaks a dealbreaker.">
        <div className="grid gap-5 md:grid-cols-3">
          {mustHaveKeys.map((key) => (
            <ChoiceChips key={key} label={profileLabels.mustHaves[key]} labels={profileLabels.weights}
              value={draft.mustHaves[key] ?? null} onChange={(weight) => set({ mustHaves: { ...draft.mustHaves, [key]: weight } })} />
          ))}
        </div>
      </Section>

      <Section title="Your thoughts" helper="Some info about you that you want others to see. This shows on your card.">
        <TextArea label="What I want the others to know" value={draft.bio} onChange={(bio) => set({ bio })} placeholder="Say how you’d say it to a friend" maxLength={profileTextLimits.bio} />
      </Section>

      <Section title="Settings" helper="Verification, card visibility, alerts and your account.">
        <VerifyRow />
        <Toggle title="Hide my card" help="Your card stops showing in other people’s results." checked={draft.hidden} onChange={(hidden) => set({ hidden })} />
        <AlertSwitches />
        <div className="flex items-start justify-between gap-4">
          <span className="flex flex-col"><span className="text-md font-medium text-primary">Delete Account</span><span className="text-sm text-tertiary">Delete your account.</span></span>
          <Button variant="secondary" size="sm" onClick={() => setDeleting(true)}>Delete my account</Button>
        </div>
      </Section>

      <div className="flex flex-col items-end gap-2 border-t border-secondary pt-5">
        {save.isError && <p role="alert" className="text-sm text-error-primary">{errorText(save.error)}</p>}
        <Button variant="primary" size="lg" disabled={!Object.keys(changes).length || !draft.fullName.trim() || save.isPending} onClick={() => save.mutate(changes)}>Save</Button>
      </div>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </div>
  )
}

