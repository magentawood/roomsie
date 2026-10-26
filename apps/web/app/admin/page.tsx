'use client'

import { notFound } from 'next/navigation'
import { ReportQueue } from '../../components/admin/report-queue'
import { AppShell, PageHeader } from '../../components/shell/app-shell'
import { useAuth } from '../../lib/auth'
import { useMe } from '../../lib/queries'

function Admin() {
  const me = useMe()
  if (me.isPending) return <p className="p-5 text-sm text-tertiary">Loading…</p>
  if (!me.data?.moderator) notFound()
  return (
    <>
      <PageHeader title="Reports" backHref="/" />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col gap-5 px-5 py-5 md:px-6 md:py-8">
        <p className="text-sm text-tertiary">Open reports. Safety reports come first, then the oldest.</p>
        <ReportQueue />
      </main>
    </>
  )
}

/** Moderators only. A guest and each other user see "not found", so the page does not show that it exists (T-19). */
export default function AdminPage() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (!user) notFound()
  return (
    <AppShell>
      <Admin />
    </AppShell>
  )
}
