'use client'

import { useState } from 'react'
import { User01 } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useProfile } from '../../lib/queries'
import { CreateProfileDialog } from '../../components/profile/create-profile-dialog'
import { AlertSwitches } from '../../components/profile/alert-switches'
import { ProfileEditor, Section } from '../../components/profile/profile-editor'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { SignInGate } from '../../components/shell/sign-in-gate'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'

function Profile() {
  const profile = useProfile()
  const [creating, setCreating] = useState(true)
  if (profile.isError) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(profile.error)}</p>
  if (profile.isPending) return <p className="p-6 text-sm text-tertiary">Loading…</p>
  if (profile.data) return <ProfileEditor key={profile.data.id} profile={profile.data} />
  return (
    <main className="mx-auto flex w-full max-w-240 flex-col gap-8 px-5 py-5 md:px-6 md:py-8">
      <EmptyState icon={User01} title="Make your profile" action={<Button variant="primary" size="md" onClick={() => setCreating(true)}>Make my profile</Button>}>
        Your card lets people who look for a flatmate find you.
      </EmptyState>
      {/* A lister with no profile also gets requests (T-55). */}
      <Section title="Settings" helper="Alerts for your requests and messages. They work without a profile.">
        <AlertSwitches />
      </Section>
      {creating && <CreateProfileDialog onClose={() => setCreating(false)} />}
    </main>
  )
}

export default function ProfilePage() {
  return (
    <SignInGate title="Sign in to see your profile" text="Your profile is the card that other people see.">
      <AppShell>
        <PageHeader title="Profile and Settings" backHref="/" inPhoneBar />
        <Profile />
      </AppShell>
    </SignInGate>
  )
}
