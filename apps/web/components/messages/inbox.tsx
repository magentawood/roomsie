'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { MessageCircle01, SearchLg, UserPlus01 } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { useMessagesPoll } from '../../lib/live'
import { inboxItems, inboxTime, type InboxItem } from '../../lib/messages'
import { firstName } from '../../lib/profile-form'
import { useConversations, useIncomingRequests, useOutgoingRequests } from '../../lib/queries'
import { AppShell, PageHeader } from '../shell/app-shell'
import { SignInGate } from '../shell/sign-in-gate'
import { Button } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import { inputClass } from '../ui/field'
import { Avatar, useChatName } from './parts'

function Row({ href, selected, children }: { href: string; selected: boolean; children: ReactNode }) {
  return (
    <li>
      <Link href={href} aria-current={selected ? 'page' : undefined}
        className={`flex items-center gap-3 px-4 py-3 outline-focus-ring focus-visible:outline-2 ${selected ? 'bg-secondary' : 'hover:bg-primary_hover'}`}>
        {children}
      </Link>
    </li>
  )
}

function ItemRow({ item, selected, query }: { item: InboxItem; selected: boolean; query: string }) {
  const other = item.kind === 'conversation' ? item.conversation.other : item.request.to
  const listingId = item.kind === 'conversation' ? item.conversation.listingId : item.request.listingId
  const { name } = useChatName(other, listingId)
  if (query && !name.toLowerCase().includes(query.toLowerCase())) return null
  const last = item.kind === 'conversation' ? item.conversation.lastMessage : null
  const preview = item.kind === 'sent'
    ? (item.request.state === 'open' ? `Request sent · Waiting for ${firstName(name)}` : 'Not available')
    : last ? `${last.mine ? 'You: ' : ''}${last.text}` : ''
  const unread = item.kind === 'conversation' && item.conversation.unread > 0
  return (
    <Row href={`/messages/${item.kind === 'conversation' ? item.conversation.id : item.request.id}`} selected={selected}>
      <Avatar photoUrl={other.photoUrl} name={other.deleted ? null : other.name} />
      <span className="flex min-w-0 flex-1 flex-col text-sm">
        <span className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium text-primary">{name}</span>
          {item.at && <span className="shrink-0 text-xs text-tertiary">{inboxTime(item.at)}</span>}
        </span>
        <span className="flex items-center gap-2">
          <span className={`min-w-0 flex-1 truncate ${unread ? 'font-medium text-secondary' : 'text-tertiary'}`}>{preview}</span>
          {unread && <span className="size-2 shrink-0 rounded-full bg-brand-solid" aria-label={`${item.conversation.unread} unread`} />}
        </span>
      </span>
    </Row>
  )
}

/** The list of chats, as section 04 of the drafts. `selected`: the open thread, or "requests". */
function Inbox({ selected }: { selected?: string }) {
  const poll = useMessagesPoll()
  const conversations = useConversations(poll)
  const outgoing = useOutgoingRequests(poll)
  const incoming = useIncomingRequests(poll)
  const [query, setQuery] = useState('')
  const failed = conversations.error ?? outgoing.error ?? incoming.error
  if (failed) return <p role="alert" className="p-4 text-sm text-error-primary">{errorText(failed)}</p>
  if (!conversations.data || !outgoing.data || !incoming.data) return <p className="p-4 text-sm text-tertiary">Loading…</p>
  const items = inboxItems(conversations.data.conversations, outgoing.data.requests)
  const requests = incoming.data.requests.length
  if (!items.length && !requests) {
    return (
      <EmptyState icon={MessageCircle01} title="No messages yet" action={<Button variant="primary" size="md" href="/">Start looking</Button>}>
        Say hi to a person or a lister. When they accept, your chat with them shows here.
      </EmptyState>
    )
  }
  return (
    <div className="flex flex-col">
      <div className="relative p-4">
        <SearchLg size={20} aria-hidden className="pointer-events-none absolute top-1/2 left-7.5 -translate-y-1/2 text-fg-quaternary" />
        <input type="search" aria-label="Search messages" className={`${inputClass} pl-10`} placeholder="Search messages" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <ul className="flex flex-col">
        {requests > 0 && (
          <Row href="/messages/requests" selected={selected === 'requests'}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-secondary text-fg-quaternary"><UserPlus01 size={20} aria-hidden /></span>
            <span className="flex min-w-0 flex-1 flex-col text-sm">
              <span className="font-medium text-primary">Requests</span>
              <span className="text-tertiary">{requests === 1 ? '1 person wants to say hi' : `${requests} people want to say hi`}</span>
            </span>
            <span className="rounded-full border border-badge-gray bg-badge-gray px-2 text-xs font-medium text-badge-gray">{requests}</span>
          </Row>
        )}
        {items.map((item) => {
          const id = item.kind === 'conversation' ? item.conversation.id : item.request.id
          return <ItemRow key={id} item={item} selected={selected === id} query={query.trim()} />
        })}
      </ul>
    </div>
  )
}

/** The messages screens: on a desktop the inbox stays beside the open thread; on a phone one screen shows at a time. */
export function MessagesFrame({ selected, children }: { selected?: string; children?: ReactNode }) {
  return (
    <SignInGate title="Sign in to see your messages" text="Your chats and the requests to you stay in your account.">
      <AppShell mobileNav={!selected}>
        <div className={`flex flex-col ${selected ? 'h-dvh' : 'flex-1 lg:h-dvh'}`}>
          <div className={selected ? 'hidden lg:block' : ''}><PageHeader title="Messages" backHref="/" inPhoneBar /></div>
          <div className="flex min-h-0 flex-1">
            <aside className={`${selected ? 'hidden lg:flex' : 'flex'} w-full shrink-0 flex-col overflow-y-auto border-secondary lg:w-90 lg:border-r`}>
              <Inbox selected={selected} />
            </aside>
            <section className={`${selected ? 'flex' : 'hidden lg:flex'} min-w-0 flex-1 flex-col`}>
              {children ?? <p className="m-auto text-sm text-tertiary">Pick a chat to read it.</p>}
            </section>
          </div>
        </div>
      </AppShell>
    </SignInGate>
  )
}
