'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, Flag01, Home02, Send01, User01 } from '@untitledui/icons'
import { uuidv7 } from 'uuidv7'
import { message, messageTextLimit, noContent, requestExpiryDays, type Conversation, type ConversationsResponse, type OtherPerson, type OutgoingRequest } from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { cacheMessage } from '../../lib/live'
import { cardLinks } from '../../lib/share'
import { clockTime, profileOf, removedHref, threadDays } from '../../lib/messages'
import { queryKeys, useMessages } from '../../lib/queries'
import { DetailMenu } from '../detail/parts'
import { ReportSheet } from '../reports/report-sheet'
import { Button } from '../ui/button'
import { Avatar, SafetyNotice, useChatName } from './parts'
import { Loading } from '../ui/loading'

function Header({ other, listingId, name, about, menu }: { other: OtherPerson; listingId: string | null; name: string; about: string | null; menu?: ReactNode }) {
  const profileId = profileOf(other)
  const view = profileId ? { href: `/people/${profileId}`, label: 'View profile' } : listingId ? { href: `/places/${listingId}`, label: 'View listing' } : null
  return (
    <header className="flex items-center gap-2 border-b border-secondary px-5 py-2 md:gap-3 md:px-6 md:py-4">
      <Link href="/messages" aria-label="Back to messages" className="-m-1 rounded-md p-1 text-fg-quaternary outline-focus-ring focus-visible:outline-2 lg:hidden"><ChevronLeft size={20} aria-hidden /></Link>
      <Avatar photoUrl={other.photoUrl} name={other.deleted ? null : other.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <h1 className="truncate text-md font-semibold text-primary">{name}</h1>
        {about && <p className="truncate text-tertiary">{about}</p>}
      </div>
      {view && <span className="hidden sm:inline-flex"><Button variant="secondary" size="sm" href={view.href}>{view.label}</Button></span>}
      {menu}
    </header>
  )
}

/** A shared card is a link of roomsie.in, and only such a link is tappable (T-50). */
function MessageText({ text }: { text: string }) {
  return cardLinks(text).map((part, i) => (typeof part === 'string' ? part
    : <Link key={i} href={part.href} className="rounded-sm underline outline-focus-ring focus-visible:outline-2">{part.text}</Link>))
}

function Bubble({ mine, name, at, children }: { mine: boolean; name: string; at: string; children: ReactNode }) {
  return (
    <div className={`flex max-w-72.5 flex-col gap-1.5 sm:max-w-90 ${mine ? 'self-end' : 'self-start'}`}>
      <p className="flex justify-between gap-3 text-xs text-tertiary"><span className="font-medium text-secondary">{mine ? 'You' : name}</span>{clockTime(at)}</p>
      <p className={`rounded-lg border border-secondary px-2.75 py-1.75 text-md wrap-anywhere whitespace-pre-line text-primary ${mine ? 'rounded-tr-none bg-primary' : 'rounded-tl-none bg-secondary'}`}>{children}</p>
    </div>
  )
}

function DayLine({ label }: { label: string }) {
  return <p className="flex items-center gap-3 text-xs text-tertiary before:flex-1 before:border-t before:border-secondary after:flex-1 after:border-t after:border-secondary">{label}</p>
}

/** The messages scroll from the bottom. The top line loads the page before when it comes into view. */
function Messages({ conversationId, name }: { conversationId: string; name: string }) {
  const messages = useMessages(conversationId)
  const top = useRef<HTMLDivElement>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = messages
  useEffect(() => {
    const line = top.current
    if (!line || !hasNextPage) return
    const seen = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting && !isFetchingNextPage) void fetchNextPage() })
    seen.observe(line)
    return () => seen.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])
  if (messages.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(messages.error)}</p>
  if (!messages.data) return <Loading mascot="chatting" />
  return (
    <>
      {/* No height, and no gap of the column: the notice and the first day line stay 16 px apart (drafts section 09). */}
      <div ref={top} className="-mt-4" />
      {isFetchingNextPage && <p className="text-center text-xs text-tertiary">Loading earlier messages…</p>}
      {threadDays(messages.data.pages.flatMap((p) => p.messages)).map((day) => (
        <div key={day.label} className="flex flex-col gap-4">
          <DayLine label={day.label} />
          {day.messages.map((m) => <Bubble key={m.id} mine={m.mine} name={name} at={m.createdAt}><MessageText text={m.text} /></Bubble>)}
        </div>
      ))}
    </>
  )
}

function Composer({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const user = useUser()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  // ADR-0015: the id comes from the first try, so a retry stores one message.
  const id = useRef<string | null>(null)
  const send = useMutation({
    mutationFn: () => api(user, `/v1/conversations/${conversationId}/messages`, message, { method: 'POST', body: { id: (id.current ??= uuidv7()), text: text.trim() } }),
    onSuccess: (sent) => {
      cacheMessage(queryClient, sent)
      setText('')
      onSent()
    },
  })
  const submit = () => { if (text.trim() && !send.isPending) send.mutate() }
  return (
    <form className="flex flex-col gap-1 px-5 pb-2 md:px-6 md:pb-6" onSubmit={(e) => { e.preventDefault(); submit() }}>
      <div className="flex items-end gap-2 rounded-lg border border-primary bg-primary py-1.75 pr-1.75 pl-2.75 shadow-xs md:px-3.25 md:py-2.75 focus-within:outline-2 focus-within:outline-focus-ring">
        <textarea aria-label="Write a message" rows={1} maxLength={messageTextLimit} value={text} placeholder="Write a message…"
          className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-0 py-2 text-md text-primary outline-none placeholder:text-placeholder"
          onChange={(e) => { setText(e.target.value); id.current = null }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }} />
        <Button type="submit" variant="primary" size="md" iconLeading={Send01} label="Send" disabled={!text.trim() || send.isPending} />
      </div>
      {send.isError && <p role="alert" className="text-sm text-error-primary">{errorText(send.error)} Select Send to try again.</p>}
    </form>
  )
}

function Closed({ children }: { children: string }) {
  return <p className="border-t border-secondary p-4 text-center text-sm text-tertiary md:px-6">{children}</p>
}

/** An accepted request: the chat, as sections 04 and 09 of the drafts. */
export function ChatThread({ conversation }: { conversation: Conversation }) {
  const user = useUser()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { other, listingId, unread } = conversation
  const { name, first, about } = useChatName(other, listingId)
  const [reporting, setReporting] = useState(false)
  // The list grows upward, so a scroll of 0 shows the newest message.
  const scroller = useRef<HTMLDivElement>(null)
  const { mutate: markRead } = useMutation({
    mutationFn: () => api(user, `/v1/conversations/${conversation.id}/read`, noContent, { method: 'POST' }),
    onSuccess: () => queryClient.setQueryData<ConversationsResponse>(queryKeys.conversations, (data) => data && {
      conversations: data.conversations.map((c) => (c.id === conversation.id ? { ...c, unread: 0 } : c)),
    }),
  })
  // An open thread reads each message that comes in.
  useEffect(() => { if (unread > 0) markRead() }, [unread, markRead])

  const profileId = profileOf(other)
  const person = profileId && first ? { profileId, firstName: first } : null
  const menu = !other.deleted && (
    <DetailMenu id="thread-menu" items={[
      ...(person ? [{ label: 'View profile', icon: User01, onClick: () => router.push(`/people/${person.profileId}`) }] : []),
      ...(listingId ? [{ label: 'View listing', icon: Home02, onClick: () => router.push(`/places/${listingId}`) }] : []),
      { label: person ? `Report ${first}` : 'Report this listing', icon: Flag01, onClick: () => setReporting(true) },
    ]} />
  )
  return (
    <>
      <Header other={other} listingId={listingId} name={name} about={about} menu={menu} />
      <div ref={scroller} className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
        <div className="mb-auto flex flex-col gap-4 px-5 py-4 md:p-6">
          <SafetyNotice />
          <Messages conversationId={conversation.id} name={name} />
        </div>
      </div>
      {conversation.canSend
        ? <Composer conversationId={conversation.id} onSent={() => scroller.current?.scrollTo({ top: 0 })} />
        : <Closed>{other.deleted ? 'This account is deleted, so you can’t reply.' : 'You can’t send messages in this chat.'}</Closed>}
      {/* After "Not interested", the thread closes, and the Messages list confirms it (PD17). */}
      {reporting && <ReportSheet target={person ?? { listingId: listingId! }} onClose={() => setReporting(false)} onRemoved={() => router.replace(removedHref)} />}
    </>
  )
}

/** A request that the user sent: the note waits for an answer, and the composer stays off (section 09 of the drafts). */
export function SentThread({ request }: { request: OutgoingRequest }) {
  const { name, first, about } = useChatName(request.to, request.listingId)
  const open = request.state === 'open'
  return (
    <>
      <Header other={request.to} listingId={request.listingId} name={name} about={about} />
      <div className="flex min-h-0 flex-1 flex-col-reverse overflow-y-auto">
        <div className="mb-auto flex flex-col gap-4 px-5 py-4 md:p-6">
          <SafetyNotice />
          <Bubble mine name={name} at={request.createdAt}>{request.note}</Bubble>
          <p className="text-center text-xs text-tertiary">
            {open ? `Request sent. ${first ?? 'The lister'} has ${requestExpiryDays} days to accept or decline.` : 'Not available. You can send a new request later.'}
          </p>
        </div>
      </div>
      <Closed>{open ? `You can write more after ${first ?? 'the lister'} accepts.` : 'This request is not available.'}</Closed>
    </>
  )
}
