'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle, Loading02 } from '@untitledui/icons'
import { capWall, formA, goalResponse, intentsOf, newGoalResponse, noContent, panelReady, tapText, turnResponse, type ChipTap, type FormA, type GoalResponse, type TurnBody } from '@roomsie/contract'
import { ApiError, chatApi, errorText, limitOf } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { canSend, chatStorage, chipsOf, keyAction, readStored, sameMoveOf, tapRefusal, writeStored } from '../../lib/chat'
import { goalHref, newGoalHref, onboardingAgainHref, useCurrentGoalId } from '../../lib/goals'
import { queryKeys, useAreaLabels, useResults } from '../../lib/queries'
import { panelContent } from '../../lib/waitlist'
import { compareOf, compareRefusal, pickOf, toggledPick, type Picked } from '../../lib/compare'
import { formKey, panelTitle } from '../../lib/results'
import { sampleForm, samples, type Preview } from '../../lib/sample-results'
import { ResultsCard } from '../results/results-card'
import { ResultsPanel, useHeldResults, type OpenCard } from '../results/results-panel'
import { LookInMumbai, WaitlistForm, WaitlistLine, WaitlistPanel } from './waitlist'
import { SignInWall } from '../shell/sign-in-wall'
import { Button } from '../ui/button'
import { Loading, mascots } from '../ui/loading'
import { RemoveChip } from '../ui/choice'
import { Chips } from './chips'
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

/** It grows to four lines out of its box, over the screen, so the layout never changes while the person types (PD6a). */
function ChatInput({ grow, autoFocus, initialText = '', placeholder = '3 bhk in bandra for 3 friends...', onSend }: {
  grow: 'up' | 'down'; autoFocus?: boolean; initialText?: string; placeholder?: string; onSend: (text: string) => void
}) {
  const [text, setText] = useState(initialText)
  const box = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = box.current!
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [text])
  const send = () => {
    onSend(text.trim())
    setText('')
  }
  return (
    <div className="relative h-12 lg:h-16">
      <form onSubmit={(e) => { e.preventDefault(); send() }}
        className={`absolute inset-x-0 z-10 flex items-end gap-2 rounded-xl border border-secondary bg-primary py-1.75 pr-1.75 pl-2.75 shadow-md lg:px-3.25 lg:py-2.75 focus-within:outline-2 focus-within:outline-focus-ring ${grow === 'up' ? 'bottom-0' : 'top-0'}`}>
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
    </div>
  )
}

/** "What are we looking for?" of flow 02: the start of a goal, with the place-type chips under the input (T-09). */
function EmptyChat({ onSend, draft, children }: { onSend: (text: string) => void; draft: { text: string; version: number }; children: React.ReactNode }) {
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
        <ChatInput key={draft.version} grow="down" autoFocus={draft.version > 0} initialText={draft.text} onSend={onSend} />
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
  const [draft, setDraft] = useState({ text: '', version: 0 })
  // "Ask in chat" on the page of a card leaves its draft for the input, one time.
  useEffect(() => {
    const text = readStored(chatStorage.draft)
    if (!text) return
    writeStored(chatStorage.draft, null)
    setDraft(({ version }) => ({ text, version: version + 1 }))
  }, [])
  // The card open in the results panel: a card of the results, or an option of a comparison (T-49).
  const [card, setCard] = useState<OpenCard | null>(null)
  // A selection belongs to one list of results, so a new search starts a new one, and Option 1 is always the best match (T-49).
  const [picks, setPicks] = useState({ key: '', picked: [] as Picked[] })
  const resultsKey = shown ? formKey(shown.form) : ''
  const picked = picks.key === resultsKey ? picks.picked : []
  const setPicked = (next: Picked[]) => setPicks({ key: resultsKey, picked: next })
  const atCap = !signedIn && (capped || typedTurnsLeft === 0)
  // The results belong to the reply that brought them (the founders, 2026-11-09), and new ones show the wait for at least 2 s.
  const [delivered, setDelivered] = useState<Delivered | null>(() => storedDelivery(goalId))
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
        if (!panelReady(sent.form) || key === formKey(chatForm)) return
        const next = { goalId: sent.id, key, turnId: sent.turns.findLast((t) => t.role === 'assistant')?.id ?? null, waited: false }
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
  // With two cards or more selected, a question gets their comparison (T-49). On a phone the chat comes back, so the answer shows.
  const sendText = (text: string) => {
    const compare = compareOf(picked, shown ? [...shown.found.results, ...shown.found.suggested].map((result) => pickOf(result).id) : [])
    if (compare) setView('split')
    submit({ body: { text, ...(compare && { compare }) }, text })
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
    setView('split')
    submit({ body: { text: chip.label, compare: chip.compare }, text: chip.label })
  }
  const askInChat = (text: string) => {
    setDraft(({ version }) => ({ text, version: version + 1 }))
    setView('split')
  }
  const openCard = (next: OpenCard) => {
    setCard(next)
    setView((now) => (now === 'all' ? now : 'split'))
  }

  const currentKey = ready && !preview ? formKey(form) : null
  const fresh = delivered && delivered.goalId === goalId && delivered.key === currentKey ? delivered : null
  // The mascot shows while new results load, and for at least 2 s after a reply brought them. A plain reply shows no wait.
  const waiting = currentKey !== null && !closed && (results.isPending || (fresh !== null && !fresh.waited))
  const anchorId = fresh?.turnId ?? turns.findLast((t) => t.role === 'assistant')?.id ?? null
  const blockKey = shown ? formKey(shown.form) : currentKey
  const resultsBlock = waiting
    ? [<li key={`wait-${currentKey}`} className="motion-safe:animate-fade-in">
        <ResultsWait form={chatForm} areaName={areaName} onWaited={() => setDelivered((d) => d && d.key === currentKey ? { ...d, waited: true } : d)} />
      </li>]
    : shown ? [
      <li key={`card-${blockKey}`} className="motion-safe:animate-fade-in"><ResultsCard title={title} count={shown.found.total} onOpen={() => setView('all')} /></li>,
      nextSteps && nextSteps.lines.length > 0 && <li key={`noticed-${blockKey}`} className="motion-safe:animate-fade-in"><NoticedBox lines={nextSteps.lines} onTap={tap} /></li>,
      nextSteps && nextSteps.chips.length > 0 && <li key={`next-${blockKey}`} className="motion-safe:animate-fade-in"><FollowUps chips={nextSteps.chips} onPick={pickFollowUp} /></li>,
    ] : []
  const anchored = anchorId !== null && turns.some((t) => t.id === anchorId)

  if (loadingGoal) return <main className="flex flex-1 items-center justify-center" aria-busy="true"><Loading mascot="searching" /></main>
  if (!turns.length && pending === undefined && !ready) return <EmptyChat onSend={sendText} draft={draft}>{chips}</EmptyChat>
  const split = (shown !== null && (view === 'split' || view === 'all')) || waitlistOpen
  return (
    <main className={`grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] ${split ? 'lg:grid-cols-[minmax(0,33.125rem)_minmax(0,1fr)]' : ''}`}>
      {/* On a phone, "Show all" has its own header (146:29502). */}
      {!preview && <GoalHeader title={goalName} closed={closed} phoneHidden={view === 'all'} onFound={() => setFoundOpen(true)} />}
      {/* The list grows upward, so a scroll of 0 shows the newest message. A short list stays at the top. */}
      <div ref={thread} className={`col-start-1 row-start-2 flex min-h-0 flex-col-reverse overflow-y-auto ${view === 'all' ? 'max-lg:hidden' : ''}`}>
        <ol className="mb-auto flex flex-col gap-5 px-5 py-4 lg:mx-auto lg:w-full lg:max-w-222 lg:px-6 lg:py-6" aria-live="polite">
          {turns.map((turn) => [
            <li key={turn.id} data-turn={turn.id} className={`motion-safe:animate-fade-in ${turn.role === 'user' ? 'my-3 first:mt-0 last:mb-0 lg:my-5 lg:first:mt-0 lg:last:mb-0' : ''}`}>
              {turn.role === 'user' ? <UserText text={turn.text} /> : (
                <div className="flex flex-col gap-5">
                  <p className="text-md whitespace-pre-wrap text-primary">{turn.text}</p>
                  {turn.comparison && <ComparisonTable table={turn.comparison} onOpen={shown ? openCard : undefined} />}
                  {turn.notes && <NotesList />}
                </div>
              )}
            </li>,
            turn.id === anchorId && resultsBlock,
          ])}
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
        {picked.length > 0 && !atCap && (
          <div className="mb-3 flex flex-col gap-1.5 pt-2.5">
            <div role="group" aria-label="Selected to compare" className="flex flex-wrap gap-2.5 px-3">
              {picked.map((card) => <RemoveChip key={card.id} small label={card.name} onRemove={() => setPicked(toggledPick(picked, card))} />)}
            </div>
            {picked.length === 1 && <p className="text-xs text-tertiary">Select one more card to compare.</p>}
          </div>
        )}
        {/* It comes after the first send, so it keeps the focus of the person. "Ask in chat" starts a new draft. */}
        {atCap
          ? <Button variant="primary" size="lg" className="w-full" onClick={() => setWall(true)}>{capWall.title}</Button>
          : <ChatInput key={draft.version} grow="up" autoFocus={turns.length > 0 || pending !== undefined || draft.version > 0} initialText={draft.text} onSend={sendText}
              placeholder={picked[0] && (picked[0].kind === 'place' ? 'Ask about the listings…' : 'Ask about these people…')} />}
        {typedTurnsLeft !== null && <p className="mt-1.5 text-xs text-tertiary">Free messages remaining: {typedTurnsLeft}</p>}
        </>}
      </div>
      {shown && (
        <div className={`col-start-1 row-start-2 min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:border-l lg:border-secondary ${view === 'all' || card ? 'grid' : 'hidden'} ${split ? 'lg:grid' : 'lg:hidden'}`}>
          {/* The next page is of the newest form, so it loads only while that form is on the screen. */}
          <ResultsPanel title={title} form={shown.form} found={shown.found} held={held} sample={Boolean(preview)} card={card} onCard={setCard}
            notice={panel === 'results-with-line' && waitlist && !lineClosed ? <WaitlistLine {...waitlist} onClose={() => setLineClosed(true)} /> : undefined}
            more={results.hasNextPage && formKey(shown.form) === formKey(form) ? results : undefined} onClose={() => setView('closed')} onAskInChat={askInChat}
            picks={{ picked, onPick: (card) => setPicked(toggledPick(picked, card)), onClear: () => setPicked([]) }} />
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

function UserText({ text }: { text: string }) {
  return <p className="ml-auto w-fit max-w-63.5 rounded-xl border border-secondary bg-primary px-2.75 py-1.75 text-md whitespace-pre-wrap text-primary lg:max-w-100">{text}</p>
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
