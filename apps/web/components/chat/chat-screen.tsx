'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from '@untitledui/icons'
import { formA, goalResponse, listingTitle, newGoalResponse, turnResponse, type GoalResponse, type ListingResponse } from '@roomsie/contract'
import { ApiError, chatApi, errorText } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { canSend, chatStorage, keyAction, readStored, writeStored } from '../../lib/chat'
import { queryKeys, useAreaLabels, useResults } from '../../lib/queries'
import { formKey, panelReady, panelTitle } from '../../lib/results'
import { sampleForm, samples, type Preview } from '../../lib/sample-results'
import { ResultsCard } from '../results/results-card'
import { ResultsPanel, useHeldResults } from '../results/results-panel'
import { Button } from '../ui/button'

/** It grows to four lines out of its box, over the screen, so the layout never changes while the person types (PD6a). */
function ChatInput({ grow, autoFocus, initialText = '', onSend }: { grow: 'up' | 'down'; autoFocus?: boolean; initialText?: string; onSend: (text: string) => void }) {
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
        <textarea ref={box} aria-label="Message" rows={1} autoFocus={autoFocus} value={text} placeholder="3 bhk in bandra for 3 friends..."
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

/** "What are we looking for?" of flow 02: the start of a goal. */
function EmptyChat({ onSend }: { onSend: (text: string) => void }) {
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
      <div className="w-full max-w-210">
        <ChatInput grow="down" onSend={onSend} />
      </div>
    </main>
  )
}

/** The goal of this browser, kept in local storage, so a reload opens the same chat. */
function useChat() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()
  const [goalId, setGoalId] = useState<string | null>(null)
  // Local storage exists only in the browser, so the server render and the first render have no goal.
  useEffect(() => setGoalId(readStored(chatStorage.goal)), [])
  const goal = useQuery({
    queryKey: queryKeys.goal(goalId ?? ''),
    queryFn: () => chatApi(user, `/v1/goals/${goalId}`, goalResponse),
    enabled: goalId !== null && !loading,
    // The turns of this tab update the cache, so only a reload reads the goal again.
    staleTime: Infinity,
    retry: (count, err) => count < 2 && !(err instanceof ApiError && err.status === 404),
  })
  const gone = goal.error instanceof ApiError && goal.error.status === 404
  useEffect(() => {
    if (!gone) return
    writeStored(chatStorage.goal, null)
    setGoalId(null)
  }, [gone])

  const send = useMutation({
    mutationFn: async (text: string) => {
      let id = goalId
      if (!id) {
        const made = await chatApi(user, '/v1/goals', newGoalResponse, { method: 'POST' })
        if (made.visitorKey) writeStored(chatStorage.visitorKey, made.visitorKey)
        writeStored(chatStorage.goal, made.id)
        queryClient.setQueryData(queryKeys.goal(made.id), { id: made.id, form: made.form, turns: [] })
        setGoalId(made.id)
        id = made.id
      }
      return { id, ...(await chatApi(user, `/v1/goals/${id}/turns`, turnResponse, { method: 'POST', body: { text } })) }
    },
    onSuccess: ({ id, form, turns }) => {
      queryClient.setQueryData<GoalResponse>(queryKeys.goal(id), (old) => ({ id, form, turns: [...(old?.turns ?? []), ...turns] }))
    },
  })
  const turns = goal.data?.turns ?? []
  return { turns, form: goal.data?.form ?? emptyForm, send, loadingGoal: goalId !== null && goal.isPending && !gone }
}

const emptyForm = formA.parse({})

/**
 * The chat of a goal, and the results of its form beside it (flow 02). The person sees their message at once, and the reply when it comes.
 */
export function ChatScreen({ preview }: { preview?: Preview }) {
  const { turns, form: chatForm, send, loadingGoal } = useChat()
  const [failed, setFailed] = useState<string | null>(null)
  const submit = (text: string) => {
    setFailed(null)
    send.mutate(text, { onError: (err) => setFailed(errorText(err)) })
  }
  const pending = send.isPending || failed ? send.variables : undefined
  const areaLabels = useAreaLabels()
  const form = preview ? sampleForm : chatForm
  const ready = panelReady(form)
  const results = useResults(ready && !preview ? form : null)
  const held = useHeldResults(form, preview ? samples[preview] : results.data)
  const shown = ready ? held.shown : null
  const title = shown ? panelTitle(shown.form, (slug) => areaLabels[slug] ?? slug) : ''
  // The panel is open beside the chat on a desktop. On a phone, the chat fills the screen until "Show all" (PD6a).
  const [view, setView] = useState<'split' | 'all' | 'closed'>('split')
  const [draft, setDraft] = useState({ text: '', version: 0 })
  const askInChat = (listing: ListingResponse) => {
    setDraft(({ version }) => ({ text: `About ${listingTitle(listing)}: `, version: version + 1 }))
    setView('split')
  }

  if (loadingGoal) return <main className="flex-1" aria-busy="true" />
  if (!turns.length && pending === undefined && !ready) return <EmptyChat onSend={submit} />
  const split = shown !== null && view !== 'closed'
  return (
    <main className={`grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] ${split ? 'lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]' : ''}`}>
      {/* The list grows upward, so a scroll of 0 shows the newest message. A short list stays at the top. */}
      <div className={`col-start-1 row-start-1 flex min-h-0 flex-col-reverse overflow-y-auto ${view === 'all' ? 'max-lg:hidden' : ''}`}>
        <ol className="mb-auto flex flex-col gap-6 px-5 py-6 lg:px-6" aria-live="polite">
          {turns.map((turn) => (
            <li key={turn.id}>{turn.role === 'user' ? <UserText text={turn.text} /> : <p className="text-md whitespace-pre-wrap text-primary">{turn.text}</p>}</li>
          ))}
          {pending !== undefined && (
            <li className="flex flex-col gap-6">
              <UserText text={pending} />
              {failed
                ? <p role="alert" className="text-md text-error-primary">{failed}</p>
                : <p className="text-md text-tertiary">Thinking…</p>}
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
      <div className="col-start-1 row-start-2 px-5 pb-28 lg:px-6 lg:pb-6">
        {/* It comes after the first send, so it keeps the focus of the person. "Ask in chat" starts a new draft. */}
        <ChatInput key={draft.version} grow="up" autoFocus={turns.length > 0 || pending !== undefined || draft.version > 0} initialText={draft.text} onSend={submit} />
      </div>
      {shown && (
        <div className={`col-start-1 row-start-1 min-h-0 lg:col-start-2 lg:row-span-2 lg:border-l lg:border-secondary ${view === 'all' ? 'grid' : 'hidden'} ${view === 'closed' ? 'lg:hidden' : 'lg:grid'}`}>
          {/* The next page is of the newest form, so it loads only while that form is on the screen. */}
          <ResultsPanel title={title} found={shown.found} held={held} sample={Boolean(preview)}
            more={results.hasNextPage && formKey(shown.form) === formKey(form) ? results : undefined} onClose={() => setView('closed')} onAskInChat={askInChat} />
        </div>
      )}
    </main>
  )
}

function UserText({ text }: { text: string }) {
  return <p className="ml-auto max-w-4/5 rounded-xl border border-secondary bg-primary px-3 py-2 text-md whitespace-pre-wrap text-primary lg:max-w-100">{text}</p>
}
