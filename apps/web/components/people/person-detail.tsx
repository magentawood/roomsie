'use client'

import { useState } from 'react'
import {
  ArrowLeft, Bookmark, BookmarkCheck, Brush01, Calendar, Car01, Droplets01, Flag01, Heart, Home02, Moon01, SearchMd, Share07,
  ShoppingCart01, SlashCircle01, Sun, Users01, Wallet02,
} from '@untitledui/icons'
import type { LifestyleAxis, PersonResponse } from '@roomsie/contract'
import { aboutLine, budgetLine, initials, lifestyleFacts, lookingFor, mustHaveGroups } from '../../lib/person'
import { didntSay, shortDate } from '../../lib/place-detail'
import { firstName } from '../../lib/profile-form'
import { useAreaLabels } from '../../lib/queries'
import { AskInChat, Chips, DetailMenu, Facts, NotSaid, Photos, Section, useBack, useShare, type DetailPanel } from '../detail/parts'
import { MatchBox } from '../detail/match-box'
import { ReportSheet } from '../reports/report-sheet'
import { SaveButton, useSaved } from '../saved/save-button'
import { Badge } from '../ui/badge'
import { Button, type Icon } from '../ui/button'
import { CloseButton } from '../ui/modal'
import { Connect } from './connect'
import { SayHiSheet } from './say-hi-sheet'
import { savedHref } from '../../lib/saved'

const lifestyleIcons: Record<LifestyleAxis, Icon> = {
  food: ShoppingCart01, smoking: SlashCircle01, drinks: Droplets01, guests: Users01, your_days: Sun, sleep: Moon01, tidiness: Brush01, pets: Heart,
}

/**
 * The detail of a person: the flatmate detail of the Product file and section 16 of the drafts (T-18b).
 * Each part shows on each card, with "Didn't say" for a gap (2026-11-09). `panel`: it is in the results panel of the chat.
 */
export function PersonDetail({ person, panel }: { person: PersonResponse; panel?: DetailPanel }) {
  const areaLabels = useAreaLabels()
  const saved = useSaved('people', person.id)
  const { share, status, dialog: shareDialog } = useShare(person.fullName, { kind: 'people', id: person.id })
  const [sheet, setSheet] = useState<'say_hi' | 'report' | null>(null)
  const name = firstName(person.fullName)
  const target = { profileId: person.id, firstName: name }
  const routerBack = useBack(savedHref.people)
  const back = panel?.onBack ?? routerBack
  const close = () => setSheet(null)

  const lookingForFacts = [
    { label: 'Looking for', value: lookingFor(person), icon: SearchMd },
    { label: 'Areas', value: person.areas.map((a) => areaLabels[a] ?? a).join(' · '), icon: Home02 },
    { label: 'Budget', value: budgetLine(person), icon: Wallet02 },
    { label: 'Moving', value: person.moveDate && shortDate(person.moveDate), icon: Calendar },
    { label: 'Commute to', value: person.commuteAddress, icon: Car01 },
  ].map((f) => ({ ...f, value: f.value || didntSay }))
  const likeFacts = lifestyleFacts(person).map((l) => ({ label: l.label, value: l.value, icon: lifestyleIcons[l.axis] }))
  const mustHaves = mustHaveGroups(person)
  const askInChat = <AskInChat card={{ kind: 'person', id: person.id, name: person.fullName }} panel={panel} />

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-secondary bg-primary px-5 py-3 lg:hidden">
        <Button variant="tertiary" size="sm" iconLeading={ArrowLeft} onClick={back} className="gap-1.5! px-0! py-1.5!">Profile</Button>
        <div className="flex items-center gap-2">{askInChat}<DetailMenu id="person-menu" items={[
          { label: `Report ${name}`, icon: Flag01, onClick: () => setSheet('report') },
          { label: 'Share profile', icon: Share07, onClick: share },
          { label: saved.shown ? 'Saved' : 'Save', icon: saved.shown ? BookmarkCheck : Bookmark, onClick: saved.toggle },
        ]} /></div>
      </div>
      {/* In the panel, the bar sits at the bottom of the layer, as on a place, so the article needs no room for it. */}
      <article className={`mx-auto flex w-full max-w-180 flex-col gap-4 px-5 pt-4 md:px-6 md:py-8 lg:gap-5 lg:py-6 ${panel ? 'pb-6' : 'pb-48'}`}>
        <div className="hidden items-center justify-between gap-2 border-b border-secondary pb-3 lg:flex">
          <Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={back} />
          <div className="flex items-center gap-3">
            {askInChat}
            <Button variant="secondary" size="xs" iconTrailing={Flag01} onClick={() => setSheet('report')}>Report</Button>
            <Button variant="secondary" size="xs" iconTrailing={Share07} onClick={share}>Share</Button>
            <SaveButton kind="people" id={person.id} />
            {panel && <CloseButton onClose={panel.onClose} />}
          </div>
        </div>
        {status && <p role="status" className="text-sm text-tertiary">{status}</p>}
        {person.photos.length
          ? <Photos photos={person.photos} />
          : <span className="flex aspect-3/2 w-full items-center justify-center rounded-xl bg-secondary text-xl font-semibold text-tertiary">{initials(person.fullName)}</span>}
        <header className="flex flex-col gap-1.5 border-b border-secondary pb-4">
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
            <h1 className="text-lg font-semibold text-primary">{person.fullName}</h1>
            {person.verified && <Badge tone="success" size="lg" verified>Verified</Badge>}
            {person.managedByParent && <Badge tone="gray" dot={false}>Managed by a parent</Badge>}
          </div>
          <p className="text-md text-tertiary">{aboutLine(person)}</p>
        </header>
        <MatchBox target={{ kind: 'person', card: person }} against={panel?.against} />
        {person.bio && <p className="rounded-xl border border-secondary bg-secondary p-4 text-sm text-tertiary">“{person.bio}”</p>}
        <Section title={`What ${name} is looking for`}><Facts lines={lookingForFacts} /></Section>
        <Section title={`What ${name} is like`}><Facts lines={likeFacts} gap="gap-3" /></Section>
        <Section title={`What ${name} needs from flatmates`}>
          <dl className="grid grid-cols-2 border-y border-secondary">
            <div className="flex flex-col gap-2 border-r border-secondary p-4 lg:gap-3 lg:px-6">
              <dt className="text-sm font-medium text-secondary">Dealbreakers</dt>
              <dd>{mustHaves.dealbreakers.length ? <Chips items={mustHaves.dealbreakers} className="border-badge-error bg-badge-error text-badge-error" /> : <NotSaid />}</dd>
            </div>
            <div className="flex flex-col gap-2 p-4 lg:gap-3 lg:px-6">
              <dt className="text-sm font-medium text-secondary">Prefers</dt>
              <dd>{mustHaves.prefers.length ? <Chips items={mustHaves.prefers} /> : <NotSaid />}</dd>
            </div>
          </dl>
        </Section>
        <div className="hidden lg:block"><Connect person={person} name={name} onSayHi={() => setSheet('say_hi')} /></div>
      </article>
      <div className={`${panel ? 'sticky' : 'fixed inset-x-0'} bottom-0 z-30 border-t border-secondary bg-primary px-5 py-4 lg:hidden`}>
        <Connect person={person} name={name} onSayHi={() => setSheet('say_hi')} save={<SaveButton kind="people" id={person.id} className="px-3.5 py-2.5" />} />
      </div>
      {sheet === 'say_hi' && <SayHiSheet target={target} onClose={close} />}
      {sheet === 'report' && <ReportSheet target={target} onClose={close} />}
      {shareDialog}
    </>
  )
}
