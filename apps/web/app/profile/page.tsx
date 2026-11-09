'use client'

import { useState } from 'react'
import { User01 } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useProfile } from '../../lib/queries'
import { CreateProfileDialog } from '../../components/profile/create-profile-dialog'
import { AlertSwitches } from '../../components/profile/alert-switches'
import { LogOutRow } from '../../components/profile/log-out-row'
import { VerifyRow } from '../../components/verification/verify-row'
import { ProfileEditor, Section } from '../../components/profile/profile-editor'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { SignInGate } from '../../components/shell/sign-in-gate'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'
import { Loading } from '../../components/ui/loading'

function Profile() {
  const profile = useProfile()
  const [creating, setCreating] = useState(true)
  if (profile.isError) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(profile.error)}</p>
  if (profile.isPending) return <Loading mascot="starry" />
  if (profile.data) return <ProfileEditor key={profile.data.id} profile={profile.data} />
  return (
    <main className="mx-auto flex w-full max-w-290 flex-col gap-8 px-5 pt-4 pb-5 md:px-6 md:pt-10 md:pb-4">
      <EmptyState icon={User01} title="Make your profile" action={<Button variant="primary" size="md" onClick={() => setCreating(true)}>Make my profile</Button>}>
        Your card lets people who look for a flatmate find you.
      </EmptyState>
      {/* A lister with no profile also gets requests (T-55). */}
      <Section title="Settings" helper="Verification, alerts and your account. They work without a profile.">
        <div className="flex flex-col gap-6 md:gap-8">
          <VerifyRow />
          <AlertSwitches />
          <LogOutRow />
        </div>
      </Section>
      {creating && <CreateProfileDialog onClose={() => setCreating(false)} />}
    </main>
  )
}

export default function ProfilePage() {
  return (
    <SignInGate mascot="starry" title="Sign in to see your profile" text="Your profile is the card that other people see.">
      <AppShell>
        <PageHeader title="Profile and Settings" backHref="/" inPhoneBar />
        <Profile />
      </AppShell>
    </SignInGate>
  )
}
