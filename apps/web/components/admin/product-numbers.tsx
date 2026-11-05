'use client'

import type { CloseAnswer, FunnelStep, NumberPeriod, ProductNumbersResponse, RateLimit, ReportReason } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { istDay } from '../../lib/ist'
import { inIndianDigits, percent } from '../../lib/numbers'
import { profileLabels } from '../../lib/profile-form'
import { useProductNumbers } from '../../lib/queries'
import { reasonLabels } from '../../lib/reports'
import { Badge } from '../ui/badge'
import { Bar } from '../ui/bar'
import { cardClass, numberTabs, SubjectPage } from './admin-page'

type Numbers = NonNullable<ProductNumbersResponse['numbers']>
type Pair = Numbers['newAccounts']

const stepLabels: Record<FunnelStep, string> = {
  chats: 'Chats started', results: 'Results shown', wall: 'Sign-in wall', signedIn: 'Signed in', requests: 'Connect requests', accepted: 'Requests accepted', closed: 'Goals closed',
}
/** The unit of a step, as the next step names it. */
const stepUnits: Record<FunnelStep, [one: string, many: string]> = {
  chats: ['chat', 'chats'], results: ['result', 'results'], wall: ['wall hit', 'wall hits'], signedIn: ['sign-in', 'sign-ins'],
  requests: ['request', 'requests'], accepted: ['accept', 'accepts'], closed: ['close', 'closes'],
}
const whereLabels: Record<CloseAnswer, string> = { roomsie: 'On roomsie', elsewhere: 'Somewhere else', dropped: 'Stopped looking' }
const limitLabels: Record<RateLimit, string> = {
  device: 'Too many chats from one device', too_fast: 'Sending too fast', ip: 'Too many chats from one network', ip_range: 'Too many from one network range',
}
const reportLabels: Record<ReportReason, string> = { ...reasonLabels('listing'), fake: 'Fake profile or listing' }
const slotLabels: Record<string, string> = {
  intent: 'Room or flatmate', roomType: 'Room type', whosMoving: 'Who moves', areas: 'Area', budget: 'Budget', moveDate: 'Move date',
  ...Object.fromEntries(Object.entries(profileLabels.axes).map(([axis, label]) => [`lifestyle.${axis}`, label])),
  ...Object.fromEntries(Object.entries(profileLabels.mustHaves).map(([key, label]) => [`mustHaves.${key}`, label])),
}
const intros: Record<NumberPeriod, string> = {
  today: 'Today until now, against yesterday until the same time.',
  week: 'The 7 whole days that end yesterday, against the 7 days before them.',
  month: 'The 30 whole days that end yesterday, against the 30 days before them.',
}
const titles: Record<NumberPeriod, string> = { today: 'The funnel, today', week: 'The funnel, last 7 days', month: 'The funnel, last 30 days' }

/** The change against the period before. Under 20 before, the change is a count: a percent of a small count jumps. */
export function Change({ pair, neutral = false }: { pair: Pair; neutral?: boolean }) {
  const change = pair.now - pair.before
  if (change === 0) return <Badge tone="gray" dot={false}>Same</Badge>
  const size = pair.before < 20 ? inIndianDigits(Math.abs(change)) : percent(Math.abs(change) / pair.before)
  return <Badge tone={neutral ? 'gray' : change > 0 ? 'success' : 'error'} dot={false}>{`${change > 0 ? '▲' : '▼'} ${size}`}</Badge>
}

/** "83% of chats", or "1.4 for each chat" when a step is larger than the step before it. */
function shareOf(now: number, before: number, [one, many]: [string, string]) {
  if (before === 0) return null
  return now > before ? `${(now / before).toLocaleString('en-IN', { maximumFractionDigits: 1 })} for each ${one}` : `${percent(now / before)} of ${many}`
}

function Funnel({ period, from, to, numbers }: { period: NumberPeriod; from: string; to: string; numbers: Numbers }) {
  const largest = Math.max(...numbers.steps.map((s) => s.now))
  const found = numbers.where.find((row) => row.value === 'roomsie')?.count ?? 0
  const extras: Partial<Record<FunnelStep, string>> = { signedIn: `${inIndianDigits(numbers.newAccounts.now)} new accounts`, closed: `${inIndianDigits(found)} found on roomsie` }
  const noteOf = (step: Numbers['steps'][number], index: number) => {
    const before = numbers.steps[index - 1]
    return [before && shareOf(step.now, before.now, stepUnits[before.step]), extras[step.step]].filter(Boolean).join(' · ')
  }
  return (
    <section aria-label={titles[period]} className={`${cardClass} gap-4`}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-lg font-semibold text-primary">{titles[period]}</h2>
        <p className="text-sm text-tertiary">{period === 'today' ? 'Until now, in IST' : `${istDay(from, 'short')} to ${istDay(to, 'short')}, counted each night at 00:30`}</p>
      </header>
      <ol className="flex flex-col gap-3">
        {numbers.steps.map((step, index) => {
          const note = noteOf(step, index)
          return (
            <li key={step.step} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 md:grid-cols-[11rem_1fr_4rem_5rem]">
              <p className="flex flex-col text-sm">
                <span className="font-medium text-primary">{stepLabels[step.step]}</span>
                {note && <span className="text-tertiary">{note}</span>}
              </p>
              <Bar value={step.now} max={largest} label={stepLabels[step.step]} className="order-last col-span-2 h-3 w-full md:order-none md:col-span-1 md:h-7" />
              <p className="flex items-center gap-2 md:contents">
                <span className="text-lg font-semibold text-primary">{inIndianDigits(step.now)}</span>
                <span className="justify-self-start"><Change pair={step} neutral={step.step === 'wall'} /></span>
              </p>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function SideCard({ title, rows, labels }: { title: string; rows: Numbers['where']; labels: Record<string, string> }) {
  return (
    <section aria-label={title} className={cardClass}>
      <h2 className="text-lg font-semibold text-primary">{title}</h2>
      {rows.length ? (
        <ul className="flex flex-col gap-2 text-sm">
          {rows.map((row) => (
            <li key={row.value} className="flex justify-between gap-3">
              <span className="text-secondary">{labels[row.value] ?? row.value}</span>
              <span className="font-medium text-primary">{inIndianDigits(row.count)}</span>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-tertiary">None in this period.</p>}
    </section>
  )
}

/** The funnel of a period against the period before, and the side cards (T-66, drafts section 40). */
function ProductNumbers({ period }: { period: NumberPeriod }) {
  const query = useProductNumbers(period)
  if (query.isError) return <p role="alert" className="text-sm text-error-primary">{errorText(query.error)}</p>
  if (query.isPending) return <p className="text-sm text-tertiary">Loading…</p>
  const { from, to, numbers: data } = query.data
  if (!data) return <p className="text-sm text-tertiary">No numbers: the analytics database is not set, or it did not answer.</p>
  return (
    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_28rem]">
      <Funnel period={period} from={from} to={to} numbers={data} />
      <div className="flex flex-col gap-4">
        <SideCard title="Where people found it" rows={data.where} labels={whereLabels} />
        <SideCard title="Limits that stopped people" rows={data.limits} labels={limitLabels} />
        <SideCard title="Reports filed" rows={data.reports} labels={reportLabels} />
        <SideCard title="Answers that changed" rows={data.answers} labels={slotLabels} />
      </div>
    </div>
  )
}

/** A tab of the product numbers: `/admin/numbers`, `/week` or `/month`. */
export function NumbersPage({ period }: { period: NumberPeriod }) {
  return (
    <SubjectPage role="moderator" title="Product numbers" tabs={numberTabs} intro={`${intros[period]} The numbers count the analytics events, and no event holds the text of a person.`}>
      <ProductNumbers period={period} />
    </SubjectPage>
  )
}
