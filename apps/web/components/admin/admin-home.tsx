'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart01, CpuChip01, File04, Flag01, ShieldTick, Users01 } from '@untitledui/icons'
import { noSiteDetails, type AdminHomeCard } from '@roomsie/contract'
import { errorText } from '../../lib/api'
import { useUser } from '../../lib/auth'
import { india } from '../../lib/ist'
import { percent, rupees } from '../../lib/numbers'
import { useAdminHome } from '../../lib/queries'
import { ago } from '../../lib/reports'
import { Badge } from '../ui/badge'
import { Bar } from '../ui/bar'
import { Change } from './product-numbers'
import { Loading } from '../ui/loading'

const hourOf = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', ...india })
const dayOf = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', ...india })
const siteDetailCount = Object.keys(noSiteDetails).length
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function greeting(now: Date) {
  const hour = Number(hourOf.format(now))
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

const lateOf = (card: AdminHomeCard) =>
  card.subject === 'moderation' ? card.lateSafety + card.lateOther : card.subject === 'id_checks' ? card.late : 0

function Metric({ value, label, badges }: { value: number | string; label: string; badges?: ReactNode }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-display-xs font-semibold text-primary">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</span>
      <span className="flex-1 text-sm text-tertiary">{label}</span>
      {badges}
    </p>
  )
}

function Card({ icon: Icon, title, href, footer, children }: { icon: typeof Flag01; title: string; href: string; footer?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-xl border border-secondary bg-primary p-5 shadow-xs">
      <header className="flex items-center gap-2">
        <Icon size={20} aria-hidden className="text-fg-secondary" />
        <h2 className="flex-1 text-md font-semibold text-primary">{title}</h2>
        <Link href={href} aria-label={`Open ${title}`} className="inline-flex items-center gap-1 text-sm font-semibold text-secondary outline-focus-ring hover:text-primary focus-visible:outline-2">
          Open<ArrowRight size={16} aria-hidden />
        </Link>
      </header>
      {children}
      {footer && <p className="text-sm text-tertiary">{footer}</p>}
    </section>
  )
}

function SubjectCard({ card }: { card: AdminHomeCard }) {
  switch (card.subject) {
    case 'moderation':
      return (
        <Card icon={Flag01} title="Moderation" href="/admin/reports" footer={card.oldestReportAt ? `Oldest report: ${ago(card.oldestReportAt)}` : 'No open reports'}>
          <Metric value={card.openReports} label="Open reports" badges={<>
            {card.lateSafety > 0 && <Badge tone="error" dot={false}>{plural(card.lateSafety, 'safety report late', 'safety reports late')}</Badge>}
            {card.lateOther > 0 && <Badge tone="warning" dot={false}>{`${card.lateOther} late`}</Badge>}
          </>} />
          <Metric value={card.feedbackThisWeek} label="Feedback this week" />
        </Card>
      )
    case 'id_checks':
      return (
        <Card icon={ShieldTick} title="ID checks" href="/admin/id-checks" footer={card.oldestCheckAt ? `Oldest check: ${ago(card.oldestCheckAt)}` : 'No check waits'}>
          <Metric value={card.waiting} label="Waiting for review" badges={card.late > 0 && <Badge tone="error" dot={false}>{`${card.late} late`}</Badge>} />
          <Metric value={card.verifiedThisWeek} label="Verified this week" />
        </Card>
      )
    case 'people_listings':
      return (
        <Card icon={Users01} title="People and listings" href="/admin/people" footer={`${card.hidden} hidden for review · ${card.suspended} suspended`}>
          <Metric value={card.people} label="People with a card" badges={card.newToday > 0 && <Badge tone="success" dot={false}>{`${card.newToday} new today`}</Badge>} />
          <Metric value={card.liveListings} label="Live listings" />
        </Card>
      )
    case 'ai_pipeline':
      return (
        <Card icon={CpuChip01} title="AI pipeline" href="/admin/ai" footer={card.failedShare === null ? 'No numbers of the calls now' : undefined}>
          <Metric value={rupees(card.spendToday)} label={`Spend today, of ${rupees(card.dailyAmount)}`}
            badges={<Badge tone={card.geminiOnly ? 'warning' : 'gray'} dot={false}>{card.geminiOnly ? 'Gemini switch on' : 'Gemini switch off'}</Badge>} />
          <Bar value={card.spendToday} max={card.dailyAmount} label="Spend today" />
          {card.failedShare !== null && <Metric value={percent(card.failedShare)} label="Calls failed today" />}
          {card.fallbackShare !== null && <Metric value={percent(card.fallbackShare)} label="Sent to the fallback today" />}
        </Card>
      )
    case 'product_numbers':
      return (
        <Card icon={BarChart01} title="Product numbers" href="/admin/numbers" footer={card.today ? 'Against yesterday until this time' : 'No numbers now'}>
          {card.today && (
            <>
              <Metric value={card.today.chats.now} label="Chats started today" badges={<Change pair={card.today.chats} />} />
              <Metric value={card.today.newAccounts.now} label="New accounts today" badges={<Change pair={card.today.newAccounts} />} />
              <Metric value={card.today.requests.now} label="Connect requests today" badges={<Change pair={card.today.requests} />} />
            </>
          )}
        </Card>
      )
    case 'site_content':
      return (
        <Card icon={File04} title="Site content" href="/admin/invites">
          <Metric value={card.invites} label="Invites" badges={<Badge tone="gray" dot={false}>{card.inviteOnly ? 'Invite-only' : 'Open to everyone'}</Badge>} />
          <Metric value={card.quotes} label="Quotes" />
          <Metric value={`${card.detailsSet} of ${siteDetailCount}`} label="Site details set" />
        </Card>
      )
  }
}

/** The admin home: one scorecard for each subject that the person can open (T-62, drafts section 36). */
export function AdminHome() {
  const user = useUser()
  const home = useAdminHome()
  const now = new Date()
  const late = home.data ? home.data.cards.reduce((sum, card) => sum + lateOf(card), 0) : 0
  return (
    <main className="flex-1 bg-secondary">
      <div className="mx-auto flex w-full max-w-360 flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-10 lg:px-20">
        <header className="flex flex-col gap-1">
          <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{`${greeting(now)}, ${user.displayName?.split(' ')[0] ?? 'there'}`}</h1>
          <p className="text-md text-tertiary">
            <span className="hidden md:inline">{dayOf.format(now)} · </span>
            {home.data && (late ? `${plural(late, 'thing is', 'things are')} late` : 'Nothing is late')}
          </p>
        </header>
        {home.isError && <p role="alert" className="text-sm text-error-primary">{errorText(home.error)}</p>}
        {home.isPending && <Loading mascot="working" />}
        {home.data && (
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {home.data.cards.map((card) => <SubjectCard key={card.subject} card={card} />)}
          </div>
        )}
      </div>
    </main>
  )
}
