'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, DotsVertical, Home02, Plus, User01 } from '@untitledui/icons'
import type { CompareKind } from '@roomsie/contract'
import { ApiError, errorText } from '../../lib/api'
import { chatStorage, lastOpenGoal, readStored, writeStored } from '../../lib/chat'
import type { Picked } from '../../lib/compare'
import { goalHref, newGoalHref } from '../../lib/goals'
import { didntSay } from '../../lib/place-detail'
import { useGoals } from '../../lib/queries'
import { savedHref } from '../../lib/saved'
import { Button, type Icon } from '../ui/button'
import { EmptyState } from '../ui/empty-state'
import type { Card } from '../../lib/share'
import type { Against } from './match-box'
import { ShareDialog } from './share-dialog'

/**
 * A detail in the results panel of the chat (T-15). On a phone it is a layer over the chat. `onClose` closes the detail and the panel,
 * as the X of the panel. `onAskInChat` adds the card as a chip above the chat input. `against`: what the match box compares with.
 */
export type DetailPanel = { onBack: () => void; onClose: () => void; onAskInChat: (card: Picked) => void; against: Against }

/**
 * "Ask in chat" of a detail: the card goes as a blue chip above the chat input (Figma 63:3842), and the person types the question.
 * In the panel the chat adds it at once. On a page it opens the last chat, which adds it.
 */
export function AskInChat({ card, panel }: { card: Picked; panel?: DetailPanel }) {
  const router = useRouter()
  const goals = useGoals()
  const ask = () => {
    if (panel) return panel.onAskInChat(card)
    writeStored(chatStorage.asked, JSON.stringify(card))
    const id = lastOpenGoal(readStored(chatStorage.tabGoal), goals.data?.goals ?? [])
    router.push(id ? goalHref(id) : newGoalHref)
  }
  return <Button variant="secondary" size="xs" iconTrailing={Plus} onClick={ask}>Ask in chat</Button>
}

/** A part of a detail with no answer. */
export const NotSaid = () => <p className="text-sm text-tertiary">{didntSay}</p>

export type Fact = { label: string; value: string; icon: Icon }

/** `gap`: icon to text. The designs use 8, and 12 in some tables (house rules, nearby, lifestyle). */
export function Facts({ lines, gap = 'gap-2' }: { lines: Fact[]; gap?: string }) {
  return (
    <dl className="grid grid-cols-2 border-t border-secondary">
      {lines.map((l) => (
        <div key={l.label} className={`flex border-b border-secondary px-4 py-4 odd:border-r lg:pr-6 lg:pb-3.75 ${gap}`}>
          <l.icon size={16} aria-hidden className="shrink-0 text-fg-quaternary" />
          <div className="flex flex-col text-sm"><dt className="font-medium text-secondary">{l.label}</dt><dd className="text-tertiary">{l.value}</dd></div>
        </div>
      ))}
    </dl>
  )
}

export function Chips({ items, className = 'border-secondary bg-secondary text-secondary' }: { items: string[]; className?: string }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item) => <li key={item} className={`rounded-full border px-1.75 py-px text-xs font-medium ${className}`}>{item}</li>)}
    </ul>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="flex flex-col gap-4"><h2 className="text-md font-semibold text-primary">{title}</h2>{children}</section>
}

export function Photos({ photos }: { photos: { key: string; url: string }[] }) {
  const [shown, setShown] = useState(0)
  if (!photos.length) return null
  return (
    <div className="flex flex-col gap-2 md:flex-row lg:gap-4">
      <img src={photos[shown]!.url} alt={`Photo ${shown + 1} of ${photos.length}`} className="aspect-3/2 w-full rounded-xl object-cover md:min-w-0 md:flex-1" />
      {photos.length > 1 && (
        <ul className="flex gap-2 md:w-28 md:flex-col lg:w-27.25 lg:gap-4">
          {photos.map((p, i) => (
            <li key={p.key}>
              <button type="button" aria-label={`Show photo ${i + 1}`} aria-pressed={i === shown} onClick={() => setShown(i)}
                className={`block overflow-hidden rounded-md outline-focus-ring focus-visible:outline-2 ${i === shown ? 'ring-2 ring-brand' : ''}`}>
                <img src={p.url} alt="" className="aspect-square w-16 object-cover md:aspect-4/3 md:w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type MenuItem = { label: string; icon: Icon; onClick: () => void; danger?: boolean }

export function DetailMenu({ id, items }: { id: string; items: MenuItem[] }) {
  return (
    <>
      <button type="button" popoverTarget={id} aria-label="More" className="rounded-md border border-primary p-1.75 text-fg-quaternary shadow-xs outline-focus-ring focus-visible:outline-2">
        <DotsVertical size={16} aria-hidden />
      </button>
      <div id={id} popover="auto" className="fixed inset-auto top-12.5 right-5 m-0 w-50 rounded-md border border-secondary bg-primary px-0 py-1 shadow-xl">
        {items.map((item) => (
          <button key={item.label} type="button" popoverTarget={id} popoverTargetAction="hide" onClick={item.onClick}
            className={`flex w-full items-center gap-2 rounded-sm px-3.5 py-2.5 text-sm font-medium hover:bg-primary_hover ${item.danger ? 'text-error-primary' : 'text-secondary'}`}>
            <item.icon size={16} aria-hidden className={item.danger ? 'text-fg-error' : 'text-fg-quaternary'} />{item.label}
          </button>
        ))}
      </div>
    </>
  )
}

/** The Share modal of a card (T-50), and the line that tells what it did. */
export function useShare(title: string, card: Card) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const done = (line: string | null) => {
    setOpen(false)
    if (!line) return
    setStatus(line)
    setTimeout(() => setStatus(null), 3000)
  }
  const dialog = open && <ShareDialog title={title} card={card} onDone={done} />
  return { share: () => setOpen(true), status, dialog }
}

/** Back, or the saved tab of the kind when the detail opened in a new tab. */
export function useBack(saved: string) {
  const router = useRouter()
  return () => (window.history.length > 1 ? router.back() : router.push(saved))
}

/**
 * A card that does not load. A hidden card, a block, an unknown card and a bad id look the same, so a block does not show.
 * `inPanel`: the chat has the main landmark.
 */
export function Unavailable({ kind, error, onBack, inPanel }: { kind: CompareKind; error: Error; onBack: () => void; inPanel?: boolean }) {
  if (!(error instanceof ApiError && [400, 404].includes(error.status))) return <p role="alert" className="p-6 text-sm text-error-primary">{errorText(error)}</p>
  const saved = kind === 'place' ? savedHref.places : savedHref.people
  const Box = inPanel ? 'div' : 'main'
  return (
    <Box className="flex flex-1 flex-col px-5 py-5 md:px-6">
      <span><Button variant="secondary" size="xs" iconLeading={ArrowLeft} label="Back" onClick={onBack} /></span>
      {kind === 'place'
        ? (
          <EmptyState icon={Home02} title="This place is no longer listed."
            action={<div className="flex gap-3"><Button variant="secondary" size="md" href={saved}>See saved places</Button><Button variant="primary" size="md" href="/">Start looking</Button></div>}>
            The lister filled, paused or removed it.
          </EmptyState>
        )
        : (
          <EmptyState icon={User01} title="This card is not available"
            action={<div className="flex gap-3"><Button variant="secondary" size="md" href={saved}>See saved people</Button><Button variant="primary" size="md" href="/">Start looking</Button></div>}>
            The person hid the card, or it is no longer on roomsie.
          </EmptyState>
        )}
    </Box>
  )
}
