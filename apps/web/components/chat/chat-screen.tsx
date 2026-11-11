'use client'

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle, Loading02 } from '@untitledui/icons'
import { capWall, formA, goalResponse, intentsOf, maxCompared, newGoalResponse, noContent, panelReady, tapText, turnResponse, type ChipTap, type FormA, type GoalResponse, type TurnBody } from '@roomsie/contract'
import { ApiError, chatApi, errorText, limitOf } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { canSend, chatStorage, chipsOf, keyAction, readStored, sameMoveOf, tapRefusal, writeStored } from '../../lib/chat'
import { goalHref, newGoalHref, onboardingAgainHref, useCurrentGoalId } from '../../lib/goals'
import { queryKeys, useAreaLabels, useResults } from '../../lib/queries'
import { panelContent } from '../../lib/waitlist'
import { ReplyText } from './reply-text'
import { aboutOf, askedPick, askPlaceholder, compareOf, compareRefusal, isFull, pickOf, questionOf, storedPick, toggledPick, type Picked } from '../../lib/compare'
import { formKey, panelTitle, resultsStack, type Stack } from '../../lib/results'
import { sampleForm, samples, type Preview } from '../../lib/sample-results'
import { ResultsCard } from '../results/results-card'
import { ResultsPanel, useHeldResults, type OpenCard } from '../results/results-panel'
import { LookInMumbai, WaitlistForm, WaitlistLine, WaitlistPanel } from './waitlist'
import { SignInWall } from '../shell/sign-in-wall'
import { Button } from '../ui/button'
import { Loading, mascots } from '../ui/loading'
import { Badge, RemovableBadge } from '../ui/badge'
import { Chips } from './chips'
import { CommuteTip } from './quick-tip'
import { ComparisonTable } from './comparison'
import { FoundFlow } from './found-dialogs'
import { FollowUps, NoticedBox } from './noticed'
import { followUps, noteLines, type FollowUp } from '../../lib/noticed'
import { NotesList } from './notes'
import { SameMoveChips } from './same-move'
import { GoalHeader } from '../goals/goal-list'

/**
 * When the input loses the focus, the space of the phone bar comes back 0.3 s later. A tap in the thread then lands on what the
 * finger pressed: the padding does not move the thread between the press and the release.
 */
const afterTyping = 'transition-[padding] duration-0 delay-300 max-lg:typing:delay-0'

/**
 * It grows to four lines out of its box, over the screen, so the layout never changes while the person types (PD6a).
 * `chips`: the picked cards, in a grey box with the input (Figma 63:4472). The box grows as one, and an unseen copy keeps its space
 * at one line. The input keeps its place in the tree, so a chip that comes or goes keeps the focus. A new `focus` puts the focus in
 * the input, as after "Ask in chat".
 */
function ChatInput({ grow, autoFocus, placeholder = '3 bhk in bandra for 3 friends...', chips, focus = 0, onSend }: {
  grow: 'up' | 'down'; autoFocus?: boolean; placeholder?: string; chips?: ReactNode; focus?: number; onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current!
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])
  useEffect(() => { if (focus) box.current?.focus() }, [focus])
  const send = () => {
    onSend(text.trim())
    setText('')
  }
  const boxed = chips ? 'flex flex-col gap-3 rounded-xl border border-secondary bg-secondary pt-2.5 max-lg:shadow-sm' : ''
  const form = (
    <form onSubmit={(e) => { e.preventDefault(); send() }}
      className={`flex items-end gap-2 rounded-xl border border-secondary bg-primary py-1.75 pr-1.75 pl-2.75 shadow-md lg:px-3.25 lg:py-2.75 focus-within:outline-2 focus-within:outline-focus-ring ${chips ? '-mx-px -mb-px' : ''}`}>
      <textarea ref={box} aria-label="Message" rows={1} autoFocus={autoFocus} value={text} placeholder={placeholder}
        className="max-h-28 flex-1 resize-none bg-transparent py-1 text-md text-primary outline-none placeholder:text-placeholder lg:py-2"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          const action = keyAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing }, text)
          if (action === 'type') return
          e.preventDefault()
          if (action === 'send') send()
        }} />
      <Button type="submit" variant="secondary" size="md" iconLeading={ArrowRight} label="Send" disabled={!canSend(text)} className="max-lg:p-1.5" />
    </form>
  )
  return (
    <div className="relative">
      <div aria-hidden inert className={`invisible ${boxed}`}>{chips}<div className={`h-12 lg:h-16 ${chips ? '-mb-px' : ''}`} /></div>
      <div className={`absolute inset-x-0 z-10 ${grow === 'up' ? 'bottom-0' : 'top-0'} ${boxed}`}>{chips}{form}</div>
    </div>
  )
}

/** "What are we looking for?" of flow 02: the start of a goal, with the place-type chips under the input (T-09). */
function EmptyChat({ onSend, input, children }: { onSend: (text: string) => void; input: { chips: ReactNode; focus: number; placeholder?: string }; children: ReactNode }) {
  return (
    <main className={`isolate flex flex-1 flex-col items-center justify-center gap-6 overflow-hidden bg-chat-glow px-5 pb-27 max-lg:typing:pb-4 ${afterTyping} lg:gap-13 lg:px-6 lg:pb-0`}>
      <div className="flex max-w-126 flex-col items-center gap-3 text-center lg:gap-2">
        <div className="relative">
          <img src="/illustrations/rings.svg" alt="" width={768} height={768} className="pointer-events-none absolute top-1/2 left-1/2 -z-10 max-w-none -translate-1/2" />
          <img src="/illustrations/binoculars.png" alt="" width={137} height={137} className="size-24 lg:size-34" />
        </div>
        <h1 className="text-display-xs font-semibold text-primary lg:text-display-sm">What are we looking for?</h1>
        <p className="text-md font-medium text-secondary lg:text-lg">
          Ask for anything: a room, a flat, a PG, people to live with, commute distance, or tap below and I’ll write it for you.
        </p>
      </div>
      <div className="flex w-full max-w-210 flex-col gap-4">
        <ChatInput grow="down" {...input} onSend={onSend} />
        {children}
        <p className="text-center text-sm text-tertiary">
          Prefer quick questions? <Link href={onboardingAgainHref} className="font-medium text-secondary underline underline-offset-2 outline-focus-ring hover:text-primary focus-visible:outline-2">Answer them here</Link>
        </p>
      </div>
    </main>
  )
}

/** `text` is what the chat shows until the API answers: the message, or the label of the chip. */
type Outgoing = { body: TurnBody; text: string }

/** The goal of the address. */
function useChat() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const router = useRouter()
  const goalId = useCurrentGoalId()
  const goal = useQuery({
    queryKey: queryKeys.goal(goalId ?? ''),
    queryFn: () => chatApi(user, `/v1/goals/${goalId}`, goalResponse),
    enabled: Boolean(goalId) && !loading,
    // The turns of this tab update the cache, so only a reload reads the goal again.
    staleTime: Infinity,
    retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status === 404),
  })
  const gone = goal.error instanceof ApiError && goal.error.status === 404
  useEffect(() => {
    if (!gone) return
    if (readStored(chatStorage.tabGoal) === goalId) writeStored(chatStorage.tabGoal, null)
    router.replace(newGoalHref)
  }, [gone, goalId, router])
  // The Chats tab comes back to this chat for the rest of the visit of the tab.
  const opened = goalId !== null && goal.isSuccess
  useEffect(() => { if (opened) writeStored(chatStorage.tabGoal, goalId) }, [opened, goalId])

  // "What are we looking for?" has no goal yet: the first message or chip makes it, then the address names it (flow 02).
  const startGoal = async () => {
    const { visitorKey, ...started } = await chatApi(user, '/v1/goals', newGoalResponse, { method: 'POST' })
    if (visitorKey) writeStored(chatStorage.visitorKey, visitorKey)
    queryClient.setQueryData<GoalResponse>(queryKeys.goal(started.id), started)
    router.replace(goalHref(started.id))
    return started.id
  }
  const send = useMutation({
    mutationFn: async ({ body }: Outgoing) => {
      const id = goalId ?? await startGoal()
      return { id, ...(await chatApi(user, `/v1/goals/${id}/turns`, turnResponse, { method: 'POST', body })) }
    },
    onSuccess: ({ id, turns, ...rest }) => {
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(id), (old) => ({ status: 'open', ...rest, id, turns: [...(old?.turns ?? []), ...turns] }))
      // A turn can change the title of the goal in the list (T-50).
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
  const turns = goal.data?.turns ?? []
  // A sign-in lifts the cap, and the goal in the cache still has the count of the visitor.
  const typedTurnsLeft = user ? null : goal.data?.typedTurnsLeft ?? null
  return { goalId, turns, form: goal.data?.form ?? emptyForm, outsidePlaces: goal.data?.outsidePlaces ?? [], closed: goal.data?.status === 'closed', goalName: goal.data?.title ?? '', typedTurnsLeft, signedIn: user !== null, send, loadingGoal: goalId !== null && goal.isPending && !gone }
}

const emptyForm = formA.parse({})

/** The results that a reply brought: their form key and the reply. `waited`: their 2 s wait is over. */
type Delivered = { goalId: string; key: string; turnId: string | null; waited: boolean }
/** After a reload, the results card stays under the reply that brought it. */
function storedDelivery(goalId: string | null): Delivered | null {
  try {
    const stored = JSON.parse(readStored(chatStorage.resultsAt) ?? 'null') as Delivered | null
    return stored && stored.goalId === goalId ? { ...stored, waited: true } : null
  } catch {
    return null
  }
}

/**
 * A results card that newer results followed: it stays under the reply that brought it, with its count (the founders,
 * 2026-11-10). Local storage keeps the cards of each goal, the newest 20.
 */
type OldCard = { turnId: string | null; form: FormA; total: number; stack?: Stack }
function storedCards(goalId: string | null): OldCard[] {
  try {
    const all = JSON.parse(readStored(chatStorage.cards) ?? '{}') as Record<string, OldCard[]>
    return goalId ? (all[goalId] ?? []).map((card) => ({ ...card, form: formA.parse(card.form) })) : []
  } catch {
    return []
  }
}
function storeCards(goalId: string, cards: OldCard[]) {
  try {
    const all = JSON.parse(readStored(chatStorage.cards) ?? '{}') as Record<string, OldCard[]>
    writeStored(chatStorage.cards, JSON.stringify({ ...all, [goalId]: cards }))
  } catch {
    // A full or blocked storage keeps the cards until a reload.
  }
}

/** The chat of a goal, and the results of its form beside it (flow 02). */
export function ChatScreen({ preview }: { preview?: Preview }) {
  const { goalId, turns, form: chatForm, outsidePlaces, closed, goalName, typedTurnsLeft, signedIn, send, loadingGoal } = useChat()
  const [failed, setFailed] = useState<string | null>(null)
  const [foundOpen, setFoundOpen] = useState(false)
  const [wall, setWall] = useState(false)
  const [capped, setCapped] = useState(false)
  const pending = send.isPending || failed ? send.variables?.text : undefined
  const areaLabels = useAreaLabels()
  const form = preview ? sampleForm : chatForm
  const ready = panelReady(form)
  const results = useResults(ready && !preview ? form : null)
  const held = useHeldResults(form, preview ? samples[preview] : results.data)
  const shown = ready ? held.shown : null
  const title = shown ? panelTitle(shown.form, (slug) => areaLabels[slug] ?? slug) : ''
  // The panel opens on a send or a card tap, never while the person reads (PD6a). After a close, only a tap opens it.
  // The waitlist screen is the exception: it is the panel of a chat with no Mumbai area, also after a reload (T-22b).
  const [view, setView] = useState<'unopened' | 'split' | 'all' | 'closed'>(preview ? 'split' : 'unopened')
  const panel = preview ? null : panelContent(chatForm, outsidePlaces)
  const newestOutside = outsidePlaces.at(-1)
  // A closed goal is read-only, so it has no waitlist and no area picks (T-50).
  const waitlist = goalId && newestOutside && !closed ? { goalId, place: newestOutside } : null
  const waitlistOpen = panel === 'waitlist' && waitlist !== null && view !== 'closed'
  const [lineClosed, setLineClosed] = useState(false)
  // The card open in the results panel: a card of the results, or an option of a comparison (T-49).
  const [card, setCard] = useState<OpenCard | null>(null)
  // An older card opens its own results in the panel. The panel shows them once they load; until then, the newest results.
  const [viewed, setViewed] = useState<FormA | null>(null)
  const viewedResults = useResults(viewed)
  const viewing = viewed !== null && viewedResults.data !== undefined
  // A selection belongs to the list of results in the panel: the newest, or the list of an older card (T-49). Thus a new search
  // starts a new selection, and Option 1 of a comparison is the best match of that list. `refused`: a fifth card that did not go in.
  const listed = viewing ? viewedResults.data! : shown?.found
  const listKey = viewing ? formKey(viewed!) : shown ? formKey(shown.form) : ''
  const [picks, setPicks] = useState<{ key: string; picked: Picked[]; refused?: string }>({ key: '', picked: [] })
  const mine = picks.key === listKey ? picks : { picked: [] as Picked[], refused: undefined }
  const picked = mine.picked
  const pick = (next: Picked[], card?: Picked) => setPicks({ key: listKey, picked: next, refused: card && isFull(picked, card) ? card.name : undefined })
  // "Ask in chat" puts the focus in the chat input, and the person types the question.
  const [focus, setFocus] = useState(0)
  // "Ask in chat" on the page of a card leaves the card for this chat, one time. It goes in once the list of the panel shows.
  const listSettled = !loadingGoal && (!ready || Boolean(preview) || shown !== null || results.isError)
  useEffect(() => {
    const asked = listSettled ? storedPick(readStored(chatStorage.asked)) : null
    if (!asked) return
    writeStored(chatStorage.asked, null)
    setPicks((now) => {
      const current = now.key === listKey ? now.picked : []
      return { key: listKey, picked: askedPick(current, asked), refused: isFull(current, asked) ? asked.name : undefined }
    })
    setFocus((n) => n + 1)
  }, [listSettled, listKey])
  const atCap = !signedIn && (capped || typedTurnsLeft === 0)
  // The commute tip: the X hides it for good on this browser.
  const [tipClosed, setTipClosed] = useState(() => readStored(chatStorage.commuteTip) !== null)
  const closeTip = () => { setTipClosed(true); writeStored(chatStorage.commuteTip, 'closed') }
  // The results belong to the reply that brought them (the founders, 2026-11-09), and new ones show the wait for at least 2 s.
  const [delivered, setDelivered] = useState<Delivered | null>(() => storedDelivery(goalId))
  // The chat beside the results is 530 px wide (42:12983), and the person can drag the line between them (the founders, 2026-11-10).
  const mainBox = useRef<HTMLElement>(null)
  const [chatWidth, setChatWidth] = useState(() => Number(readStored(chatStorage.chatWidth)) || chatWidthDefault)
  const [oldCards, setOldCards] = useState<{ goalId: string | null; cards: OldCard[] }>(() => ({ goalId, cards: storedCards(goalId) }))
  /** The reply under which the shown results sit: the one that brought them, else the newest reply. */
  const shownAt = () => (delivered && delivered.goalId === goalId && shown && delivered.key === formKey(shown.form)
    ? delivered.turnId : turns.findLast((t) => t.role === 'assistant')?.id ?? null)
  const thread = useRef<HTMLDivElement>(null)
  const newestReply = turns.at(-1)?.role === 'assistant' ? turns.at(-1)!.id : null
  useEffect(() => {
    const box = thread.current
    const item = newestReply ? box?.querySelector<HTMLElement>(`[data-turn="${newestReply}"]`) : null
    // A long reply shows from its start, not from its end (the founders, 2026-11-09).
    if (box && item && item.getBoundingClientRect().top < box.getBoundingClientRect().top) {
      item.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
  }, [newestReply])
  const submit = (turn: Outgoing) => {
    setFailed(null)
    if (shown && view === 'unopened') setView('split')
    send.mutate(turn, {
      onSuccess: (sent) => {
        if (sent.typedTurnsLeft === 0) setWall(true)
        const key = formKey(sent.form)
        // New results replace the older list in the panel. A question about the cards keeps the list, and its selection.
        if (key !== formKey(chatForm)) setViewed(null)
        if (!panelReady(sent.form) || key === formKey(chatForm)) return
        const next = { goalId: sent.id, key, turnId: sent.turns.findLast((t) => t.role === 'assistant')?.id ?? null, waited: false }
        // The card of the results before stays where it was, with its count.
        if (shown && formKey(shown.form) !== key) {
          const kept = [...(oldCards.goalId === sent.id ? oldCards.cards : []), { turnId: shownAt(), form: shown.form, total: shown.found.total, stack: resultsStack(shown.form, shown.found.results) }].slice(-20)
          setOldCards({ goalId: sent.id, cards: kept })
          storeCards(sent.id, kept)
        }
        setDelivered(next)
        writeStored(chatStorage.resultsAt, JSON.stringify(next))
      },
      onError: (err) => {
        const refusal = 'tap' in turn.body ? tapRefusal(errorText(err)) : compareRefusal(errorText(err))
        if (limitOf(err) !== 'turn_cap') return setFailed(refusal ?? errorText(err))
        send.reset()
        setCapped(true)
        setWall(true)
      },
    })
  }
  // One card picked: the message is a question about it. Two cards or more: it gets their comparison (T-49).
  // On a phone the chat comes back, so the answer shows.
  const sendText = (text: string) => {
    const compare = compareOf(picked, listed ? [...listed.results, ...listed.suggested].map((result) => pickOf(result).id) : [])
    if (picked.length) setView('split')
    const asked = questionOf(text, picked)
    submit({ body: { text: asked, ...(compare && { compare }) }, text: asked })
  }
  const tap = (chip: ChipTap) => (atCap ? setWall(true) : submit({ body: { tap: chip }, text: tapText(chip, (slug) => areaLabels[slug] ?? slug) }))
  // A pick in the waitlist screen is a send, so the panel opens with the results once the search is ready.
  const pickArea = (slug: string) => { setView('split'); tap({ slot: 'areas', value: [slug] }) }
  // The chips go away while a reply is pending, and the reply brings the chips of its own question.
  const chipSlot = send.isPending || closed ? null : chipsOf(turns, chatForm)
  const chips = chipSlot && <Chips key={turns.at(-1)?.id} slot={chipSlot} form={chatForm} onTap={tap} />
  // "Same move?" holds the first message until the person picks one of its two chips (Figma 67:6489).
  const sameMove = send.isPending || closed ? null : sameMoveOf(turns)
  // "Roomsie Noticed" and the chips under it follow the newest results, and wait while a reply is on its way (flow 02).
  const areaName = (slug: string) => areaLabels[slug] ?? slug
  const nextSteps = shown && !preview && !send.isPending && !closed
    ? { lines: noteLines(shown.found.noticed, shown.form, areaName), chips: followUps(shown.found, shown.form, areaName) }
    : null
  // "Which one's the best deal?" compares the top cards, and a comparison needs an account (T-49).
  const pickFollowUp = (chip: FollowUp) => {
    if ('tap' in chip) return tap(chip.tap)
    if (!signedIn) return setWall(true)
    // The chip compares the newest results, so the panel shows them.
    setViewed(null)
    setView('split')
    submit({ body: { text: chip.label, compare: chip.compare }, text: chip.label })
  }
  // "Ask in chat" adds the card as a chip above the input and ticks it in the panel (Figma 63:3842). On a phone the chat comes back.
  const askInChat = (asked: Picked) => {
    pick(askedPick(picked, asked), asked)
    setView('split')
    setFocus((n) => n + 1)
  }
  const chipRow = picked.length > 0 && !atCap && (
    <div className="flex flex-col gap-1.5 px-3">
      <div role="group" aria-label="Selected cards" className="flex flex-wrap gap-2.5">
        {picked.map((p) => <RemovableBadge key={p.id} tone="blue" label={p.name} onRemove={() => pick(toggledPick(picked, p))} />)}
      </div>
      {mine.refused && <p role="status" className="text-xs text-tertiary">You can ask about {maxCompared} cards at most. Remove one to add {mine.refused}.</p>}
    </div>
  )
  const input = { chips: chipRow, focus, placeholder: askPlaceholder(picked) }
  const openCard = (next: OpenCard) => {
    setCard(next)
    setView((now) => (now === 'all' ? now : 'split'))
  }

  const currentKey = ready && !preview ? formKey(form) : null
  const fresh = delivered && delivered.goalId === goalId && delivered.key === currentKey ? delivered : null
  // The mascot shows while new results load, and for at least 2 s after a reply brought them. A plain reply shows no wait.
  const waiting = currentKey !== null && !closed && (results.isPending || (fresh !== null && !fresh.waited))
  const tipState = { results: shown !== null && !preview && !waiting, closed, dismissed: tipClosed, picking: picked.length > 0 }
  const anchorId = fresh?.turnId ?? turns.findLast((t) => t.role === 'assistant')?.id ?? null
  const blockKey = shown ? formKey(shown.form) : currentKey
  const resultsBlock = waiting
    ? [<li key={`wait-${currentKey}`} className="motion-safe:animate-fade-in">
        <ResultsWait form={chatForm} areaName={areaName} onWaited={() => setDelivered((d) => d && d.key === currentKey ? { ...d, waited: true } : d)} />
      </li>]
    : shown ? [
      <li key={`card-${blockKey}`} className="motion-safe:animate-fade-in"><ResultsCard title={title} count={shown.found.total} stack={resultsStack(shown.form, shown.found.results)} onOpen={() => { setViewed(null); setView('all') }} /></li>,
      nextSteps && nextSteps.lines.length > 0 && <li key={`noticed-${blockKey}`} className="motion-safe:animate-fade-in"><NoticedBox lines={nextSteps.lines} onTap={tap} /></li>,
      nextSteps && nextSteps.chips.length > 0 && <li key={`next-${blockKey}`} className="motion-safe:animate-fade-in"><FollowUps chips={nextSteps.chips} onPick={pickFollowUp} /></li>,
    ] : []
  const anchored = anchorId !== null && turns.some((t) => t.id === anchorId)
  const olderCards = oldCards.goalId === goalId ? oldCards.cards : []
  const oldCardAt = (card: OldCard, i: number) => (
    <li key={`old-${i}-${formKey(card.form)}`} className="motion-safe:animate-fade-in">
      <ResultsCard title={panelTitle(card.form, areaName)} count={card.total} stack={card.stack ?? resultsStack(card.form, [])} onOpen={() => { setViewed(card.form); setCard(null); setView('all') }} />
    </li>
  )

  if (loadingGoal) return <main className="flex flex-1 items-center justify-center" aria-busy="true"><Loading mascot="searching" /></main>
  if (!turns.length && pending === undefined && !ready) return <EmptyChat onSend={sendText} input={input}>{chips}</EmptyChat>
  const split = (shown !== null && (view === 'split' || view === 'all')) || waitlistOpen
  return (
    <main ref={mainBox} style={{ '--chat-w': `${chatWidth}px` } as CSSProperties}
      className={`relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] ${split ? 'lg:grid-cols-[minmax(0,var(--chat-w))_minmax(0,1fr)]' : ''}`}>
      {split && <SplitHandle width={chatWidth} box={mainBox} onWidth={setChatWidth} />}
      {/* On a phone, "Show all" has its own header (146:29502). The commute tip of a phone sits under the goal header (148:33237). */}
      {!preview && (
        <div className="col-start-1 row-start-1 flex flex-col">
          <GoalHeader title={goalName} closed={closed} phoneHidden={view === 'all'} onFound={() => setFoundOpen(true)} />
          {signedIn && view !== 'all' && <CommuteTip look="phone" state={tipState} onClose={closeTip} />}
        </div>
      )}
      {/* The list grows upward, so a scroll of 0 shows the newest message. A short list stays at the top. */}
      <div ref={thread} className={`col-start-1 row-start-2 flex min-h-0 flex-col-reverse overflow-y-auto ${view === 'all' ? 'max-lg:hidden' : ''}`}>
        <ol className="mb-auto flex flex-col gap-5 px-5 py-4 lg:mx-auto lg:w-full lg:max-w-222 lg:px-6 lg:py-6" aria-live="polite">
          {turns.map((turn) => [
            <li key={turn.id} data-turn={turn.id} className={`motion-safe:animate-fade-in ${turn.role === 'user' ? 'my-3 first:mt-0 last:mb-0 lg:my-5 lg:first:mt-0 lg:last:mb-0' : ''}`}>
              {turn.role === 'user' ? <UserText text={turn.text} /> : (
                <div className="flex flex-col gap-5">
                  <ReplyText text={turn.text} />
                  {turn.comparison && <ComparisonTable table={turn.comparison} onOpen={shown ? openCard : undefined} />}
                  {turn.notes && <NotesList />}
                </div>
              )}
            </li>,
            ...olderCards.map((card, i) => card.turnId === turn.id && oldCardAt(card, i)),
            turn.id === anchorId && resultsBlock,
          ])}
          {olderCards.map((card, i) => !turns.some((t) => t.id === card.turnId) && oldCardAt(card, i))}
          {!anchored && resultsBlock}
          {panel === 'waitlist' && waitlist && (
            // On a phone the form is in the thread (drafts section 18).
            <li className="motion-safe:animate-fade-in lg:hidden"><WaitlistForm key={waitlist.place} {...waitlist} footer={<LookInMumbai onPick={pickArea} />} /></li>
          )}
          {chips && <li className="motion-safe:animate-fade-in">{chips}</li>}
          {sameMove && goalId && <li className="motion-safe:animate-fade-in"><SameMoveChips key={goalId} goalId={goalId} title={sameMove.title} /></li>}
          {pending !== undefined && (
            <li className="mt-3 flex flex-col gap-8 first:mt-0 motion-safe:animate-fade-in lg:mt-5 lg:gap-10 lg:first:mt-0">
              <UserText text={pending} />
              {failed ? <p role="alert" className="text-md text-error-primary">{failed}</p> : <Typing />}
            </li>
          )}
          {results.isError && !results.isFetchNextPageError && (
            <li role="alert" className="flex items-center gap-3 text-sm text-error-primary">
              The results did not load.
              <Button variant="secondary" size="sm" onClick={() => void results.refetch()}>Try again</Button>
            </li>
          )}
        </ol>
      </div>
      <div className={`col-start-1 row-start-3 px-5 pb-19.5 max-lg:typing:pb-3 ${afterTyping} lg:mx-auto lg:w-full lg:max-w-222 lg:px-6 lg:pb-5`}>
        {closed && goalId ? <ClosedBar goalId={goalId} /> : <>
        {/* On a computer the commute tip sits above the input (Alert 94:22712). */}
        {signedIn && <CommuteTip look="computer" state={tipState} onClose={closeTip} />}
        {/* It comes after the first send, so it keeps the focus of the person. */}
        {atCap
          ? <Button variant="primary" size="lg" className="w-full" onClick={() => setWall(true)}>{capWall.title}</Button>
          : <ChatInput grow="up" autoFocus={turns.length > 0 || pending !== undefined} {...input} onSend={sendText} />}
        {typedTurnsLeft !== null && <p className="mt-1.5 text-xs text-tertiary">Free messages remaining: {typedTurnsLeft}</p>}
        </>}
      </div>
      {shown && (
        <div className={`col-start-1 row-start-2 min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:border-l lg:border-secondary ${view === 'all' || card ? 'grid' : 'hidden'} ${split ? 'lg:grid' : 'lg:hidden'}`}>
          {/* The next page is of the newest form, so it loads only while that form is on the screen. */}
          <ResultsPanel form={viewing ? viewed! : shown.form} found={viewing ? viewedResults.data! : shown.found} held={held} sample={Boolean(preview)} card={card} onCard={setCard}
            notice={panel === 'results-with-line' && waitlist && !lineClosed ? <WaitlistLine {...waitlist} onClose={() => setLineClosed(true)} /> : undefined}
            more={viewing ? (viewedResults.hasNextPage ? viewedResults : undefined) : results.hasNextPage && formKey(shown.form) === formKey(form) ? results : undefined}
            onClose={() => { setViewed(null); setView('closed') }} onAskInChat={askInChat}
            picks={{ picked, onPick: (p) => pick(toggledPick(picked, p), p), onClear: () => pick([]) }} />
        </div>
      )}
      {panel === 'waitlist' && waitlist && (
        <div className={`hidden min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:border-l lg:border-secondary ${waitlistOpen ? 'lg:grid' : ''}`}>
          <WaitlistPanel key={waitlist.place} {...waitlist} onPick={pickArea} onClose={() => setView('closed')} />
        </div>
      )}
      {wall && !signedIn && <SignInWall title={capWall.title} text={capWall.text} onClose={() => setWall(false)} />}
      {foundOpen && goalId && <FoundFlow goalId={goalId} title={goalName} onDone={() => setFoundOpen(false)} />}
    </main>
  )
}

/** The chat of the designs beside the results, and the narrowest chat and results that still read well. */
const chatWidthDefault = 530
const chatWidthMin = 360
const panelWidthMin = 420

/**
 * The line between the chat and the results: a drag, or the arrow keys, change the width of the chat, and a double click gives back
 * the 530 px of the designs. The width stays for the next visit.
 */
function SplitHandle({ width, box, onWidth }: { width: number; box: RefObject<HTMLElement | null>; onWidth: (width: number) => void }) {
  const fit = (next: number) => {
    const room = box.current?.getBoundingClientRect().width ?? next + panelWidthMin
    return Math.round(Math.min(Math.max(next, chatWidthMin), room - panelWidthMin))
  }
  const keep = (next: number) => { onWidth(next); writeStored(chatStorage.chatWidth, String(next)) }
  return (
    <div role="separator" aria-orientation="vertical" aria-label="Resize the chat" aria-valuenow={width} aria-valuemin={chatWidthMin} tabIndex={0}
      style={{ left: width }}
      className="group absolute inset-y-0 z-20 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none outline-focus-ring focus-visible:outline-2 lg:block"
      onPointerDown={(e) => {
        const handle = e.currentTarget
        handle.setPointerCapture(e.pointerId)
        // No text gets selected while the line moves; the double click still comes.
        document.body.style.userSelect = 'none'
        const left = box.current?.getBoundingClientRect().left ?? 0
        const move = (ev: PointerEvent) => onWidth(fit(ev.clientX - left))
        const end = (ev: PointerEvent) => {
          handle.removeEventListener('pointermove', move)
          handle.removeEventListener('pointerup', end)
          document.body.style.userSelect = ''
          keep(fit(ev.clientX - left))
        }
        handle.addEventListener('pointermove', move)
        handle.addEventListener('pointerup', end)
      }}
      onDoubleClick={() => keep(fit(chatWidthDefault))}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          keep(fit(width + (e.key === 'ArrowLeft' ? -16 : 16)))
        }
      }}>
      <span className="mx-auto block h-full w-px bg-transparent transition-colors group-hover:w-0.5 group-hover:bg-brand-solid group-focus-visible:bg-brand-solid group-active:w-0.5 group-active:bg-brand-solid" />
    </div>
  )
}

const stepTimes = [700, 1400]
/** The shortest wait for new results (the founders, 2026-11-09). */
const minWaitMs = 2000
/** The mascot of each step of the wait: it reads, it searches, it picks at its laptop. */
const stepMascots = [mascots.chatting, mascots.searching, mascots.working]
/** The wait for a reply (flow 02): a moving mascot for each step, and the steps of the search. A step ticks after a short time, and the last one turns until the reply. */
function Thinking({ form, areaName }: { form: FormA; areaName: (slug: string) => string }) {
  const [done, setDone] = useState(0)
  useEffect(() => {
    const timers = stepTimes.map((ms, step) => setTimeout(() => setDone(step + 1), ms))
    return () => timers.forEach(clearTimeout)
  }, [])
  const what = intentsOf(form)[0] === 'flatmates' ? 'people' : 'places'
  const areas = form.areas.value ?? []
  const steps = ['Reading what you said', `Looking through ${what} ${areas.length ? `around ${areas.map(areaName).join(', ')}` : 'in Mumbai'}`, 'Picking the best ones for you']
  return (
    <div role="status" className="flex items-center gap-4 lg:gap-2.5">
      <span className="shrink-0 motion-safe:animate-mascot">
        <img key={done} src={stepMascots[Math.min(done, stepMascots.length - 1)]} alt="" width={160} height={160} className="size-24 motion-safe:animate-mascot-in lg:size-28" />
      </span>
      <ul className="flex min-w-0 flex-col gap-1 text-sm text-secondary lg:gap-1.5 lg:px-3 lg:py-2">
        {steps.slice(0, done + 1).map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            {i < done
              ? <CheckCircle size={16} aria-hidden className="shrink-0 text-fg-success" />
              : <Loading02 size={16} aria-hidden className="shrink-0 text-fg-quaternary motion-safe:animate-spin" />}
            <span className="truncate">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The wait for new results: the mascot and its steps, for at least `minWaitMs`. */
function ResultsWait({ form, areaName, onWaited }: { form: FormA; areaName: (slug: string) => string; onWaited: () => void }) {
  const done = useRef(onWaited)
  useEffect(() => { done.current = onWaited })
  useEffect(() => {
    const timer = setTimeout(() => done.current(), minWaitMs)
    return () => clearTimeout(timer)
  }, [])
  return <Thinking form={form} areaName={areaName} />
}

/** The wait for a plain reply: three dots, as a chat app has. */
function Typing() {
  return (
    <div role="status" aria-label="Roomsie is typing" className="flex w-fit items-center gap-1 rounded-xl bg-secondary px-3 py-2.5">
      {[0, 150, 300].map((delay) => <span key={delay} style={{ animationDelay: `${delay}ms` }} className="size-1.5 rounded-full bg-brand-solid opacity-30 motion-safe:animate-typing" />)}
    </div>
  )
}

/** A question about one card shows the card as a chip over the message (`aboutOf`). */
function UserText({ text }: { text: string }) {
  const about = aboutOf(text)
  return (
    <div className="ml-auto flex w-fit max-w-63.5 flex-col items-start gap-1.5 rounded-xl border border-secondary bg-primary px-2.75 py-1.75 lg:max-w-100">
      {about && <Badge tone="blue" dot={false}>{about.name}</Badge>}
      <p className="text-md whitespace-pre-wrap text-primary">{about?.text ?? text}</p>
    </div>
  )
}

/** A closed goal is read-only: its chat and its results stay, and "Reopen" opens it again (T-50). */
function ClosedBar({ goalId }: { goalId: string }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const reopen = useMutation({
    mutationFn: () => chatApi(user, `/v1/goals/${goalId}/reopen`, noContent, { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(goalId), (old) => old && { ...old, status: 'open' })
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals })
    },
  })
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-secondary bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium text-secondary">You closed this goal.</p>
      <div className="flex gap-3">
        <Button variant="secondary" size="sm" disabled={reopen.isPending} onClick={() => reopen.mutate()}>Reopen</Button>
        <Button variant="primary" size="sm" href={newGoalHref}>Start a new goal</Button>
      </div>
      {reopen.error && <p role="alert" className="text-sm text-error-primary">{errorText(reopen.error)}</p>}
    </div>
  )
}
