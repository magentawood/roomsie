'use client'

import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { AppShell, PageHeader } from '../shell/app-shell'
import { useAuth } from '../../lib/auth'
import { useMe } from '../../lib/queries'

type Props = { title: string; intro: string; backHref: string; children: ReactNode }

function Moderator({ title, intro, backHref, children }: Props) {
  const me = useMe()
  if (me.isPending) return <p className="p-5 text-sm text-tertiary">Loading…</p>
  if (!me.data?.moderator) notFound()
  return (
    <>
      <PageHeader title={title} backHref={backHref} />
      <main className="mx-auto flex w-full max-w-180 flex-1 flex-col gap-5 px-5 py-5 md:px-6 md:py-8">
        <p className="text-sm text-tertiary">{intro}</p>
        {children}
      </main>
    </>
  )
}

/** Moderators only. A guest and each other user see "not found", so the page does not show that it exists (T-19). */
export function ModeratorPage(props: Props) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (!user) notFound()
  return (
    <AppShell>
      <Moderator {...props} />
    </AppShell>
  )
}
