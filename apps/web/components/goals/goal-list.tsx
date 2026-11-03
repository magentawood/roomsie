'use client'

import Link from 'next/link'
import { CheckSquare, ChevronDown, Home02 } from '@untitledui/icons'
import { errorText } from '../../lib/api'
import { deployRefusal, goalHref, useCurrentGoalId } from '../../lib/goals'
import { useGoals } from '../../lib/queries'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

/** The goals of the sidebar and of the phone switcher, newest first (T-50). `onPick`: the switcher closes on a pick. */
export function GoalList({ onPick }: { onPick?: () => void }) {
  const goals = useGoals()
  const currentId = useCurrentGoalId()
  // The API before T-50 has no list, so for the minutes of a deploy the list stays empty.
  if (goals.error && !deployRefusal(goals.error)) return <p role="alert" className="px-3 text-sm text-error-primary">{errorText(goals.error)}</p>
  if (!goals.data?.goals.length) return null
  return (
    <ul aria-label="Your goals" className="flex min-h-0 flex-col gap-1 overflow-y-auto">
      {goals.data.goals.map(({ id, title, status }) => (
        <li key={id}>
          <Link href={goalHref(id)} onClick={onPick} aria-current={id === currentId ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-secondary outline-focus-ring focus-visible:outline-2 ${id === currentId ? 'border-secondary bg-primary shadow-xs' : 'border-transparent hover:bg-primary_hover'}`}>
            <Home02 size={20} aria-hidden className="shrink-0 text-fg-quaternary" />
            <span className="truncate">{title}</span>
            {status === 'closed' && <span className="ml-auto shrink-0"><Badge tone="gray" dot={false}>Closed</Badge></span>}
          </Link>
        </li>
      ))}
    </ul>
  )
}

const switcherId = 'goal-switcher'

/** The bar above the chat: the goal title and "I Found a Place". On a phone the title opens the list of goals (flow 02). */
export function GoalHeader({ title, closed, onFound }: { title: string; closed: boolean; onFound: () => void }) {
  const hideSwitcher = () => document.getElementById(switcherId)?.hidePopover()
  // The profile card can sit above the header on a phone, so the list opens under the title, wherever it is.
  const placeSwitcher = (button: HTMLElement) => { document.getElementById(switcherId)!.style.top = `${button.getBoundingClientRect().bottom + 8}px` }
  return (
    <header className="col-start-1 row-start-1 flex items-center justify-between gap-3 border-b border-secondary px-5 py-3 lg:px-6 lg:py-4">
      <div className="hidden min-w-0 items-center gap-3 lg:flex">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tertiary text-fg-quaternary"><Home02 size={20} aria-hidden /></span>
        <h1 className="truncate text-md font-medium text-primary">{title}</h1>
      </div>
      <button type="button" popoverTarget={switcherId} aria-label={`${title}: your goals`} onClick={(e) => placeSwitcher(e.currentTarget)}
        className="flex min-w-0 items-center gap-1 rounded-md text-md font-medium text-primary outline-focus-ring focus-visible:outline-2 lg:hidden">
        <span className="truncate">{title}</span><ChevronDown size={20} aria-hidden className="shrink-0" />
      </button>
      <div id={switcherId} popover="auto" className="fixed inset-auto left-4 m-0 max-h-[70dvh] w-72 flex-col rounded-md border border-secondary bg-primary p-2 shadow-xl open:flex">
        <GoalList onPick={hideSwitcher} />
      </div>
      {closed ? <Badge tone="gray" dot={false}>Closed</Badge> : (
        <>
          <span className="hidden lg:inline-flex"><Button variant="secondary" size="md" iconLeading={CheckSquare} onClick={onFound}>I Found a Place</Button></span>
          <span className="inline-flex lg:hidden"><Button variant="secondary" size="sm" iconLeading={CheckSquare} label="I found a place" onClick={onFound} /></span>
        </>
      )}
    </header>
  )
}
