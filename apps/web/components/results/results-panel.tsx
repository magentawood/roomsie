'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaceSad } from '@untitledui/icons'
import type { FormA, ListingResponse, MatchResult } from '@roomsie/contract'
import { useAuth } from '../../lib/auth'
import { useAreaLabels } from '../../lib/queries'
import { countLine, didntSayLine, formKey, panelUpdate, type PanelState, type ResultsPage } from '../../lib/results'
import { PlaceCard } from '../listings/place-card'
import { PersonCard } from '../people/person-card'
import { PlaceDetail } from '../places/place-detail'
import { SignInWall } from '../shell/sign-in-wall'
import { Badge } from '../ui/badge'
import { CloseButton } from '../ui/modal'

/** How long the panel waits after the last scroll or read before it applies a new form (PD6c). */
const idleMs = 1500

type Held = { form: FormA; page: ResultsPage }

/** The results on the screen and the form that they answer, so the header and the grid change together (PD6c). */
export function useHeldResults(form: FormA, page: ResultsPage) {
  const key = formKey(form)
  const [state, dispatch] = useReducer(panelUpdate<Held>, { shown: { key, page: { form, page } }, pending: null, busy: false } satisfies PanelState<Held>)
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => dispatch({ type: 'arrive', key, page: { form, page } }), [key, form, page])
  useEffect(() => () => clearTimeout(idleTimer.current), [])
  const hold = useCallback(() => { clearTimeout(idleTimer.current); dispatch({ type: 'busy' }) }, [])
  const release = () => { clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => dispatch({ type: 'idle' }), idleMs) }
  return { ...state.shown.page, hold, release }
}

type HeldResults = ReturnType<typeof useHeldResults>

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
        <li key={result.kind === 'person' ? result.card.id : result.listing.id}>
          {result.kind === 'person'
            ? <PersonCard card={result.card} label={<MatchLabel result={result} />} onOpen={() => onOpen(result)} />
            : <PlaceCard listing={result.listing} areaName={result.listing.areaSlug ? areaLabels[result.listing.areaSlug] : undefined}
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
 * The results panel of flow 02: a pure function of Form A (PD6c). A card opens here: a place in the panel, a person on its page.
 * `sample`: the preview of T-15 shows that the data is not real.
 */
export function ResultsPanel({ title, held: { page, hold, release }, sample, onClose, onAskInChat }: {
  title: string; held: HeldResults; sample?: boolean; onClose: () => void; onAskInChat: (listing: ListingResponse) => void
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState<ListingResponse | null>(null)
  const [tapped, setTapped] = useState<MatchResult | null>(null)

  // A guest signs in to open one card (PD6b), and the card opens after the sign-in. The results stay behind the wall.
  // The tap waits for the auth check, so a signed-in person never sees the wall, as in the app shell.
  useEffect(() => {
    if (!user || !tapped) return
    setTapped(null)
    if (tapped.kind === 'person') return router.push(`/people/${tapped.card.id}`)
    hold()
    setOpen(tapped.listing)
  }, [user, tapped, router, hold])

  const onScroll = () => { hold(); release() }
  const closeDetail = () => { setOpen(null); release() }

  return (
    <section aria-label="Results" className="flex min-h-0 flex-col bg-primary">
      {open
        ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlaceDetail listing={open} onBack={closeDetail} onAskInChat={() => { onAskInChat(open); closeDetail() }} />
          </div>
        )
        : (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-secondary px-5 py-4 lg:px-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">
                  {title} <span className="font-normal text-tertiary">· {countLine(page.results.length)}</span>
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
              {page.results.length
                ? <ResultGrid results={page.results} onOpen={setTapped} />
                : <NoResults suggested={page.suggested} onOpen={setTapped} />}
            </div>
          </>
        )}
      {tapped && !user && !loading && <SignInWall onClose={() => setTapped(null)} />}
    </section>
  )
}
