'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from '@untitledui/icons'
import { capWall, formA, goalResponse, listingTitle, noContent, panelReady, tapText, turnResponse, type ChipTap, type GoalResponse, type ListingResponse, type TurnBody } from '@roomsie/contract'
import { ApiError, chatApi, errorText, limitOf } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { canSend, chatStorage, chipsOf, keyAction, readStored, tapRefusal, writeStored } from '../../lib/chat'
import { newGoalHref, useCurrentGoalId } from '../../lib/goals'
import { queryKeys, useAreaLabels, useResults } from '../../lib/queries'
import { panelContent } from '../../lib/waitlist'
import { compareOf, compareRefusal, pickOf, toggledPick, type Picked } from '../../lib/compare'
import { formKey, panelTitle } from '../../lib/results'
import { sampleForm, samples, type Preview } from '../../lib/sample-results'
import { ResultsCard } from '../results/results-card'
import { ResultsPanel, useHeldResults } from '../results/results-panel'
import { LookInMumbai, WaitlistForm, WaitlistLine, WaitlistPanel } from './waitlist'
import { SignInWall } from '../shell/sign-in-wall'
import { Button } from '../ui/button'
import { RemoveChip } from '../ui/choice'
import { Chips } from './chips'
import { ComparisonTable } from './comparison'
import { FoundFlow } from './found-dialogs'
import { GoalHeader } from '../goals/goal-list'

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
    <div className="relative h-16">
      <form onSubmit={(e) => { e.preventDefault(); send() }}
        className={`absolute inset-x-0 z-10 flex items-end gap-2 rounded-xl border border-secondary bg-primary px-3.5 py-3 shadow-md focus-within:outline-2 focus-within:outline-focus-ring ${grow === 'up' ? 'bottom-0' : 'top-0'}`}>
        <textarea ref={box} aria-label="Message" rows={1} autoFocus={autoFocus} value={text} placeholder={placeholder}
          className="max-h-28 flex-1 resize-none bg-transparent py-2 text-md text-primary outline-none placeholder:text-placeholder"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            const action = keyAction({ key: e.key, shiftKey: e.shiftKey, isComposing: e.nativeEvent.isComposing }, text)
            if (action === 'type') return
            e.preventDefault()
            if (action === 'send') send()
          }} />
        <Button type="submit" variant="secondary" size="md" iconLeading={ArrowRight} label="Send" disabled={!canSend(text)} />
      </form>
    </div>
  )
}

/** "What are we looking for?" of flow 02: the start of a goal, with the place-type chips under the input (T-09). */
function EmptyChat({ onSend, children }: { onSend: (text: string) => void; children: React.ReactNode }) {
  return (
    <main className="isolate flex flex-1 flex-col items-center justify-center gap-10 overflow-hidden bg-chat-glow px-4 pb-24 lg:px-6 lg:pb-0">
      <div className="flex max-w-126 flex-col items-center gap-2 text-center">
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
        <ChatInput grow="down" onSend={onSend} />
        {children}
      </div>
    </main>
  )
}

/** `text` is what the chat shows until the API answers: the message, or the label of the chip. */
type Outgoing = { body: TurnBody; text: string }

/** The goal of the address, else the last goal of this browser, so a reload opens the same chat. */
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
  // Only a goal that the API gave becomes the last goal, so a link to the goal of a different person changes nothing.
  useEffect(() => { if (goal.data) writeStored(chatStorage.goal, goal.data.id) }, [goal.data])
  const gone = goal.error instanceof ApiError && goal.error.status === 404
  useEffect(() => {
    if (!gone) return
    const last = readStored(chatStorage.goal)
    if (last === goalId) writeStored(chatStorage.goal, null)
    router.replace(last && last !== goalId ? '/chat' : '/start')
  }, [gone, goalId, router])

  const send = useMutation({
    mutationFn: async ({ body }: Outgoing) => {
      if (!goalId) throw new Error('The chat has no goal: the onboarding makes it (T-48)')
      return { id: goalId, ...(await chatApi(user, `/v1/goals/${goalId}/turns`, turnResponse, { method: 'POST', body })) }
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

/** The chat of a goal, and the results of its form beside it (flow 02). */
export function ChatScreen({ preview }: { preview?: Preview }) {
  const { goalId, turns, form: chatForm, outsidePlaces, closed, goalName, typedTurnsLeft, signedIn, send, loadingGoal } = useChat()
  const router = useRouter()
  // A chat starts on the onboarding, which makes its goal (T-48).
  const noGoal = goalId === null && !preview
  useEffect(() => { if (noGoal) router.replace('/start') }, [noGoal, router])
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
  // A selection belongs to one list of results, so a new search starts a new one, and Option 1 is always the best match (T-49).
  const [picks, setPicks] = useState({ key: '', picked: [] as Picked[] })
  const resultsKey = shown ? formKey(shown.form) : ''
  const picked = picks.key === resultsKey ? picks.picked : []
  const setPicked = (next: Picked[]) => setPicks({ key: resultsKey, picked: next })
  const atCap = !signedIn && (capped || typedTurnsLeft === 0)
  const submit = (turn: Outgoing) => {
    setFailed(null)
    if (shown && view === 'unopened') setView('split')
    send.mutate(turn, {
      onSuccess: (sent) => { if (sent.typedTurnsLeft === 0) setWall(true) },
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
  const askInChat = (listing: ListingResponse) => {
    setDraft(({ version }) => ({ text: `About ${listingTitle(listing)}: `, version: version + 1 }))
    setView('split')
  }

  if (loadingGoal || noGoal) return <main className="flex-1" aria-busy="true" />
  if (!turns.length && pending === undefined && !ready) return <EmptyChat onSend={sendText}>{chips}</EmptyChat>
  const split = (shown !== null && (view === 'split' || view === 'all')) || waitlistOpen
  return (
    <main className={`grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_minmax(0,1fr)_auto] ${split ? 'lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]' : ''}`}>
      {!preview && <GoalHeader title={goalName} closed={closed} onFound={() => setFoundOpen(true)} />}
      {/* The list grows upward, so a scroll of 0 shows the newest message. A short list stays at the top. */}
      <div className={`col-start-1 row-start-2 flex min-h-0 flex-col-reverse overflow-y-auto ${view === 'all' ? 'max-lg:hidden' : ''}`}>
        <ol className="mb-auto flex flex-col gap-6 px-5 py-6 lg:px-6" aria-live="polite">
          {turns.map((turn) => (
            <li key={turn.id}>
              {turn.role === 'user' ? <UserText text={turn.text} /> : (
                <div className="flex flex-col gap-4">
                  <p className="text-md whitespace-pre-wrap text-primary">{turn.text}</p>
                  {turn.comparison && <ComparisonTable table={turn.comparison} />}
                </div>
              )}
            </li>
          ))}
          {panel === 'waitlist' && waitlist && (
            // On a phone the form is in the thread (drafts section 18).
            <li className="lg:hidden"><WaitlistForm key={waitlist.place} {...waitlist} footer={<LookInMumbai onPick={pickArea} />} /></li>
          )}
          {chips && <li>{chips}</li>}
          {pending !== undefined && (
            <li className="flex flex-col gap-6">
              <UserText text={pending} />
              {failed ? <p role="alert" className="text-md text-error-primary">{failed}</p> : <p className="text-md text-tertiary">Thinking…</p>}
            </li>
          )}
          {shown && <li><ResultsCard title={title} count={shown.found.total} onOpen={() => setView('all')} /></li>}
          {results.isError && !results.isFetchNextPageError && (
            <li role="alert" className="flex items-center gap-3 text-sm text-error-primary">
              The results did not load.
              <Button variant="secondary" size="sm" onClick={() => void results.refetch()}>Try again</Button>
            </li>
          )}
        </ol>
      </div>
      <div className="col-start-1 row-start-3 px-5 pb-28 lg:px-6 lg:pb-6">
        {closed && goalId ? <ClosedBar goalId={goalId} /> : <>
        {picked.length > 0 && !atCap && (
          <div className="mb-2 flex flex-col gap-1.5">
            <div role="group" aria-label="Selected to compare" className="flex flex-wrap gap-2">
              {picked.map((card) => <RemoveChip key={card.id} label={card.name} onRemove={() => setPicked(toggledPick(picked, card))} />)}
            </div>
            {picked.length === 1 && <p className="text-xs text-tertiary">Select one more card to compare.</p>}
          </div>
        )}
        {/* It comes after the first send, so it keeps the focus of the person. "Ask in chat" starts a new draft. */}
        {atCap
          ? <Button variant="primary" size="lg" className="w-full" onClick={() => setWall(true)}>{capWall.title}</Button>
          : <ChatInput key={draft.version} grow="up" autoFocus={turns.length > 0 || pending !== undefined || draft.version > 0} initialText={draft.text} onSend={sendText}
              placeholder={picked[0] && (picked[0].kind === 'place' ? 'Ask about the listings…' : 'Ask about these people…')} />}
        {typedTurnsLeft !== null && <p className="mt-2 text-xs text-tertiary">Free messages remaining: {typedTurnsLeft}</p>}
        </>}
      </div>
      {shown && (
        <div className={`col-start-1 row-start-2 min-h-0 lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:border-l lg:border-secondary ${view === 'all' ? 'grid' : 'hidden'} ${split ? 'lg:grid' : 'lg:hidden'}`}>
          {/* The next page is of the newest form, so it loads only while that form is on the screen. */}
          <ResultsPanel title={title} found={shown.found} held={held} sample={Boolean(preview)}
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

function UserText({ text }: { text: string }) {
  return <p className="ml-auto max-w-4/5 rounded-xl border border-secondary bg-primary px-3 py-2 text-md whitespace-pre-wrap text-primary lg:max-w-100">{text}</p>
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
