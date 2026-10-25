'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Bookmark, ChevronLeft, Key01, MessageChatCircle, MessageCircle01, Plus, User01 } from '@untitledui/icons'
import { useAuth } from '../../lib/auth'
import { Button } from '../ui/button'
import { Logo } from './logo'

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

/** Items of screens that later tasks build. They show, but they do nothing yet. */
function NavItem({ icon: ItemIcon, label, href, active }: { icon: Icon; label: string; href?: string; active?: boolean }) {
  const classes = `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${active ? 'bg-secondary text-primary' : href ? 'text-secondary hover:bg-primary_hover' : 'text-quaternary'}`
  const content = (<><ItemIcon size={20} aria-hidden className="text-fg-quaternary" />{label}</>)
  return href ? <Link href={href} className={classes} aria-current={active ? 'page' : undefined}>{content}</Link>
    : <span className={classes} aria-disabled title="Coming soon">{content}</span>
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
          <NavItem icon={MessageCircle01} label="Messages" />
          <NavItem icon={Bookmark} label="Saved" />
          <NavItem icon={Key01} label="My listings" href="/listings" active />
        </nav>
        {user && (
          <div className="flex items-center gap-3 rounded-xl border border-secondary p-3">
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
              : <span className="flex size-10 items-center justify-center rounded-full bg-tertiary text-fg-quaternary"><User01 size={20} aria-hidden /></span>}
            <span className="flex min-w-0 flex-col text-sm">
              <span className="truncate font-semibold text-secondary">{user.displayName}</span>
              <span className="truncate text-tertiary">{user.email}</span>
            </span>
          </div>
        )}
      </div>
    </aside>
  )
}

/** The floating navigation of the phone designs. */
function MobileNav() {
  const item = (ItemIcon: Icon, label: string, href?: string, active?: boolean) => {
    const classes = `flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-1.5 text-xs font-medium ${active ? 'bg-tertiary text-primary' : href ? 'text-secondary' : 'text-quaternary'}`
    const content = (<><ItemIcon size={20} aria-hidden />{label}</>)
    return href ? <Link key={label} href={href} className={classes} aria-current={active ? 'page' : undefined}>{content}</Link>
      : <span key={label} className={classes} aria-disabled title="Coming soon">{content}</span>
  }
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-2 lg:hidden">
      <div className="flex flex-1 items-center rounded-full border border-secondary bg-primary p-1 shadow-sm">
        {item(MessageChatCircle, 'Chats')}
        {item(MessageCircle01, 'Messages')}
        {item(Key01, 'Listings', '/listings', true)}
        {item(User01, 'Profile')}
      </div>
      <span className="flex size-14 items-center justify-center rounded-full border border-secondary bg-primary text-quaternary shadow-sm" aria-disabled title="Coming soon">
        <Plus size={24} aria-hidden />
      </span>
    </nav>
  )
}

/** The signed-in frame: the sidebar on a desktop, the floating navigation on a phone unless the page has its own bar. */
export function AppShell({ children, mobileNav = true }: { children: ReactNode; mobileNav?: boolean }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className={`flex min-w-0 flex-1 flex-col ${mobileNav ? 'pb-24 lg:pb-0' : ''}`}>{children}</div>
      {mobileNav && <MobileNav />}
    </div>
  )
}

/** The title row of a page, with a back button. */
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center gap-3 border-b border-secondary px-5 py-4 md:px-6">
      <Button variant="secondary" size="xs" iconLeading={ChevronLeft} href={backHref} label="Back" />
      <h1 className="text-md font-medium text-primary">{title}</h1>
    </header>
  )
}

