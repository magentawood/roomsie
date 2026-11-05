'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { notFound, usePathname } from 'next/navigation'
import { ArrowLeft } from '@untitledui/icons'
import type { AdminRole, MeResponse } from '@roomsie/contract'
import { useAuth, useUser } from '../../lib/auth'
import { useMe } from '../../lib/queries'
import { Logo } from '../shell/logo'
import { Avatar } from '../ui/avatar'
import { tabClass } from '../ui/tabs'

type Tab = { label: string; href: string }

export const moderationTabs: Tab[] = [{ label: 'Reports', href: '/admin/reports' }, { label: 'Feedback', href: '/admin/feedback' }]
export const directoryTabs: Tab[] = [{ label: 'People', href: '/admin/people' }, { label: 'Listings', href: '/admin/listings' }]
export const aiTabs: Tab[] = [{ label: 'Overview', href: '/admin/ai' }, { label: 'Settings and log', href: '/admin/ai/log' }]
export const siteContentTabs: Tab[] = [
  { label: 'Invites', href: '/admin/invites' }, { label: 'Quotes', href: '/admin/quotes' }, { label: 'Site details', href: '/admin/site' },
]

const roleLabel = (me: MeResponse) => (me.moderator && me.reviewer ? 'Moderator and ID reviewer' : me.moderator ? 'Moderator' : 'ID reviewer')

function TopBar({ me, crumb }: { me: MeResponse; crumb?: string }) {
  const user = useUser()
  return (
    <header className="flex h-14 items-center gap-3 border-b border-secondary bg-primary px-4 md:h-16 md:px-8">
      <Link href="/admin" className="flex items-center gap-2.5 text-primary outline-focus-ring focus-visible:outline-2">
        <Logo className="h-6.5 w-auto" />
        <span className="text-sm font-semibold"><span className="hidden text-tertiary md:inline">/ </span>Admin</span>
      </Link>
      {crumb && <span className="hidden text-sm font-medium text-tertiary md:inline">/ {crumb}</span>}
      <span className="flex-1" />
      <Link href="/chat" className="hidden text-sm font-semibold text-secondary hover:text-primary md:inline">Back to roomsie</Link>
      <span className="flex items-center gap-2.5">
        <Avatar src={user.photoURL} size="sm" />
        <span className="hidden flex-col md:flex">
          <span className="text-sm font-semibold text-primary">{user.displayName}</span>
          <span className="text-xs text-tertiary">{roleLabel(me)}</span>
        </span>
      </span>
    </header>
  )
}

function RoleGate({ role, crumb, children }: { role?: AdminRole; crumb?: string; children: ReactNode }) {
  const me = useMe()
  if (me.isPending) return <p className="p-5 text-sm text-tertiary">Loading…</p>
  if (!me.data || !(role ? me.data[role] : me.data.moderator || me.data.reviewer)) notFound()
  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar me={me.data} crumb={crumb} />
      {children}
    </div>
  )
}

/** Each person without the role sees "not found", so the pages do not show (T-19, T-62). */
export function AdminFrame(props: { role?: AdminRole; crumb?: string; children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex min-h-dvh items-center justify-center text-sm text-tertiary">Loading…</div>
  if (!user) notFound()
  return <RoleGate {...props} />
}

/** The width and the padding of the body of an admin page. */
export const pageBody = 'mx-auto flex w-full max-w-320 flex-col gap-5 px-4 py-5 md:px-8 md:py-6 lg:px-20'

/** The header of a subject or of one item: the title, the intro and the tabs (drafts sections 37 and 38). A phone gets a link back to the admin; an item gets its own link back at each width. */
export function SubjectHeader({ title, intro, tabs, back }: { title: string; intro?: string; tabs?: Tab[]; back?: Tab }) {
  const path = usePathname()
  const link = back ?? { label: 'Admin', href: '/admin' }
  return (
    <div className="border-b border-secondary">
      <div className={`mx-auto flex w-full max-w-320 flex-col gap-1 px-4 pt-5 md:px-8 md:pt-8 lg:px-20 ${tabs ? '' : 'pb-5 md:pb-6'}`}>
        <Link href={link.href} className={`mb-1 inline-flex items-center gap-1 self-start text-sm font-semibold text-tertiary hover:text-primary ${back ? '' : 'md:hidden'}`}>
          <ArrowLeft size={16} aria-hidden />{link.label}
        </Link>
        <h1 className="text-display-xs font-semibold text-primary">{title}</h1>
        {intro && <p className="text-sm text-tertiary md:text-md">{intro}</p>}
        {tabs && (
          <nav aria-label={title} className="mt-4 flex gap-5">
            {tabs.map((tab) => (
              <Link key={tab.href} href={tab.href} aria-current={path === tab.href ? 'page' : undefined}
                className={tabClass(path === tab.href)}>
                {tab.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}

/** One subject of the admin: its header with tabs, then its page (drafts section 37). */
export function SubjectPage({ role, title, intro, tabs, children }: { role: AdminRole; title: string; intro: string; tabs?: Tab[]; children: ReactNode }) {
  return (
    <AdminFrame role={role} crumb={title}>
      <SubjectHeader title={title} intro={intro} tabs={tabs} />
      <main className={pageBody}>{children}</main>
    </AdminFrame>
  )
}
