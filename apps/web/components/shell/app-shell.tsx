'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { Bookmark, ChevronLeft, Key01, MessageCircle01, Plus, User01 } from '@untitledui/icons'
import { useAuth } from '../../lib/auth'
import { LiveMessages } from '../../lib/live'
import { useMessagesBadge } from '../../lib/queries'
import { Button, type Icon } from '../ui/button'
import { CreateProfileGate } from '../profile/create-profile-dialog'
import { Logo } from './logo'

const navLooks = {
  sidebar: { item: 'gap-3 rounded-md px-3 py-2 text-sm', active: 'bg-secondary text-primary', link: 'text-secondary hover:bg-primary_hover', icon: 'text-fg-quaternary' },
  phone: { item: 'flex-1 flex-col gap-0.5 rounded-full px-1 py-1.5 text-xs whitespace-nowrap', active: 'bg-tertiary text-primary', link: 'text-secondary', icon: '' },
}

function NavItem({ icon: ItemIcon, label, href, look, count = 0 }: { icon: Icon; label: string; href?: string; look: keyof typeof navLooks; count?: number }) {
  const pathname = usePathname()
  const active = !!href && pathname.startsWith(href)
  const style = navLooks[look]
  const classes = `relative flex items-center font-medium ${style.item} ${active ? style.active : href ? style.link : 'text-quaternary'}`
  const badge = count > 0 && (
    <span className={`rounded-full border border-badge-gray bg-badge-gray px-1.5 text-xs font-medium text-badge-gray ${look === 'phone' ? 'absolute top-0 right-1/4' : 'ml-auto'}`}>
      {count > 99 ? '99+' : count}
    </span>
  )
  const content = (<><ItemIcon size={20} aria-hidden className={style.icon} />{label}{badge}</>)
  if (href) return <Link href={href} className={classes} aria-current={active ? 'page' : undefined}>{content}</Link>
  // A screen that a later task builds: it shows, but it does nothing yet.
  return <span className={classes} aria-disabled title="Coming soon">{content}</span>
}

/** The badge counts the unread messages and the open requests to the user (T-45). */
function MessagesItem({ look }: { look: keyof typeof navLooks }) {
  return <NavItem look={look} icon={MessageCircle01} label="Messages" href="/messages" count={useMessagesBadge()} />
}

function Sidebar() {
  const { user } = useAuth()
  return (
    <aside className="sticky top-0 hidden h-dvh w-70 shrink-0 flex-col justify-between border-r border-secondary px-4 py-6 lg:flex">
      <div className="flex flex-col gap-6">
        <Link href="/" className="px-2 text-primary"><Logo className="h-6.5 w-auto" /></Link>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" iconLeading={Plus} href="/listings/new">New Listing</Button>
          <Button variant="secondary" size="sm" iconLeading={Plus} disabled>New Goal</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <nav className="flex flex-col gap-1">
          {user ? <MessagesItem look="sidebar" /> : <NavItem look="sidebar" icon={MessageCircle01} label="Messages" href="/messages" />}
          <NavItem look="sidebar" icon={Bookmark} label="Saved" href="/saved" />
          <NavItem look="sidebar" icon={Key01} label="My listings" href="/listings" />
        </nav>
        {user && (
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-secondary p-3 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
              : <span className="flex size-10 items-center justify-center rounded-full bg-tertiary text-fg-quaternary"><User01 size={20} aria-hidden /></span>}
            <span className="flex min-w-0 flex-col text-sm">
              <span className="truncate font-semibold text-secondary">{user.displayName}</span>
              <span className="truncate text-tertiary">{user.email}</span>
            </span>
          </Link>
        )}
      </div>
    </aside>
  )
}

/** The floating navigation of the phone designs. */
function MobileNav() {
  const { user } = useAuth()
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-2 lg:hidden">
      <div className="flex flex-1 items-center rounded-full border border-secondary bg-primary p-1 shadow-sm">
        {/* The chat is the home screen, so it has no tab. */}
        {user ? <MessagesItem look="phone" /> : <NavItem look="phone" icon={MessageCircle01} label="Messages" href="/messages" />}
        <NavItem look="phone" icon={Bookmark} label="Saved" href="/saved" />
        <NavItem look="phone" icon={Key01} label="My Listings" href="/listings" />
        <NavItem look="phone" icon={User01} label="Profile" href="/profile" />
      </div>
      <span className="flex size-14 items-center justify-center rounded-full border border-secondary bg-primary text-quaternary shadow-sm" aria-disabled title="Coming soon">
        <Plus size={24} aria-hidden />
      </span>
    </nav>
  )
}

/** The signed-in frame: the sidebar on a desktop, the floating navigation on a phone unless the page has its own bar. */
export function AppShell({ children, mobileNav = true }: { children: ReactNode; mobileNav?: boolean }) {
  const { user } = useAuth()
  const shell = (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className={`flex min-w-0 flex-1 flex-col ${mobileNav ? 'pb-24 lg:pb-0' : ''}`}>{children}</div>
      {mobileNav && <MobileNav />}
      <CreateProfileGate />
    </div>
  )
  return user ? <LiveMessages>{shell}</LiveMessages> : shell
}

/** `inPhoneBar`: the page is a tab of the phone bar, so phones show no back button. */
export function PageHeader({ title, backHref, inPhoneBar }: { title: string; backHref: string; inPhoneBar?: boolean }) {
  return (
    <header className="flex items-center gap-3 border-b border-secondary px-5 py-4 md:px-6">
      <span className={inPhoneBar ? 'hidden lg:inline-flex' : 'inline-flex'}>
        <Button variant="secondary" size="xs" iconLeading={ChevronLeft} href={backHref} label="Back" />
      </span>
      <h1 className="text-md font-medium text-primary">{title}</h1>
    </header>
  )
}

