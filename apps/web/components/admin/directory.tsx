'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Home02, SlashCircle01, Trash01 } from '@untitledui/icons'
import {
  adminSearchMax, noContent, type AdminListingRow, type AdminListingsQuery, type AdminLogEntry, type AdminPeopleQuery, type AdminPersonRow, type AdminSubjectReport, type listingActions, type listingFilters,
  type peopleFilters, type personActions, type visibilities,
} from '@roomsie/contract'
import { api, errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { dateAndTime, istDay } from '../../lib/ist'
import { rupees } from '../../lib/numbers'
import { useAdminListing, useAdminListings, useAdminPeople, useAdminPerson, useAreaLabels } from '../../lib/queries'
import { ago, reasonLabels } from '../../lib/reports'
import { PlaceCard } from '../listings/place-card'
import { pageBody, SubjectHeader } from './admin-page'
import { PersonCard } from '../people/person-card'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { ChoiceChips } from '../ui/choice'
import { inputClass } from '../ui/field'
import { Modal } from '../ui/modal'

type PeopleFilter = (typeof peopleFilters)[number]
type ListingFilter = (typeof listingFilters)[number]

export const directoryIntro = 'Find a person or a listing, and act on it. Gender, religion and community never show here.'

const box = 'flex flex-col gap-3 rounded-xl border border-secondary bg-primary p-5'
const peopleFilterLabels: Record<PeopleFilter, string> = { reported: 'Reported', hidden: 'Hidden', suspended: 'Suspended', verified: 'Verified' }
const listingFilterLabels: Record<ListingFilter, string> = { reported: 'Reported', hidden: 'Hidden', removed: 'Removed' }
const actionLabels: Record<AdminLogEntry['action'], string> = { hide: 'Hidden', unhide: 'Unhidden', suspend: 'Suspended', remove: 'Removed' }
const cardStates: Record<(typeof visibilities)[number], string> = { live: 'Shows to others', hidden: 'Hidden by the person', draft: 'Not finished' }

/** A search or a filter: each clears the other. */
function Search<F extends string>({ label, placeholder, labels, onSearch }: { label: string; placeholder: string; labels: Record<F, string>; onSearch: (query: { q?: string; filter?: F }) => void }) {
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<F | null>(null)
  const submit = (e: FormEvent) => { e.preventDefault(); setFilter(null); onSearch({ q: text.trim() }) }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 md:flex-row md:items-end">
      <input type="search" aria-label={label} className={`${inputClass} md:w-90`} value={text} placeholder={placeholder} maxLength={adminSearchMax} onChange={(e) => setText(e.target.value)} />
      <Button type="submit" variant="primary" size="md">Search</Button>
      <ChoiceChips label="Show only" labelHidden labels={labels} value={filter} onChange={(f) => { setFilter(f); setText(''); onSearch(f ? { filter: f } : {}) }} />
    </form>
  )
}

const OpenReports = ({ count }: { count: number }) => (count > 0 ? <Badge tone="error" dot={false}>{`${count} open ${count === 1 ? 'report' : 'reports'}`}</Badge> : null)

function PersonStates({ row }: { row: AdminPersonRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.suspended && <Badge tone="error" dot={false}>Suspended</Badge>}
      {row.hidden && <Badge tone="warning" dot={false}>Hidden</Badge>}
      <OpenReports count={row.openReports} />
      {row.verified && <Badge tone="success" dot={false}>Verified</Badge>}
    </span>
  )
}

function ListingStates({ row }: { row: AdminListingRow }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {row.removed ? <Badge tone="error" dot={false}>Removed</Badge>
        : row.hidden ? <Badge tone="warning" dot={false}>Hidden</Badge>
          : row.live ? <Badge tone="success" dot={false}>Live</Badge>
            : <Badge tone="gray" dot={false}>{row.expired ? 'Expired' : 'Not live'}</Badge>}
      <OpenReports count={row.openReports} />
    </span>
  )
}

/** A column that only a laptop shows. On a phone, a row is the name, the state and Open. */
const wide = 'hidden md:table-cell'

function Table({ heads, children }: { heads: [string, boolean?][]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-secondary">
      <table className="w-full text-left text-sm md:min-w-200">
        <thead className="bg-secondary text-xs font-medium text-tertiary">
          <tr>{heads.map(([h, phone = true]) => <th key={h} className={`px-4 py-3 font-medium ${phone ? '' : wide}`}>{h}</th>)}</tr>
        </thead>
        <tbody className="text-secondary">{children}</tbody>
      </table>
    </div>
  )
}

/** The people of the admin: search by name or email, and filters (T-63). */
export function PeopleList() {
  const [query, setQuery] = useState<AdminPeopleQuery>({})
  const people = useAdminPeople(query)
  return (
    <>
      <Search label="Search people" placeholder="Search by name or email" labels={peopleFilterLabels} onSearch={setQuery} />
      {people.isError && <p role="alert" className="text-sm text-error-primary">{errorText(people.error)}</p>}
      {people.isPending && <p className="text-sm text-tertiary">Loading…</p>}
      {people.data && (
        <>
          <Table heads={[['Person'], ['Joined', false], ['Last active', false], ['State'], ['']]}>
            {people.data.people.map((p) => (
              <tr key={p.userId} className="border-t border-secondary">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <Avatar src={p.photoUrl} size="md" />
                    <span className="flex flex-col"><span className="font-semibold text-primary">{p.name ?? 'No card'}</span><span className="text-tertiary">{p.email ?? '—'}</span></span>
                  </span>
                </td>
                <td className={`px-4 py-3 text-tertiary ${wide}`}>{istDay(p.joinedAt, 'short')}</td>
                <td className={`px-4 py-3 text-tertiary ${wide}`}>{p.lastActiveAt ? ago(p.lastActiveAt) : '—'}</td>
                <td className="px-4 py-3"><PersonStates row={p} /></td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/people/${p.userId}`} className="font-semibold text-primary hover:underline">Open</Link></td>
              </tr>
            ))}
          </Table>
          <p className="text-sm text-tertiary">{people.data.people.length ? `The ${people.data.people.length} newest that match` : 'Nobody matches.'}</p>
        </>
      )}
    </>
  )
}

/** The listings of the admin: search by area or lister, and filters (T-63). */
export function ListingsList() {
  const [query, setQuery] = useState<AdminListingsQuery>({})
  const listings = useAdminListings(query)
  return (
    <>
      <Search label="Search listings" placeholder="Search by area or lister" labels={listingFilterLabels} onSearch={setQuery} />
      {listings.isError && <p role="alert" className="text-sm text-error-primary">{errorText(listings.error)}</p>}
      {listings.isPending && <p className="text-sm text-tertiary">Loading…</p>}
      {listings.data && (
        <>
          <Table heads={[['Listing'], ['Lister', false], ['Rent', false], ['Posted', false], ['State'], ['']]}>
            {listings.data.listings.map((l) => (
              <tr key={l.id} className="border-t border-secondary">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-fg-quaternary"><Home02 size={18} aria-hidden /></span>
                    <span className="flex flex-col"><span className="font-semibold text-primary">{l.title}</span><span className="text-tertiary">{l.area ?? 'No area'}</span></span>
                  </span>
                </td>
                <td className={`px-4 py-3 ${wide}`}><span className="flex flex-col"><span>{l.lister ?? 'No card'}</span><span className="text-tertiary">{l.listerEmail ?? '—'}</span></span></td>
                <td className={`px-4 py-3 text-tertiary ${wide}`}>{l.rent === null ? '—' : rupees(l.rent)}</td>
                <td className={`px-4 py-3 text-tertiary ${wide}`}>{istDay(l.postedAt, 'short')}</td>
                <td className="px-4 py-3"><ListingStates row={l} /></td>
                <td className="px-4 py-3 text-right"><Link href={`/admin/listings/${l.id}`} className="font-semibold text-primary hover:underline">Open</Link></td>
              </tr>
            ))}
          </Table>
          <p className="text-sm text-tertiary">{listings.data.listings.length ? `The ${listings.data.listings.length} newest that match` : 'No listing matches.'}</p>
        </>
      )}
    </>
  )
}

function Facts({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <dl className="flex flex-col">
      {facts.map(([name, value]) => (
        <div key={name} className="flex flex-col gap-0.5 border-t border-secondary py-2.5 text-sm first:border-t-0 md:flex-row md:gap-3">
          <dt className="font-medium text-tertiary md:w-40 md:shrink-0">{name}</dt>
          <dd className="text-primary">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Reports({ reports, kind }: { reports: AdminSubjectReport[]; kind: 'person' | 'listing' }) {
  const labels = reasonLabels(kind)
  return (
    <section aria-label="Reports" className={box}>
      <h2 className="text-lg font-semibold text-primary">{`Reports · ${reports.length}`}</h2>
      {reports.length ? reports.map((r) => (
        <div key={r.id} className="flex flex-col gap-0.5 rounded-lg bg-secondary px-3 py-2.5 text-sm">
          <span className="font-semibold text-primary">{`${labels[r.reason]} · ${ago(r.createdAt)}`}{r.status !== 'open' && <span className="font-normal text-tertiary">{` · ${r.status}`}</span>}</span>
          {r.detail && <span className="text-secondary">{r.detail}</span>}
        </div>
      )) : <p className="text-sm text-tertiary">No report.</p>}
    </section>
  )
}

function Log({ log }: { log: AdminLogEntry[] }) {
  return (
    <section aria-label="Moderation log" className={box}>
      <h2 className="text-lg font-semibold text-primary">Moderation log</h2>
      {log.length ? log.map((l) => (
        <p key={l.id} className="text-sm text-secondary">
          {`${l.listingId ? `Listing ${actionLabels[l.action].toLowerCase()}` : actionLabels[l.action]} by ${l.by ?? 'a deleted account'} · ${dateAndTime(l.at)}`}
        </p>
      )) : <p className="text-sm text-tertiary">No action yet.</p>}
    </section>
  )
}

/** One action of a moderator, then a new read of the admin. */
function useAction<A extends string>(path: string) {
  const user = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: A) => api(user, `${path}/actions`, noContent, { method: 'POST', body: { action } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  })
}

function Confirm({ title, text, action, pending, onConfirm, onClose }: { title: string; text: string; action: string; pending: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <Modal icon={SlashCircle01} title={title} onClose={onClose}
      actions={
        <>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="lg" className="flex-1" disabled={pending} onClick={onConfirm}>{action}</Button>
        </>
      }>
      {text}
    </Modal>
  )
}

/** The page of one person or listing: its name as the header, then its parts (drafts section 38). */
function DetailPage({ title, intro, back, children }: { title: string; intro?: string; back: { label: string; href: string }; children: ReactNode }) {
  return (
    <>
      <SubjectHeader title={title} intro={intro} back={back} />
      <main className={pageBody}>{children}</main>
    </>
  )
}
const toPeople = { label: 'People', href: '/admin/people' }
const toListings = { label: 'Listings', href: '/admin/listings' }

/** One person: the card as users see it, the account, the reports and the log. Never gender, religion or community (T-63). */
export function PersonView({ userId }: { userId: string }) {
  const person = useAdminPerson(userId)
  const act = useAction<(typeof personActions)[number]>(`/v1/admin/people/${userId}`)
  const [asking, setAsking] = useState(false)
  if (person.isError) return <DetailPage title="Person" back={toPeople}><p role="alert" className="text-sm text-error-primary">{errorText(person.error)}</p></DetailPage>
  if (person.isPending) return <DetailPage title="Person" back={toPeople}><p className="text-sm text-tertiary">Loading…</p></DetailPage>
  const p = person.data
  return (
    <DetailPage title={p.name ?? 'No card'} back={toPeople} intro={`Joined ${istDay(p.joinedAt, 'short')} · last active ${p.lastActiveAt ? ago(p.lastActiveAt) : 'never'}`}>
      <PersonStates row={p} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-5 lg:flex-1">
          <section aria-label="Account" className={box}>
            <h2 className="text-lg font-semibold text-primary">Account</h2>
            <Facts facts={[
              ['Sign-in email', p.email ?? '—'],
              ['Card', p.visibility ? (p.hidden ? 'Hidden for review' : cardStates[p.visibility]) : 'No card'], ['ID check', p.verified ? 'Verified' : 'Not verified'],
            ]} />
            {!p.suspended && (
              <div className="flex flex-wrap gap-2 pt-1">
                {p.card && <Button variant="secondary" size="sm" disabled={act.isPending} onClick={() => act.mutate(p.hidden ? 'unhide' : 'hide')}>{p.hidden ? 'Unhide card' : 'Hide card'}</Button>}
                <Button variant="destructive" size="sm" disabled={act.isPending} onClick={() => setAsking(true)}>Suspend</Button>
              </div>
            )}
            {act.isError && <p role="alert" className="text-sm text-error-primary">{errorText(act.error)}</p>}
          </section>
          <Reports reports={p.reports} kind="person" />
          <Log log={p.log} />
        </div>
        <aside className="flex flex-col gap-3 lg:w-90">
          <p className="text-sm font-semibold text-tertiary">The card as users see it</p>
          {p.card ? <PersonCard card={p.card} /> : <p className="text-sm text-tertiary">No card.</p>}
          <p className="text-sm text-tertiary">Gender, religion and community never show in the admin.</p>
        </aside>
      </div>
      {asking && (
        <Confirm title={`Suspend ${p.name ?? 'this person'}?`} action="Suspend" pending={act.isPending} onClose={() => setAsking(false)} onConfirm={() => act.mutate('suspend', { onSuccess: () => setAsking(false) })}
          text="The person is signed out everywhere. The card and the listings are hidden, and the open requests are withdrawn. Only a developer can undo this." />
      )}
    </DetailPage>
  )
}

/** One listing: the card as users see it, the lister, the reports and the log (T-63). */
export function ListingView({ id }: { id: string }) {
  const listing = useAdminListing(id)
  const areaLabels = useAreaLabels()
  const act = useAction<(typeof listingActions)[number]>(`/v1/admin/listings/${id}`)
  const [asking, setAsking] = useState(false)
  if (listing.isError) return <DetailPage title="Listing" back={toListings}><p role="alert" className="text-sm text-error-primary">{errorText(listing.error)}</p></DetailPage>
  if (listing.isPending) return <DetailPage title="Listing" back={toListings}><p className="text-sm text-tertiary">Loading…</p></DetailPage>
  const l = listing.data
  return (
    <DetailPage title={l.title} back={toListings} intro={`${l.area ?? 'No area'} · listed by ${l.lister ?? 'a person with no card'} · posted ${istDay(l.postedAt, 'short')}`}>
      <ListingStates row={l} />
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <div className="flex flex-col gap-5 lg:flex-1">
          <section aria-label="Listing" className={box}>
            <h2 className="text-lg font-semibold text-primary">Listing</h2>
            <Facts facts={[
              ['Lister', <Link key="lister" href={`/admin/people/${l.listerUserId}`} className="font-semibold hover:underline">{`${l.lister ?? 'No card'} · ${l.listerEmail ?? '—'}`}</Link>],
              ['Rent', l.rent === null ? '—' : rupees(l.rent)],
            ]} />
            {!l.removed && (
              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="secondary" size="sm" disabled={act.isPending} onClick={() => act.mutate(l.hidden ? 'unhide' : 'hide')}>{l.hidden ? 'Unhide listing' : 'Hide listing'}</Button>
                <Button variant="destructive" size="sm" iconLeading={Trash01} disabled={act.isPending} onClick={() => setAsking(true)}>Remove listing</Button>
              </div>
            )}
            {act.isError && <p role="alert" className="text-sm text-error-primary">{errorText(act.error)}</p>}
          </section>
          <Reports reports={l.reports} kind="listing" />
          <Log log={l.log} />
        </div>
        <aside className="flex flex-col gap-3 lg:w-90">
          <p className="text-sm font-semibold text-tertiary">The card as users see it</p>
          <PlaceCard listing={l.listing} areaName={l.listing.areaSlug ? areaLabels[l.listing.areaSlug] : undefined} />
        </aside>
      </div>
      {asking && (
        <Confirm title="Remove this listing?" action="Remove listing" pending={act.isPending} onClose={() => setAsking(false)} onConfirm={() => act.mutate('remove', { onSuccess: () => setAsking(false) })}
          text="It shows to nobody, and its owner cannot make it live again. The owner sees that a moderator removed it." />
      )}
    </DetailPage>
  )
}
