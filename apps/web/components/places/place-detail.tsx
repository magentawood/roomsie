'use client'

import { useState, type ReactNode } from 'react'
import {
  Activity, ArrowLeft, Bookmark, BookmarkCheck, Bus, Clock, Cube01, Droplets01, Edit05, Flag01, Heart, Home02, Key01,
  LayersThree01, MessageCircle01, Moon01, Ruler, Share07, ShoppingBag01, ShoppingCart01, SlashCircle01, Sun, Train, User01, Users01, UsersCheck,
} from '@untitledui/icons'
import type { ListingResponse } from '@roomsie/contract'
import { labels, listingTitle } from '../../lib/listing-steps'
import {
  addressLine, flatmateLines, listerLabel, listerOf, moveIn, nearbyLines, pgRateLines, placeLines, ruleLines, termLines, whereLine, type FactLabel, type Line,
} from '../../lib/place-detail'
import { listingChat } from '../../lib/messages'
import { useAreaLabels, useConversations, useOutgoingRequests } from '../../lib/queries'
import { Chips, DetailMenu, Facts, Photos, Section, useBack, useShare } from '../detail/parts'
import { SayHiSheet } from '../people/say-hi-sheet'
import { ReportSheet } from '../reports/report-sheet'
import { SaveButton, useSaved } from '../saved/save-button'
import { Button, type Icon } from '../ui/button'

/** The icon of each line, as the designs draw them. */
const lineIcons: Record<FactLabel, Icon> = {
  'Place type': Home02, Floor: LayersThree01, 'The room': Key01, 'Carpet area': Ruler, Bathroom: Droplets01, 'Bathroom for this room': Droplets01,
  Balcony: Sun, Furnishing: Cube01, 'Beds free right now': Users01, Meals: ShoppingBag01, Curfew: Moon01,
  Kitchen: ShoppingCart01, Guests: Users01, Smoking: SlashCircle01, 'Who can move in': UsersCheck, Alcohol: SlashCircle01, 'Who’s welcome': Heart,
  'Railway or metro station': Train, 'Bus stop': Bus, 'Market or groceries': ShoppingCart01, Gym: Activity, Mall: ShoppingBag01,
}

const withIcons = (lines: Line<FactLabel>[]) => lines.map((l) => ({ ...l, icon: lineIcons[l.label] }))

const ownerLines: Record<ListingResponse['status'], string> = {
  live: 'This is how others see it.',
  draft: 'It is a draft. Others can’t see it until you publish it.',
  inactive: 'It is paused. Others can’t see it.',
  filled: 'It is filled. Others can’t see it.',
}

function Rows({ lines, total }: { lines: Line[]; total?: string }) {
  return (
    <dl className="flex flex-col gap-2 rounded-xl border border-secondary bg-secondary p-4 text-sm">
      {lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-4"><dt className="text-secondary">{l.label}</dt><dd className="text-right text-tertiary">{l.value}</dd></div>
      ))}
      {total && <div className="flex justify-between gap-4 border-t border-secondary pt-2 font-medium"><dt className="text-secondary">Total move in</dt><dd className="text-secondary">{total}</dd></div>}
    </dl>
  )
}

function Person({ photoUrl, name, about }: { photoUrl: string | null; name: string; about?: string | null }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-secondary bg-secondary p-4">
      {photoUrl
        ? <img src={photoUrl} alt="" className="size-14 rounded-full object-cover" />
        : <span className="flex size-14 items-center justify-center rounded-full border border-secondary bg-tertiary text-fg-quaternary"><User01 size={24} aria-hidden /></span>}
      <div className="flex flex-col text-sm"><span className="font-medium text-primary">{name}</span>{about && <span className="text-tertiary">{about}</span>}</div>
    </div>
  )
}

/** The message button of the listing details: a request to the lister, then the chat after an accept (T-45). */
function MessageLister({ listing, onMessage }: { listing: ListingResponse; onMessage: () => void }) {
  const outgoing = useOutgoingRequests()
  const conversations = useConversations()
  if (!outgoing.data || !conversations.data) return null
  const chat = listingChat(outgoing.data.requests, conversations.data.conversations, listing.id)
  const message = <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} onClick={onMessage}>{`Message ${listerOf(listing.kind)}`}</Button>
  switch (chat.state) {
    case 'sent': return <Button variant="secondary" size="lg" className="w-full" iconLeading={Clock} disabled>Request sent</Button>
    case 'accepted': return <Button variant="primary" size="lg" className="w-full" iconLeading={MessageCircle01} href={chat.conversationId && `/messages/${chat.conversationId}`} disabled={!chat.conversationId}>Open chat</Button>
    case 'not_available': return <div className="flex flex-col gap-2">{message}<p className="text-center text-sm text-tertiary">Not available. You can send a new request.</p></div>
    default: return message
  }
}

function OwnerBar({ listing }: { listing: ListingResponse }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-secondary bg-secondary p-4 text-sm">
      <div>
        <p className="font-semibold text-primary">{listing.hidden ? 'Hidden for review' : 'Your listing'}</p>
        <p className="text-tertiary">{listing.hidden ? 'Reports hid it from others. We review it within 24 hours.' : ownerLines[listing.status]}</p>
      </div>
      <Button variant="secondary" size="xs" iconLeading={Edit05} href={`/listings/${listing.id}/1`}>Edit</Button>
    </div>
  )
}

function PhoneMenu({ listing, onReport, share }: { listing: ListingResponse; onReport: () => void; share: () => void }) {
  const saved = useSaved('places', listing.id)
  return (
    <DetailMenu id="place-menu" items={[
      ...(listing.mine ? [] : [{ label: 'Report', icon: Flag01, onClick: onReport }]),
      { label: 'Share', icon: Share07, onClick: share },
      ...(listing.mine ? [] : [{ label: saved.shown ? 'Saved' : 'Save', icon: saved.shown ? BookmarkCheck : Bookmark, onClick: saved.toggle }]),
    ]} />
  )
}

/** The detail of a place: the four kinds of the Product file (T-43). TODO(T-46): the "Verified" pill. */
export function PlaceDetail({ listing }: { listing: ListingResponse }) {
  const areaLabels = useAreaLabels()
  const title = listingTitle(listing)
  const [reporting, setReporting] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const { share, copied } = useShare(title)
  const back = useBack()
  const where = whereLine(listing, listing.areaSlug ? areaLabels[listing.areaSlug] : undefined)
  const address = addressLine(listing)
  const money = moveIn(listing)
  const terms = termLines(listing)
  const rates = pgRateLines(listing)
  const place = placeLines(listing)
  const rules = ruleLines(listing)
  const nearby = nearbyLines(listing)
  const parts: [string, ReactNode][] = [
    ['Money to move in', (money || terms.length > 0) && <>{money && <Rows lines={money.lines} total={money.total} />}{terms.length > 0 && <Rows lines={terms} />}</>],
    ['Who lives here', listing.flatmates.length > 0 && (
      <ul className="flex flex-col gap-3">
        {listing.flatmates.map((f) => <li key={`${f.name}-${f.age}`}><Person photoUrl={f.photoUrl} {...flatmateLines(f)} /></li>)}
      </ul>
    )],
    ['The place', (rates.length > 0 || place.length > 0) && <>{rates.length > 0 && <Rows lines={rates} />}{place.length > 0 && <Facts lines={withIcons(place)} />}</>],
    ['House rules', rules.length > 0 && <Facts lines={withIcons(rules)} />],
    ['What’s inside', listing.insideItems.length > 0 && <Chips items={listing.insideItems.map((i) => labels.insideItems[i])} />],
    ['Building and society', listing.amenities.length > 0 && <Chips items={listing.amenities.map((a) => labels.amenities[a])} />],
    ['What’s nearby', nearby.length > 0 && <Facts lines={withIcons(nearby)} />],
    ['About this place', listing.description && <p className="text-sm whitespace-pre-line text-tertiary">{listing.description}</p>],
    ['Listed by', <Person photoUrl={listing.lister?.photoUrl ?? null} name={listing.lister?.name ?? listerLabel(listing.kind)} about={listing.lister && listerLabel(listing.kind)} />],
  ]

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-secondary bg-primary px-5 py-3 lg:hidden">
        <Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} />
        <PhoneMenu listing={listing} onReport={() => setReporting(true)} share={share} />
      </div>
      <article className={`mx-auto flex w-full max-w-180 flex-col gap-6 px-5 py-5 md:px-6 md:py-8 ${listing.mine ? '' : 'pb-40 lg:pb-8'}`}>
        <div className="hidden items-center justify-between gap-2 border-b border-secondary pb-4 lg:flex">
          <Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} />
          <div className="flex gap-2">
            {!listing.mine && <Button variant="secondary" size="xs" iconTrailing={Flag01} onClick={() => setReporting(true)}>Report</Button>}
            <Button variant="secondary" size="xs" iconTrailing={Share07} onClick={share}>{copied ? 'Link copied' : 'Share'}</Button>
            {!listing.mine && <SaveButton kind="places" id={listing.id} />}
          </div>
        </div>
        {copied && <p role="status" className="text-sm text-tertiary lg:hidden">Link copied</p>}
        {listing.mine && <OwnerBar listing={listing} />}
        <Photos photos={listing.photos} />
        <header className="flex flex-col gap-1 border-b border-secondary pb-5">
          <h1 className="text-lg font-semibold text-primary">{title}</h1>
          {where && <p className="text-md text-tertiary">{where}</p>}
          {address && <p className="text-sm text-tertiary">{address}</p>}
        </header>
        {!listing.mine && <div className="hidden lg:block"><MessageLister listing={listing} onMessage={() => setMessaging(true)} /></div>}
        {parts.map(([partTitle, body]) => body && <Section key={partTitle} title={partTitle}>{body}</Section>)}
      </article>
      {!listing.mine && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 border-t border-secondary bg-primary p-4 lg:hidden">
          <MessageLister listing={listing} onMessage={() => setMessaging(true)} />
          <SaveButton kind="places" id={listing.id} className="w-full py-2.5" />
        </div>
      )}
      {reporting && <ReportSheet target={{ listingId: listing.id }} onClose={() => setReporting(false)} />}
      {messaging && <SayHiSheet target={{ listingId: listing.id, kind: listing.kind }} onClose={() => setMessaging(false)} />}
    </>
  )
}
