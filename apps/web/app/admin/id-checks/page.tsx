'use client'

import { notFound } from 'next/navigation'
import { IdChecks } from '../../../components/admin/id-checks'
import { AppShell, PageHeader } from '../../../components/shell/app-shell'
import { useAuth } from '../../../lib/auth'
import { useMe } from '../../../lib/queries'

function Reviewer() {
  const me = useMe()
  if (me.isPending) return <p className="p-5 text-sm text-tertiary">Loading…</p>
  if (!me.data?.reviewer) notFound()
  return (
    <>
      <PageHeader title="ID checks" backHref="/" />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col gap-5 px-5 py-5 md:px-6 md:py-8">
        <p className="text-sm text-tertiary">Oldest first. Each photo link lasts 5 minutes, and each view goes in the audit log.</p>
        <IdChecks />
      </main>
    </>
  )
}

/** Reviewers only. A guest and each other user see "not found", so the page does not show that it exists (T-46). */
export default function IdChecksPage() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (!user) notFound()
  return (
    <AppShell>
      <Reviewer />
    </AppShell>
  )
}
