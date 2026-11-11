'use client'

import { useState, type ReactNode } from 'react'
import {
  Activity, ArrowLeft, Bookmark, BookmarkCheck, Bus, Clock, Cube01, Droplets01, Edit05, Flag01, Heart, Home02, Key01,
  LayersThree01, MessageCircle01, Moon01, Ruler, Share07, ShoppingBag01, ShoppingCart01, SlashCircle01, Sun, Train, User01, Users01, UsersCheck,
} from '@untitledui/icons'
import { listingTitle, type ListingResponse } from '@roomsie/contract'
import { labels } from '../../lib/listing-steps'
import {
  addressLine, didntSay, flatmateLines, listerLabel, listerPhrase, moveIn, nearbyLines, pgRateLines, placeLines, ruleLines, termLines, whereLine, type FactLabel, type Line,
} from '../../lib/place-detail'
import { listingChat } from '../../lib/messages'
import { useAreaLabels, useConversations, useOutgoingRequests } from '../../lib/queries'
import { AskInChat, Chips, DetailMenu, Facts, NotSaid, Photos, Section, useBack, useShare, type DetailPanel } from '../detail/parts'
import { MatchBox } from '../detail/match-box'
import { SayHiSheet } from '../people/say-hi-sheet'
import { ReportSheet } from '../reports/report-sheet'
import { SaveButton, useSaved } from '../saved/save-button'
import { Button, type Icon } from '../ui/button'
import { Badge } from '../ui/badge'
import { CloseButton } from '../ui/modal'
import { verifiedLabel } from '../../lib/verification'
import { savedHref } from '../../lib/saved'

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

function Rows({ lines, total }: { lines: Line[]; total?: string | null }) {
  return (
    <dl className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary p-4 text-sm lg:gap-2.5">
      {lines.map((l) => (
        <div key={l.label} className="flex justify-between gap-4"><dt className="text-secondary">{l.label}</dt><dd className="text-right text-tertiary">{l.value}</dd></div>
      ))}
      {total && <div className="flex justify-between gap-4 border-t border-secondary pt-3 font-medium lg:pt-2.25"><dt className="text-secondary">Total move in</dt><dd className="text-secondary">{total}</dd></div>}
    </dl>
  )
}

/** `badge`: the Verified pill of the lister, at the end of the box. */
function Person({ photoUrl, name, about, badge }: { photoUrl: string | null; name: string; about?: string | null; badge?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-secondary bg-secondary px-4 py-3 lg:gap-4 lg:p-2.75">
      {photoUrl
        ? <img src={photoUrl} alt="" className="size-12 rounded-full object-cover lg:size-14" />
        : <span className="flex size-12 items-center justify-center rounded-full border border-secondary bg-tertiary text-fg-quaternary lg:size-14"><User01 size={24} aria-hidden /></span>}
      <div className="flex flex-col text-sm lg:gap-1"><span className="font-medium text-primary">{name}</span>{about && <span className="text-tertiary">{about}</span>}</div>
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </div>
  )
}

/** The message button of the listing details: a request to the lister, then the chat after an accept (T-45). */
function MessageLister({ listing, onMessage }: { listing: ListingResponse; onMessage: () => void }) {
  const outgoing = useOutgoingRequests()
  const conversations = useConversations()
  if (!outgoing.data || !conversations.data) return null
  const chat = listingChat(outgoing.data.requests, conversations.data.conversations, listing.id)
  const message = <Button variant="primary" size="md" className="w-full" iconLeading={MessageCircle01} onClick={onMessage}>{`Message ${listerPhrase(listing.kind)}`}</Button>
  switch (chat.state) {
    case 'sent': return <Button variant="secondary" size="md" className="w-full" iconLeading={Clock} disabled>Request sent</Button>
    case 'accepted': return <Button variant="primary" size="md" className="w-full" iconLeading={MessageCircle01} href={chat.conversationId && `/messages/${chat.conversationId}`} disabled={!chat.conversationId}>Open chat</Button>
    case 'not_available': return <div className="flex flex-col gap-2">{message}<p className="text-center text-sm text-tertiary">Not available. You can send a new request.</p></div>
    default: return message
  }
}

function OwnerBar({ listing }: { listing: ListingResponse }) {
  return (
    // On a phone it is a strip under the bar, from edge to edge (drafts 393:21566); from lg a box in the column (396:22194).
    <div className="-mx-5 -mt-4 -mb-2 flex items-center justify-between gap-3 border-b border-secondary bg-secondary px-5 py-3 text-sm md:-mx-6 md:-mt-8 lg:m-0 lg:rounded-xl lg:border lg:p-4">
      <div className="flex flex-col gap-0.5">
        <p className="font-semibold text-primary">{listing.hidden ? 'Hidden for review' : 'Your listing'}</p>
        <p className="text-tertiary">{listing.hidden ? 'Reports hid it from others. We review it within 24 hours.' : ownerLines[listing.status]}</p>
      </div>
      <Button variant="secondary" size="sm" iconLeading={Edit05} href={`/listings/${listing.id}/1`}>Edit</Button>
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

/**
 * The detail of a place: the four kinds of the Product file (T-43). Each part shows each field of the kind, with "Didn't say" for a gap (2026-11-09).
 * `panel`: it is in the results panel of the chat (T-15).
 */
export function PlaceDetail({ listing, panel }: { listing: ListingResponse; panel?: DetailPanel }) {
  const areaLabels = useAreaLabels()
  const title = listingTitle(listing)
  const [reporting, setReporting] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const { share, status, dialog: shareDialog } = useShare(title, { kind: 'places', id: listing.id })
  const routerBack = useBack(savedHref.places)
  const back = panel?.onBack ?? routerBack
  const askInChat = !listing.mine && <AskInChat card={{ kind: 'place', id: listing.id, name: title }} panel={panel} />
  const where = whereLine(listing, listing.areaSlug ? areaLabels[listing.areaSlug] : undefined)
  const address = addressLine(listing)
  const money = moveIn(listing)
  const terms = termLines(listing)
  const rates = pgRateLines(listing)
  const place = placeLines(listing)
  const rules = ruleLines(listing)
  const nearby = nearbyLines(listing)
  // The pill of the designs: "Verified Owner" in green, "Verified Broker" in yellow, as the Broker pill of a card.
  const verified = listing.verified && <Badge tone={listing.kind === 'broker_flat' ? 'warning' : 'success'} size="lg" verified>{verifiedLabel(listing.kind)}</Badge>
  const parts: [string, ReactNode][] = [
    ['Money to move in', <><Rows lines={money.lines} total={money.total} /><Rows lines={terms} /></>],
    // Only a room in a flat has flatmates (the listing flow, T-41).
    ...(listing.kind === 'room_in_flat' ? [['Who lives here', listing.flatmates.length ? (
      <ul className="flex flex-col gap-2 lg:gap-4">
        {listing.flatmates.map((f) => <li key={`${f.name}-${f.age}`}><Person photoUrl={f.photoUrl} {...flatmateLines(f)} /></li>)}
      </ul>
    ) : <NotSaid />] as [string, ReactNode]] : []),
    ['The place', <>{listing.kind === 'pg' && <Rows lines={rates} />}<Facts lines={withIcons(place)} /></>],
    ['House rules', <Facts lines={withIcons(rules)} gap="gap-2 lg:gap-3" />],
    ['What’s inside', listing.insideItems.length ? <Chips items={listing.insideItems.map((i) => labels.insideItems[i])} /> : <NotSaid />],
    ['Building and society', listing.amenities.length ? <Chips items={listing.amenities.map((a) => labels.amenities[a])} /> : <NotSaid />],
    ['What’s nearby', <Facts lines={withIcons(nearby)} gap="gap-2 lg:gap-3" />],
    ['About this place', <p className="text-sm whitespace-pre-line text-tertiary">{listing.description ?? didntSay}</p>],
    ['Listed by', <Person photoUrl={listing.lister?.photoUrl ?? null} name={listing.lister?.name ?? listerLabel(listing.kind)} about={listing.lister && listerLabel(listing.kind)} badge={verified} />],
  ]

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-secondary bg-primary px-5 py-3 lg:hidden">
        <Button variant="tertiary" size="sm" iconLeading={ArrowLeft} onClick={back} className="gap-1.5! px-0! py-1.5!">Back</Button>
        <div className="flex items-center gap-2">{askInChat}<PhoneMenu listing={listing} onReport={() => setReporting(true)} share={share} /></div>
      </div>
      <article className={`mx-auto flex w-full max-w-180 flex-col gap-6 px-5 pt-4 md:px-6 md:py-8 lg:max-w-192 lg:gap-5 lg:py-6 ${listing.mine || panel ? 'pb-6' : 'pb-40 lg:pb-6'}`}>
        <div className="hidden items-center justify-between gap-2 border-b border-secondary pb-3 lg:flex">
          <Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} />
          <div className="flex items-center gap-3">
            {askInChat}
            {!listing.mine && <Button variant="secondary" size="xs" iconTrailing={Flag01} onClick={() => setReporting(true)}>Report</Button>}
            <Button variant="secondary" size="xs" iconTrailing={Share07} onClick={share}>Share</Button>
            {!listing.mine && <SaveButton kind="places" id={listing.id} />}
            {panel && <CloseButton onClose={panel.onClose} />}
          </div>
        </div>
        {status && <p role="status" className="text-sm text-tertiary">{status}</p>}
        {listing.mine && <OwnerBar listing={listing} />}
        <Photos photos={listing.photos} />
        <header className="flex flex-col gap-1 border-b border-secondary pb-4 lg:gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <h1 className="text-lg font-semibold text-primary">{title}</h1>
            {verified}
          </div>
          {where && <p className="text-md text-tertiary">{where}</p>}
          {address && <p className="text-sm text-tertiary">{address}</p>}
        </header>
        {!listing.mine && <MatchBox target={{ kind: 'place', listing }} against={panel?.against} />}
        {parts.map(([partTitle, body]) => <Section key={partTitle} title={partTitle}>{body}</Section>)}
        {/* On a computer the message button ends the column, as in the designs. */}
        {!listing.mine && <div className="hidden lg:block"><MessageLister listing={listing} onMessage={() => setMessaging(true)} /></div>}
      </article>
      {/* In the panel, the bar sits at the bottom of the panel, so the chat input stays free (PD6a). */}
      {!listing.mine && (
        <div className={`${panel ? 'sticky' : 'fixed inset-x-0'} bottom-0 z-30 flex flex-col gap-3 border-t border-secondary bg-primary px-5 py-4 lg:hidden`}>
          <MessageLister listing={listing} onMessage={() => setMessaging(true)} />
          <SaveButton kind="places" id={listing.id} className="w-full py-2.5" />
        </div>
      )}
      {reporting && <ReportSheet target={{ listingId: listing.id }} onClose={() => setReporting(false)} />}
      {shareDialog}
      {messaging && <SayHiSheet target={{ listingId: listing.id, kind: listing.kind }} onClose={() => setMessaging(false)} />}
    </>
  )
}
