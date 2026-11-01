'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaceSad } from '@untitledui/icons'
import type { FormA, ListingResponse, MatchResult } from '@roomsie/contract'
import { useAuth } from '../../lib/auth'
import { useAreaLabels } from '../../lib/queries'
import { areaName, countLine, didntSayLine, formKey, panelTitle, panelUpdate, resultId, type PanelState, type ResultsPage } from '../../lib/results'
import { PlaceCard } from '../listings/place-card'
import { PersonCard } from '../people/person-card'
import { PlaceDetail } from '../places/place-detail'
import { SignInWall } from '../shell/sign-in-wall'
import { Badge } from '../ui/badge'
import { CloseButton } from '../ui/modal'

/** How long the panel waits after the last scroll before it applies a new form (PD6c). */
const idleMs = 1500

function MatchLabel({ result }: { result: MatchResult }) {
  if (result.bestMatch) return <Badge tone="blue" dot={false}>Best match</Badge>
  const didntSay = didntSayLine(result)
  return didntSay ? <Badge tone="gray" dot={false}>{didntSay}</Badge> : null
}

function ResultGrid({ results, onOpen }: { results: MatchResult[]; onOpen: (result: MatchResult) => void }) {
  const areaLabels = useAreaLabels()
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {results.map((result) => (
        <li key={resultId(result)}>
          {result.kind === 'person'
            ? <PersonCard card={result.card} label={<MatchLabel result={result} />} onOpen={() => onOpen(result)} />
            : <PlaceCard listing={result.listing} areaName={result.listing.areaSlug ? areaName(areaLabels)(result.listing.areaSlug) : undefined}
                label={<MatchLabel result={result} />} onOpen={() => onOpen(result)} />}
        </li>
      ))}
    </ul>
  )
}

/** "No relevant results" and the suggested posts of flow 02 (PD6c). */
function NoResults({ suggested, onOpen }: { suggested: MatchResult[]; onOpen: (result: MatchResult) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-quaternary shadow-xs"><FaceSad size={24} aria-hidden /></span>
        <div className="flex max-w-88 flex-col gap-1">
          <h3 className="text-md font-semibold text-primary">No relevant results</h3>
          <p className="text-sm text-tertiary">You can either loosen up your ask, or take a look at the suggested posts</p>
        </div>
      </div>
      {suggested.length > 0 && (
        <section className="flex flex-col gap-4">
          <h3 className="border-b border-dashed border-secondary pb-4 text-md font-medium text-primary">Suggested posts</h3>
          <ResultGrid results={suggested} onOpen={onOpen} />
        </section>
      )}
    </div>
  )
}

/**
 * The results panel of flow 02: a pure function of Form A (PD6c). A new form waits while the person scrolls,
 * so the order never moves under them. A card opens here: a place in the panel, a person on its page.
 * `sample`: the preview of T-15 shows that the data is not real.
 */
export function ResultsPanel({ form, page, sample, onClose, onAskInChat }: {
  form: FormA; page: ResultsPage; sample?: boolean; onClose: () => void; onAskInChat: (listing: ListingResponse) => void
}) {
  const { user } = useAuth()
  const router = useRouter()
  const areaLabels = useAreaLabels()
  const key = formKey(form)
  const [state, dispatch] = useReducer(panelUpdate<ResultsPage>, { shown: { key, page }, pending: null, busy: false } satisfies PanelState<ResultsPage>)
  const [open, setOpen] = useState<ListingResponse | null>(null)
  const [wall, setWall] = useState(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => dispatch({ type: 'arrive', key, page }), [key, page])
  useEffect(() => () => clearTimeout(idleTimer.current), [])

  const onScroll = () => {
    dispatch({ type: 'busy' })
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => dispatch({ type: 'idle' }), idleMs)
  }
  // A guest signs in to open one card (PD6b). The results stay on the screen behind the wall.
  const openResult = (result: MatchResult) => {
    if (!user) return setWall(true)
    if (result.kind === 'person') return router.push(`/people/${result.card.id}`)
    setOpen(result.listing)
  }

  const shown = state.shown!.page
  const title = panelTitle(form, areaName(areaLabels))

  return (
    <section aria-label="Results" className="flex min-h-0 flex-col bg-primary">
      {open
        ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlaceDetail listing={open} onBack={() => setOpen(null)} onAskInChat={() => { onAskInChat(open); setOpen(null) }} />
          </div>
        )
        : (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4 lg:px-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">
                  {title} <span className="font-normal text-tertiary">· {countLine(shown.results.length)}</span>
                </h2>
                {sample && <span><Badge tone="warning">Sample data</Badge></span>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select aria-label="Sort" className="rounded-md border border-primary bg-primary px-3 py-2 text-sm font-medium text-secondary shadow-xs outline-focus-ring focus-visible:outline-2">
                  <option>Best Matches</option>
                </select>
                <CloseButton onClose={onClose} />
              </div>
            </header>
            <div onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">
              {shown.results.length
                ? <ResultGrid results={shown.results} onOpen={openResult} />
                : <NoResults suggested={shown.suggested} onOpen={openResult} />}
            </div>
          </>
        )}
      {wall && <SignInWall onClose={() => setWall(false)} />}
    </section>
  )
}
