'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Bookmark, ChevronLeft, Key01, MessageCircle01, Plus, User01 } from '@untitledui/icons'
import { useAuth } from '../../lib/auth'
import { useMessagesBadge } from '../../lib/queries'
import { Badge } from '../ui/badge'
import { Button, type Icon } from '../ui/button'
import { CreateProfileGate } from '../profile/create-profile-dialog'
import { Logo } from './logo'
import { GoogleSignIn, SignInWall } from './sign-in-wall'

const navLooks = {
  sidebar: { item: 'gap-3 rounded-md px-3 py-2 text-sm', active: 'bg-secondary text-primary', link: 'text-secondary hover:bg-primary_hover', icon: 'text-fg-quaternary' },
  phone: { item: 'flex-1 flex-col gap-0.5 rounded-full px-1 py-1.5 text-xs whitespace-nowrap', active: 'bg-tertiary text-primary', link: 'text-secondary', icon: '' },
}

/** A link of the shell. For a guest, it opens the sign-in wall in its place. */
type Go = (href: string) => { href?: string; onClick?: () => void }

function NavItem({ icon: ItemIcon, label, href, onClick, look, count = 0 }: { icon: Icon; label: string; look: keyof typeof navLooks; count?: number } & ReturnType<Go>) {
  const pathname = usePathname()
  const active = !!href && pathname.startsWith(href)
  const style = navLooks[look]
  const classes = `relative flex items-center font-medium ${style.item} ${active ? style.active : style.link}`
  const badge = count > 0 && (
    <span className={look === 'phone' ? 'absolute top-0 right-1/4' : 'ml-auto'}><Badge tone="gray" dot={false}>{count > 99 ? '99+' : String(count)}</Badge></span>
  )
  const content = (<><ItemIcon size={20} aria-hidden className={style.icon} />{label}{badge}</>)
  if (href) return <Link href={href} className={classes} aria-current={active ? 'page' : undefined}>{content}</Link>
  return <button type="button" onClick={onClick} className={classes}>{content}</button>
}

function MessagesItem({ look }: { look: keyof typeof navLooks }) {
  return <NavItem look={look} icon={MessageCircle01} label="Messages" href="/messages" count={useMessagesBadge()} />
}

function Sidebar({ go }: { go: Go }) {
  const { user, loading } = useAuth()
  return (
    <aside className="sticky top-0 hidden h-dvh w-70 shrink-0 flex-col justify-between border-r border-secondary px-4 py-6 lg:flex">
      <div className="flex flex-col gap-6">
        <Link href="/chat" className="px-2 text-primary"><Logo className="h-6.5 w-auto" /></Link>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" iconLeading={Plus} {...go('/listings/new')}>New Listing</Button>
          <Button variant="secondary" size="sm" iconLeading={Plus} {...go('/chat')}>New Goal</Button>
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <nav className="flex flex-col gap-1">
          {user ? <MessagesItem look="sidebar" /> : <NavItem look="sidebar" icon={MessageCircle01} label="Messages" {...go('/messages')} />}
          <NavItem look="sidebar" icon={Bookmark} label="Saved" {...go('/saved')} />
          <NavItem look="sidebar" icon={Key01} label="My listings" {...go('/listings')} />
        </nav>
        {user ? (
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-secondary p-3 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
            {user.photoURL
              ? <img src={user.photoURL} alt="" className="size-10 rounded-full" referrerPolicy="no-referrer" />
              : <span className="flex size-10 items-center justify-center rounded-full bg-tertiary text-fg-quaternary"><User01 size={20} aria-hidden /></span>}
            <span className="flex min-w-0 flex-col text-sm">
              <span className="truncate font-semibold text-secondary">{user.displayName}</span>
              <span className="truncate text-tertiary">{user.email}</span>
            </span>
          </Link>
        ) : !loading && <GoogleSignIn />}
      </div>
    </aside>
  )
}

/** The floating navigation of the phone designs. The chat is the home screen, so it has no tab: "+" starts a new goal. */
function MobileNav({ go }: { go: Go }) {
  const { user } = useAuth()
  const plus = go('/chat')
  const plusClasses = 'flex size-14 items-center justify-center rounded-full bg-brand-solid text-primary_on-brand shadow-sm outline-focus-ring hover:bg-brand-solid_hover focus-visible:outline-2 focus-visible:outline-offset-2'
  const plusIcon = <Plus size={24} aria-hidden />
  return (
    <nav className="fixed inset-x-4 bottom-4 z-40 flex items-center gap-2 lg:hidden">
      <div className="flex flex-1 items-center rounded-full border border-secondary bg-primary p-1 shadow-sm">
        {user ? <MessagesItem look="phone" /> : <NavItem look="phone" icon={MessageCircle01} label="Messages" {...go('/messages')} />}
        <NavItem look="phone" icon={Bookmark} label="Saved" {...go('/saved')} />
        <NavItem look="phone" icon={Key01} label="My Listings" {...go('/listings')} />
        <NavItem look="phone" icon={User01} label="Profile" {...go('/profile')} />
      </div>
      {plus.href
        ? <Link href={plus.href} aria-label="New goal" className={plusClasses}>{plusIcon}</Link>
        : <button type="button" aria-label="New goal" onClick={plus.onClick} className={plusClasses}>{plusIcon}</button>}
    </nav>
  )
}

/**
 * The frame of the app: the sidebar on a desktop, the floating navigation on a phone unless the page has its own bar.
 * A guest gets the sign-in wall from each link of the frame (PD6b).
 * `fixed`: the page is one screen high and scrolls inside, as the chat. It keeps the space of the phone navigation itself.
 */
export function AppShell({ children, mobileNav = true, fixed }: { children: ReactNode; mobileNav?: boolean; fixed?: boolean }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  // The address that the guest tapped. The wall opens it after the sign-in.
  const [wall, setWall] = useState<string | null>(null)
  const go: Go = (href) => (user || loading ? { href } : { onClick: () => setWall(href) })
  return (
    <div className={`flex ${fixed ? 'h-dvh' : 'min-h-dvh'}`}>
      <Sidebar go={go} />
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${mobileNav && !fixed ? 'pb-24 lg:pb-0' : ''}`}>{children}</div>
      {mobileNav && <MobileNav go={go} />}
      {user && <CreateProfileGate />}
      {wall && <SignInWall onClose={() => setWall(null)} onSignedIn={() => { setWall(null); router.push(wall) }} />}
    </div>
  )
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

