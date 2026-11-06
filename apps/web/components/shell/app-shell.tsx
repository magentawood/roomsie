'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, Home05, Key01, MessageChatCircle, MessageCircle01, Plus, User02 } from '@untitledui/icons'
import { useAuth } from '../../lib/auth'
import { useMessagesBadge } from '../../lib/queries'
import { useTabFlag } from '../../lib/tab-flag'
import { Badge } from '../ui/badge'
import { Button, type Icon } from '../ui/button'
import { CompletionCard } from '../profile/completion-card'
import { CreateProfileGate } from '../profile/create-profile-dialog'
import { GoalList } from '../goals/goal-list'
import { newGoalHref, useChatsHref } from '../../lib/goals'
import { Avatar } from '../ui/avatar'
import { Logo } from './logo'
import { GoogleSignIn } from './google-sign-in'
import { SignInWall } from './sign-in-wall'

const navLooks = {
  sidebar: { item: 'gap-3 rounded-md px-3 py-2 text-sm', active: 'bg-secondary text-primary', link: 'text-secondary hover:bg-primary_hover', icon: 'text-fg-quaternary' },
  phone: { item: 'w-16.5 flex-col rounded-full py-1.5 text-[11px] leading-4.5 whitespace-nowrap', active: 'bg-quaternary text-primary', link: 'text-primary', icon: '' },
}
type NavLook = keyof typeof navLooks

/** A link of the shell. For a guest, a button that opens the sign-in wall in its place. */
type ShellLink = { href: string } | { onClick: () => void }
type LinkTo = (href: string) => ShellLink

/** `onClick`: also on a link, as the menu of "+" that closes on a pick. */
function LinkOrButton({ link, className, label, current, onClick, children }: { link: ShellLink; className: string; label?: string; current?: boolean; onClick?: () => void; children: ReactNode }) {
  if ('href' in link) return <Link href={link.href} aria-label={label} aria-current={current ? 'page' : undefined} onClick={onClick} className={className}>{children}</Link>
  return <button type="button" aria-label={label} onClick={() => { onClick?.(); link.onClick() }} className={className}>{children}</button>
}

/** `match`: the start of the addresses of the item, when its link goes deeper. The phone bar fills the icon of the open tab, as the designs do. */
function NavItem({ icon: ItemIcon, label, look, count = 0, link, match }: { icon: Icon; label: string; look: NavLook; count?: number; link: ShellLink; match?: string }) {
  const pathname = usePathname()
  const active = pathname.startsWith(match ?? ('href' in link ? link.href : '\0'))
  const style = navLooks[look]
  const shown = count > 99 ? '99+' : String(count)
  const badge = count > 0 && (look === 'phone'
    ? <span className="absolute top-1.5 right-5 size-2 rounded-full bg-error-solid"><span className="sr-only">{shown} new</span></span>
    : <span className="ml-auto"><Badge tone="gray" dot={false}>{shown}</Badge></span>)
  return (
    <LinkOrButton link={link} current={active} className={`relative flex items-center font-medium ${style.item} ${active ? style.active : style.link}`}>
      <ItemIcon size={20} aria-hidden className={style.icon} {...(look === 'phone' && { strokeWidth: 1.5, fill: active ? 'currentColor' : 'none' })} />{label}{badge}
    </LinkOrButton>
  )
}

function MessagesCount({ look, icon }: { look: NavLook; icon: Icon }) {
  return <NavItem look={look} icon={icon} label="Messages" link={{ href: '/messages' }} count={useMessagesBadge()} />
}

/** The badge needs a signed-in user. */
function MessagesItem({ look, linkTo, icon = MessageCircle01 }: { look: NavLook; linkTo: LinkTo; icon?: Icon }) {
  return useAuth().user ? <MessagesCount look={look} icon={icon} /> : <NavItem look={look} icon={icon} label="Messages" link={linkTo('/messages')} />
}

function Sidebar({ linkTo, card }: { linkTo: LinkTo; card: ReactNode }) {
  const { user, loading } = useAuth()
  return (
    <aside className="sticky top-0 hidden h-dvh w-70 shrink-0 flex-col justify-between border-r border-secondary px-4 py-6 lg:flex">
      <div className="flex min-h-0 flex-1 flex-col gap-6 pb-6">
        <Link href="/chat" className="px-2 text-primary"><Logo className="h-6.5 w-auto" /></Link>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" iconLeading={Plus} {...linkTo('/listings/new')}>New Listing</Button>
          <Button variant="secondary" size="sm" iconLeading={Plus} {...linkTo(newGoalHref)}>New Goal</Button>
        </div>
        <GoalList />
      </div>
      <div className="flex flex-col gap-4">
        <nav className="flex flex-col gap-1">
          <MessagesItem look="sidebar" linkTo={linkTo} />
          <NavItem look="sidebar" icon={Key01} label="Listings" link={linkTo('/listings')} />
        </nav>
        {card}
        {user ? (
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-secondary p-3 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
            <Avatar src={user.photoURL} size="md" />
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

const glass = 'border border-secondary bg-primary/90 shadow-xs backdrop-blur-md'

/** "+" of the phone bar: a menu of a new goal and a new listing. The plus turns into a cross while the menu is open. */
function NewMenu({ linkTo }: { linkTo: LinkTo }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [open])
  const item = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2'
  return (
    <div ref={box} className="relative">
      {open && (
        <div id="new-menu" className={`absolute right-0 bottom-full mb-2 flex w-48 flex-col rounded-2xl p-1.5 ${glass}`}>
          <LinkOrButton link={linkTo(newGoalHref)} onClick={() => setOpen(false)} className={item}><MessageChatCircle size={20} aria-hidden />New goal</LinkOrButton>
          <LinkOrButton link={linkTo('/listings/new')} onClick={() => setOpen(false)} className={item}><Key01 size={20} aria-hidden />New listing</LinkOrButton>
        </div>
      )}
      <button type="button" aria-label={open ? 'Close the menu' : 'New goal or listing'} aria-expanded={open} aria-controls="new-menu" onClick={() => setOpen(!open)}
        className={`flex size-13.5 items-center justify-center rounded-full text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 ${glass}`}>
        <Plus size={20} aria-hidden className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  )
}

/** The floating glass bar of the phone designs. Chats is the chat of this visit, open to a guest (PD6b). */
function MobileNav({ linkTo }: { linkTo: LinkTo }) {
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 flex items-center justify-center gap-1.5 px-4 lg:hidden">
      <div className={`flex items-center rounded-full p-1 ${glass}`}>
        <NavItem look="phone" icon={Home05} label="Chats" link={{ href: useChatsHref() }} match="/chat" />
        <MessagesItem look="phone" linkTo={linkTo} icon={MessageChatCircle} />
        <NavItem look="phone" icon={Key01} label="Listings" link={linkTo('/listings')} />
        <NavItem look="phone" icon={User02} label="Profile" link={linkTo('/profile')} />
      </div>
      <NewMenu linkTo={linkTo} />
    </nav>
  )
}

/** A guest's links open the sign-in wall (PD6b). `fixed`: one screen high; the page scrolls inside. */
export function AppShell({ children, mobileNav = true, fixed }: { children: ReactNode; mobileNav?: boolean; fixed?: boolean }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const linkTo: LinkTo = (href) => (user ? { href } : { onClick: () => setPendingHref(href) })
  // One close hides the card in the sidebar and on the phone, for this visit of the tab.
  const [cardClosed, closeCard] = useTabFlag('roomsie:hide-completion')
  const card = (look: 'sidebar' | 'phone') => user && !cardClosed && <CompletionCard look={look} onClose={closeCard} />
  useEffect(() => {
    if (!user || !pendingHref) return
    setPendingHref(null)
    router.push(pendingHref)
  }, [user, pendingHref, router])
  return (
    <div className={`flex ${fixed ? 'h-dvh' : 'min-h-dvh'}`}>
      <Sidebar linkTo={linkTo} card={card('sidebar')} />
      <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${mobileNav && !fixed ? 'pb-24 lg:pb-0' : ''}`}>
        {card('phone')}
        {children}
      </div>
      {mobileNav && <MobileNav linkTo={linkTo} />}
      {user && <CreateProfileGate />}
      {pendingHref && !user && !loading && <SignInWall onClose={() => setPendingHref(null)} />}
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

