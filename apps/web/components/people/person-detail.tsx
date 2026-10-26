'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Bookmark, BookmarkCheck, Brush01, Calendar, Car01, Droplets01, Flag01, Heart, Home02, Moon01, SearchMd, Share07,
  ShoppingCart01, SlashCircle01, Sun, Users01, Wallet02,
} from '@untitledui/icons'
import type { PersonResponse } from '@roomsie/contract'
import { budgetLine, lifestyleLines, lookingFor, moveLine, mustHaveGroups } from '../../lib/person'
import { firstName } from '../../lib/profile-form'
import { useAreaNames } from '../../lib/queries'
import { Chips, DetailMenu, Facts, Photos, useShare, type Fact } from '../detail/parts'
import { ReportSheet } from '../reports/report-sheet'
import { SaveButton, useSaved } from '../saved/save-button'
import { Badge } from '../ui/badge'
import { Button, type Icon } from '../ui/button'
import { BlockSheet } from './block-sheet'
import { Connect } from './connect'
import { SayHiSheet } from './say-hi-sheet'

/** The icon of each lifestyle answer, as the designs draw them. */
const lifestyleIcons: Record<string, Icon> = {
  Food: ShoppingCart01, Smoking: SlashCircle01, Drinks: Droplets01, Guests: Users01, 'Their days': Sun, Sleep: Moon01, Tidiness: Brush01, Pets: Heart,
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-3"><h2 className="text-md font-semibold text-primary">{title}</h2>{children}</section>
}

/** The detail of a person: the flatmate detail of the Product file and section 16 of the drafts (T-18b). TODO(T-46): the "Verified" pill. */
export function PersonDetail({ person }: { person: PersonResponse }) {
  const router = useRouter()
  const areaNames = useAreaNames()
  const saved = useSaved('people', person.id)
  const { share, copied } = useShare(person.fullName)
  const [sheet, setSheet] = useState<'say_hi' | 'report' | 'block' | null>(null)
  const name = firstName(person.fullName)
  const back = () => (window.history.length > 1 ? router.back() : router.push('/saved'))
  const close = () => setSheet(null)

  const looking = [
    ['Looking for', lookingFor(person), SearchMd],
    ['Areas', person.areas.map((a) => areaNames[a] ?? a).join(', '), Home02],
    ['Budget', budgetLine(person.budgetMin, person.budgetMax), Wallet02],
    ['Moving', person.moveDate && moveLine(person.moveDate), Calendar],
    ['Commute to', person.commuteAddress, Car01],
  ].flatMap(([label, value, icon]) => (value ? [{ label, value, icon } as Fact] : []))
  const like = lifestyleLines(person).map((l) => ({ ...l, icon: lifestyleIcons[l.label]! }))
  const needs = mustHaveGroups(person)
  const initials = person.fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-secondary bg-primary px-5 py-3 lg:hidden">
        <Button variant="tertiary" size="sm" iconLeading={ArrowLeft} onClick={back}>Profile</Button>
        <DetailMenu id="person-menu" items={[
          { label: `Report ${name}`, icon: Flag01, onClick: () => setSheet('report') },
          { label: `Block ${name}`, icon: SlashCircle01, onClick: () => setSheet('block'), danger: true },
          { label: 'Share profile', icon: Share07, onClick: share },
          { label: saved.shown ? 'Saved' : 'Save', icon: saved.shown ? BookmarkCheck : Bookmark, onClick: saved.toggle },
        ]} />
      </div>
      <article className="mx-auto flex w-full max-w-180 flex-col gap-6 px-5 py-5 pb-48 md:px-6 md:py-8 lg:pb-8">
        <div className="hidden items-center justify-between gap-2 border-b border-secondary pb-4 lg:flex">
          <Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} />
          <div className="flex gap-2">
            <Button variant="secondary" size="xs" iconTrailing={Flag01} onClick={() => setSheet('report')}>Report</Button>
            <Button variant="secondary" size="xs" iconTrailing={SlashCircle01} onClick={() => setSheet('block')}>Block</Button>
            <Button variant="secondary" size="xs" iconTrailing={Share07} onClick={share}>{copied ? 'Link copied' : 'Share'}</Button>
            <SaveButton kind="people" id={person.id} />
          </div>
        </div>
        {copied && <p role="status" className="text-sm text-tertiary lg:hidden">Link copied</p>}
        {person.photos.length
          ? <Photos photos={person.photos} />
          : <span className="flex aspect-3/2 w-full items-center justify-center rounded-xl bg-secondary text-xl font-semibold text-tertiary">{initials}</span>}
        <header className="flex flex-col gap-1 border-b border-secondary pb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-primary">{person.fullName}</h1>
            {person.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
          </div>
          <p className="text-md text-tertiary">{[person.jobRole, person.age && `${person.age} yrs`].filter(Boolean).join(' • ')}</p>
        </header>
        {person.bio && <p className="rounded-xl border border-secondary bg-secondary p-4 text-sm text-tertiary">“{person.bio}”</p>}
        {looking.length > 0 && <Section title={`What ${name} is looking for`}><Facts lines={looking} /></Section>}
        {like.length > 0 && <Section title={`What ${name} is like`}><Facts lines={like} /></Section>}
        {(needs.dealbreakers.length > 0 || needs.prefers.length > 0) && (
          <Section title={`What ${name} needs from flatmates`}>
            <dl className="grid grid-cols-2 border-y border-secondary">
              <div className="flex flex-col gap-2 border-r border-secondary p-4"><dt className="text-sm font-medium text-secondary">Dealbreakers</dt><dd><Chips items={needs.dealbreakers} className="border-badge-error bg-badge-error text-badge-error" /></dd></div>
              <div className="flex flex-col gap-2 p-4"><dt className="text-sm font-medium text-secondary">Prefers</dt><dd><Chips items={needs.prefers} /></dd></div>
            </dl>
          </Section>
        )}
        <div className="hidden lg:block"><Connect person={person} name={name} onSayHi={() => setSheet('say_hi')} /></div>
      </article>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-start gap-3 border-t border-secondary bg-primary p-4 lg:hidden">
        <SaveButton kind="people" id={person.id} className="py-2.5" />
        <div className="min-w-0 flex-1"><Connect person={person} name={name} onSayHi={() => setSheet('say_hi')} /></div>
      </div>
      {sheet === 'say_hi' && <SayHiSheet profileId={person.id} name={name} onClose={close} />}
      {sheet === 'report' && <ReportSheet target={{ profileId: person.id, name: person.fullName }} onClose={close} />}
      {sheet === 'block' && <BlockSheet profileId={person.id} name={name} onClose={close} onBlocked={back} />}
    </>
  )
}
