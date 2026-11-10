'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff, InfoCircle, Trash01 } from '@untitledui/icons'
import {
  budgetBands,
  childTypes, lifestyleAnswers, maxProfilePhotos, mustHaveKeys, profileResponse, profileTextLimits, profileUploadUrlResponse,
  type LifestyleAxis, type ProfileEditBody, type ProfileResponse,
} from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import {
  ages, bandOf, cardBannerState, describesYou, editBody, firstName, formOf, pickDescribesYou, profileLabels, profileSections, withMustHave, type ProfileForm,
} from '../../lib/profile-form'
import { queryKeys, useAreas } from '../../lib/queries'
import { PhotoPicker } from '../photos'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { DateInput, Field, Select, TextArea, TextInput } from '../ui/field'
import { CloseButton } from '../ui/modal'
import { Toggle } from '../ui/toggle'
import { VerifyRow } from '../verification/verify-row'
import { AlertSwitches } from './alert-switches'
import { AreaPicker } from './area-picker'
import { DeleteAccountDialog } from './delete-account-dialog'
import { LogOutRow } from './log-out-row'
import { ProfileHelp } from './profile-help'
import { ProfilePhoto } from './profile-photo'

const profileUpload = { path: '/v1/me/profile/upload-urls', reply: profileUploadUrlResponse }


export function Section({ title, helper, children }: { title: string; helper: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-0.5 border-b border-secondary pb-5 md:mb-2">
        <h2 className="text-md font-semibold text-primary">{title}</h2>
        <p className="text-sm text-tertiary">{helper}</p>
      </div>
      {children}
    </section>
  )
}

/** The closed banner of each profile, in this browser: the state that it told (`cardBannerState`). */
const closedBannerKey = (profileId: string) => `roomsie:card-banner-closed:${profileId}`

function CardBanner({ profile }: { profile: ProfileResponse }) {
  const state = cardBannerState(profile)
  // A save can change the state while the page is open, so each render compares the closed state with the state now.
  const [closedState, setClosedState] = useState(() => typeof localStorage === 'undefined' ? null : localStorage.getItem(closedBannerKey(profile.id)))
  // A new state forgets the close, so a return to the old state shows its banner again.
  useEffect(() => {
    if (closedState === null || closedState === state) return
    localStorage.removeItem(closedBannerKey(profile.id))
    setClosedState(null)
  }, [closedState, state, profile.id])
  const close = () => {
    localStorage.setItem(closedBannerKey(profile.id), state)
    setClosedState(state)
  }
  if (closedState === state) return null
  const [title, text, BannerIcon] = profile.hiddenForReview
    ? ['Hidden for review', 'Reports hid your card from others until a moderator reviews it.', EyeOff]
    : profile.visibility === 'live'
    ? profile.managedByParent
      ? [`${firstName(profile.fullName)}’s card is discoverable 🎉`, 'People looking for someone like them can find the card and say hi. You get the messages.', Eye]
      : ['You’re discoverable 🎉', 'People looking for someone like you can find you and say hi. Fuller profiles show up first.', Eye]
    : profile.visibility === 'hidden'
      ? ['Your card is hidden', 'People can’t find you in their results. Turn off “Hide my card” in the settings to show it again.', EyeOff]
      : ['Your card is not visible yet', 'Add these to show it:', InfoCircle]
  // The designs draw the stroke inside the box: 15 px of padding and the 1 px border are their 16. The close is 8 from the corner.
  return (
    <div role="status" className="relative flex items-start gap-4 rounded-xl border border-primary p-3.75">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${profile.visibility === 'live' && !profile.hiddenForReview ? 'bg-featured-success text-fg-success' : 'bg-secondary text-fg-quaternary'}`}><BannerIcon size={20} aria-hidden /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <p className="pr-8 font-semibold text-secondary">{title}</p>
        <p className="text-tertiary">{text}</p>
        {profile.visibility === 'draft' && !profile.hiddenForReview && <ul className="-mt-1 list-disc pl-5 text-tertiary">{profile.missing.map((m) => (
          <li key={m}>{m === 'whosMoving' && profile.managedByParent ? profileLabels.missingChildType : profileLabels.missing[m]}</li>
        ))}</ul>}
      </div>
      <span className="absolute top-1.75 right-1.75"><CloseButton onClose={close} /></span>
    </div>
  )
}

/** The card of the designs: the photo with its ring and the blue tick of a verified person, the name, and Help. On a phone, Help is under them. */
function Header({ profile }: { profile: ProfileResponse }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-secondary p-3 md:flex-row md:items-start md:gap-5">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-5">
        <ProfilePhoto url={profile.photos[0]?.url ?? null} fullName={profile.fullName} verified={profile.verified} />
        <div className="flex min-w-0 flex-col gap-1.5 font-medium md:gap-2">
          <p className="flex flex-wrap items-center gap-2 text-md text-primary md:text-xl">
            <span className="truncate">{profile.fullName}</span>
            {profile.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
          </p>
          <p className="text-sm text-secondary md:text-lg">{[profile.age && `${profile.age} years`, profile.jobRole].filter(Boolean).join(' • ')}</p>
        </div>
      </div>
      <div className="self-end md:self-start"><ProfileHelp /></div>
    </div>
  )
}

/** A photo saves at once, so a key never waits in R2 for a Save. */
function Photos({ profile, save }: { profile: ProfileResponse; save: (body: ProfileEditBody) => void }) {
  const keys = profile.photos.map((p) => p.key)
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      {keys.length < maxProfilePhotos && (
        <div className="md:grid md:w-79 md:shrink-0 md:border-r md:border-secondary md:pr-6">
          <PhotoPicker target={profileUpload} label="Click to upload" onUploaded={(key) => save({ photoKeys: [...keys, key] })} />
        </div>
      )}
      {/* No empty list: it would add the gap under the upload box. */}
      {keys.length > 0 && <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:flex md:gap-6">
        {profile.photos.map((p, i) => (
          <li key={p.key} className="flex flex-col items-center overflow-hidden rounded-xl border border-secondary md:w-31.5">
            <img src={p.url} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" />
            {/* The Delete row of the designs is 34 high: the 32 px button and 1 px above and below. */}
            <div className="py-px"><Button variant="tertiary" size="xs" iconLeading={Trash01} onClick={() => save({ photoKeys: keys.filter((k) => k !== p.key) })}>Delete</Button></div>
          </li>
        ))}
      </ul>}
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
  // The removal saves at once, and keeps the other unsaved changes of the page.
  const forget = useMutation({
    mutationFn: () => api(user, '/v1/me/profile', profileResponse, { method: 'PATCH', body: { religion: null, community: null } satisfies ProfileEditBody }),
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKeys.profile, saved)
      set({ religion: null, community: null })
    },
  })

  return (
    <div className="mx-auto flex w-full max-w-290 flex-col gap-8 px-5 pt-4 pb-5 md:px-6 md:pt-10 md:pb-4">
      {/* The phone designs keep the card 20 above the banner; the computer designs 32. */}
      <div className="flex flex-col gap-5 md:gap-8">
        <Header profile={profile} />
        <CardBanner profile={profile} />
      </div>

      <Section {...profileSections.basics}>
        <div className="grid gap-6 md:grid-cols-3">
          <TextInput size="xs" label="Full Name" required value={draft.fullName} onChange={(fullName) => set({ fullName: fullName ?? '' })} placeholder="eg. Divya Sharma" maxLength={profileTextLimits.fullName} />
          <Field label="Age" required>
            {(id) => (
              <Select id={id} size="xs" value={String(draft.age)} onChange={(age) => set({ age: Number(age) })}>
                {ages.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            )}
          </Field>
          <TextInput size="xs" label="Job Role" value={draft.jobRole} onChange={(jobRole) => set({ jobRole })} placeholder="eg. Product designer" maxLength={profileTextLimits.jobRole} />
        </div>
        <ChoiceChips label="Gender" required labels={profileLabels.gender} value={draft.gender} onChange={(gender) => gender && set({ gender })} />
        {/* The profile never asks religion or community (PD3c). A value that the person stated shows here, with its removal. */}
        {(profile.religion || profile.community) && (
          <div className="flex flex-col items-start gap-2 rounded-xl border border-secondary bg-secondary p-4 text-sm text-tertiary">
            <p><span className="font-medium text-secondary">You told us your religion or community.</span> It is never on your card. We use it only to match you with people who ask for it.</p>
            <Button variant="link-error" disabled={forget.isPending} onClick={() => forget.mutate()}>Remove it</Button>
            {forget.isError && <p role="alert" className="text-error-primary">{errorText(forget.error)}</p>}
          </div>
        )}
      </Section>

      <Section title={profileSections.photos.title} helper={profile.photos.length < maxProfilePhotos
        ? profileSections.photos.helper
        : `${maxProfilePhotos} of ${maxProfilePhotos} photos. Delete one to add another.`}>
        <Photos profile={profile} save={(body) => save.mutate(body)} />
      </Section>

      <Section {...profileSections.search}>
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
        <div className="grid gap-6">
          <Field label="Moving Date">
            {(id) => <DateInput id={id} size="xs" value={draft.moveDate} onChange={(moveDate) => set({ moveDate })} />}
          </Field>
          <TextInput size="xs" label="Commute Address" value={draft.commuteAddress} onChange={(commuteAddress) => set({ commuteAddress })} placeholder="Eg: Building A, Chandni chowk, Andheri…" maxLength={profileTextLimits.commuteAddress} />
        </div>
      </Section>

      <Section {...profileSections.lifestyle}>
        {(Object.keys(lifestyleAnswers) as LifestyleAxis[]).map((axis) => (
          <ChoiceChips key={axis} label={profileLabels.axes[axis]} labels={profileLabels.answers[axis] as Record<string, string>}
            value={draft.lifestyle[axis] ?? null} onChange={(answer) => set({ lifestyle: { ...draft.lifestyle, [axis]: answer } })} />
        ))}
      </Section>

      <Section {...profileSections.mustHaves}>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {/* Only a listing answers the walk to a station, so it is no must-have of other seekers. */}
          {mustHaveKeys.filter((key) => key !== 'near_station').map((key) => (
            <ChoiceChips key={key} label={profileLabels.mustHaves[key]} labels={profileLabels.weights}
              value={draft.mustHaves[key] ?? null} onChange={(weight) => set({ mustHaves: withMustHave(draft.mustHaves, key, weight) })} />
          ))}
        </div>
      </Section>

      <Section {...profileSections.thoughts}>
        <TextArea size="xs" label="What I want the others to know" value={draft.bio} onChange={(bio) => set({ bio })} placeholder="Say how you’d say it to a friend" maxLength={profileTextLimits.bio} />
      </Section>

      <Section {...profileSections.settings}>
        {/* The rows are 24 apart on a phone and 32 on a computer. */}
        <div className="flex flex-col gap-6 md:gap-8">
          <VerifyRow />
          <Toggle title="Hide my card" help="Your card stops showing in other people’s results." checked={draft.hidden} onChange={(hidden) => set({ hidden })} />
          <AlertSwitches />
          <LogOutRow />
          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <span className="flex flex-col gap-0.5"><span className="text-md font-medium text-primary">Delete Account</span><span className="text-sm text-tertiary">Delete your account.</span></span>
            <Button variant="secondary" size="sm" onClick={() => setDeleting(true)}>Delete my account</Button>
          </div>
        </div>
      </Section>

      <div className="-mt-2 flex flex-col items-end gap-2 border-t border-secondary pt-6 md:mt-2 md:-ml-6 md:pt-5">
        {save.isError && <p role="alert" className="text-sm text-error-primary">{errorText(save.error)}</p>}
        <Button variant="primary" size="lg" disabled={!Object.keys(changes).length || !draft.fullName.trim() || save.isPending} onClick={() => save.mutate(changes)}>Save</Button>
      </div>
      {deleting && <DeleteAccountDialog onClose={() => setDeleting(false)} />}
    </div>
  )
}

