'use client'

import { notFound } from 'next/navigation'
import { ReportQueue } from '../../components/admin/report-queue'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { SignInGate } from '../../components/shell/sign-in-gate'
import { useMe } from '../../lib/queries'

/** Moderators only: each other user sees "not found" (T-19). */
function Admin() {
  const me = useMe()
  if (me.isPending) return <p className="p-5 text-sm text-tertiary">Loading…</p>
  if (!me.data?.moderator) notFound()
  return (
    <>
      <PageHeader title="Reports" backHref="/" />
      <main className="mx-auto flex w-full max-w-240 flex-1 flex-col gap-5 px-5 py-5 md:px-6 md:py-8">
        <p className="text-sm text-tertiary">Open reports. Safety reports come first, then the oldest.</p>
        <ReportQueue />
      </main>
    </>
  )
}

export default function AdminPage() {
  return (
    <SignInGate title="Sign in to review reports" text="Moderators review the reports here.">
      <AppShell>
        <Admin />
      </AppShell>
    </SignInGate>
  )
}
