'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { genders, maxAge, minAge, profileResponse, profileTextLimits, type CreateProfileBody } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { profileLabels } from '../../lib/profile-form'
import { queryKeys, useProfile } from '../../lib/queries'
import { useTabFlag } from '../../lib/tab-flag'
import { Logo, markViewBox } from '../shell/logo'
import { Button } from '../ui/button'
import { Field, NumberInput, TextInput, inputClass } from '../ui/field'
import { CloseButton, ModalFrame } from '../ui/modal'

/** In the gate, each close hides the dialog for this visit of the browser tab. */
const skipKey = 'roomsie:skip-profile'

export function CreateProfileDialog({ onClose }: { onClose: () => void }) {
  const user = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState<string | null>(user.displayName)
  const [age, setAge] = useState<number | null>(null)
  const [gender, setGender] = useState<CreateProfileBody['gender'] | null>(null)
  const create = useMutation({
    mutationFn: (body: CreateProfileBody) => api(user, '/v1/me/profile', profileResponse, { method: 'POST', body }),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile)
      router.push('/profile')
    },
  })
  const [tried, setTried] = useState(false)
  const ageError = age === null ? 'Enter your age.'
    : age < minAge ? `You must be ${minAge} or older to use roomsie.`
    : age > maxAge ? `Enter an age of ${maxAge} or less.` : undefined
  const ready = fullName !== null && gender !== null
  return (
    <ModalFrame labelledBy="create-profile-title" onClose={onClose} place="middle">
      <form className="flex flex-col gap-4 px-4 pt-6 pb-4 sm:p-6" onSubmit={(e) => {
        e.preventDefault()
        setTried(true)
        if (ready && age !== null && !ageError) create.mutate({ fullName, age, gender })
      }}>
        <div className="mb-2 flex flex-col items-center gap-4 text-center">
          <Logo viewBox={markViewBox} className="size-10 text-primary" />
          <div>
            <h2 id="create-profile-title" className="text-md font-semibold text-primary">You’ve logged in!</h2>
            <p className="text-sm text-tertiary">Please review your basic details and complete your profile</p>
          </div>
        </div>
        <TextInput label="Full Name" required value={fullName} onChange={setFullName} placeholder="eg. Divya Sharma" maxLength={profileTextLimits.fullName} />
        <NumberInput label="Age" required value={age} onChange={setAge} placeholder="eg. 24" error={tried ? ageError : undefined} />
        <Field label="Email" required>{(id) => <input id={id} className={`${inputClass} disabled:text-placeholder`} value={user.email ?? ''} disabled />}</Field>
        <Field label="Gender" required>
          {(id) => (
            <select id={id} className={inputClass} value={gender ?? ''} onChange={(e) => setGender(genders.find((g) => g === e.target.value) ?? null)}>
              <option value="">Select</option>
              {genders.map((g) => <option key={g} value={g}>{profileLabels.gender[g]}</option>)}
            </select>
          )}
        </Field>
        {create.isError && <p role="alert" className="text-sm text-error-primary">{errorText(create.error)}</p>}
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="lg" type="submit" disabled={!ready || create.isPending}>Go to my profile</Button>
          <Button variant="secondary" size="lg" onClick={onClose}>Explore for now</Button>
        </div>
        {/* Last for the tab key, so the dialog opens with the focus on the name. The open dialog is fixed, so it places the button. */}
        <span className="absolute top-3 right-3 sm:top-4 sm:right-4"><CloseButton onClose={onClose} /></span>
      </form>
    </ModalFrame>
  )
}

export function CreateProfileGate() {
  const profile = useProfile()
  const pathname = usePathname()
  const [skipped, skip] = useTabFlag(skipKey)
  // The profile page offers the dialog itself.
  if (profile.data !== null || skipped || pathname === '/profile') return null
  return <CreateProfileDialog onClose={skip} />
}
