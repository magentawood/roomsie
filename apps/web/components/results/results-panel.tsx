'use client'

import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import { FaceSad, ChevronSelectorVertical, XClose } from '@untitledui/icons'
import type { CompareKind, FormA, ListingResponse, MatchResult } from '@roomsie/contract'
import { useAuth } from '../../lib/auth'
import { pickOf, type Picked, type Picks } from '../../lib/compare'
import { useAreaLabels, useListing, usePerson, type useResults } from '../../lib/queries'
import { didntSayLine, formKey, panelUpdate, resultsHeading, type Found, type PanelState } from '../../lib/results'
import { Unavailable, type DetailPanel } from '../detail/parts'
import { PlaceCard } from '../listings/place-card'
import { PersonCard } from '../people/person-card'
import { PersonDetail } from '../people/person-detail'
import { PlaceDetail } from '../places/place-detail'
import { SignInWall } from '../shell/sign-in-wall'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { CheckChip } from '../ui/choice'
import { Loading } from '../ui/loading'
import { CloseButton } from '../ui/modal'

/** How long the panel waits after the last scroll or read before it applies a new form (PD6c). */
const idleMs = 1500

type Shown = { form: FormA; found: Found }

/** The results on the screen and the form that they answer, so the header and the grid change together (PD6c). */
export function useHeldResults(form: FormA, found: Found | undefined) {
  const key = formKey(form)
  const [state, dispatch] = useReducer(panelUpdate<Shown>, null, (): PanelState<Shown> => ({ shown: found ? { key, value: { form, found } } : null, pending: null, busy: false }))
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => { if (found) dispatch({ type: 'arrive', key, value: { form, found } }) }, [key, form, found])
  useEffect(() => () => clearTimeout(idleTimer.current), [])
  const hold = useCallback(() => { clearTimeout(idleTimer.current); dispatch({ type: 'busy' }) }, [])
  const release = () => { clearTimeout(idleTimer.current); idleTimer.current = setTimeout(() => dispatch({ type: 'idle' }), idleMs) }
  return { shown: state.shown?.value ?? null, hold, release }
}

type More = Pick<ReturnType<typeof useResults>, 'fetchNextPage' | 'isFetchingNextPage' | 'isFetchNextPageError'>

function NextPage({ more: { fetchNextPage, isFetchingNextPage, isFetchNextPageError } }: { more: More }) {
  const line = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // A failed page waits for "Try again", so the line in view does not ask again and again.
    if (isFetchingNextPage || isFetchNextPageError) return
    const seen = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) void fetchNextPage() })
    seen.observe(line.current!)
    return () => seen.disconnect()
  }, [fetchNextPage, isFetchingNextPage, isFetchNextPageError])
  return (
    <div ref={line} className="flex items-center justify-center gap-3 py-4 text-xs text-tertiary">
      {isFetchingNextPage ? 'Loading more results…' : isFetchNextPageError && (
        <>
          <span role="alert" className="text-error-primary">The next results did not load.</span>
          <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()}>Try again</Button>
        </>
      )}
    </div>
  )
}

function MatchLabel({ result }: { result: MatchResult }) {
  if (result.bestMatch) return <Badge tone="blue" dot={false}>Best match</Badge>
  const didntSay = didntSayLine(result)
  return didntSay ? <Badge tone="gray" dot={false}>{didntSay}</Badge> : null
}

/** `picks`: the "Selected" tick of "Listings selected". The sample results of a preview have none. */
function ResultGrid({ results, picks, onOpen }: { results: MatchResult[]; picks?: Omit<Picks, 'onClear'>; onOpen: (result: MatchResult) => void }) {
  const areaLabels = useAreaLabels()
  return (
    <ul className="grid gap-7 sm:grid-cols-2 sm:gap-4 lg:gap-x-4.5 lg:gap-y-6">
      {results.map((result) => {
        const card = pickOf(result)
        const picked = Boolean(picks?.picked.some((p) => p.id === card.id))
        const label = (
          <div className="flex flex-wrap items-center gap-2">
            {picks && <CheckChip size="xs" label={picked ? 'Selected' : 'Select'} ariaLabel={`Compare ${card.name}`} checked={picked} onToggle={() => picks.onPick(card)} />}
            <MatchLabel result={result} />
          </div>
        )
        return (
          <li key={card.id}>
            {result.kind === 'person'
              ? <PersonCard card={result.card} label={label} onOpen={() => onOpen(result)} />
              : <PlaceCard listing={result.listing} areaName={result.listing.areaSlug ? areaLabels[result.listing.areaSlug] : undefined} label={label} onOpen={() => onOpen(result)} />}
          </li>
        )
      })}
    </ul>
  )
}

/** A card open in the panel: a card of the results, or an option of a comparison in the chat (T-49). */
export type OpenCard = { kind: CompareKind; id: string }

/** A place of the results shows at once. Another place, and each person, loads its detail. */
function OpenDetail({ card, listing, panel }: { card: OpenCard; listing?: ListingResponse; panel: DetailPanel }) {
  const place = useListing(card.kind === 'place' && !listing ? card.id : null)
  const person = usePerson(card.kind === 'person' ? card.id : null)
  const query = card.kind === 'place' ? place : person
  if (card.kind === 'place' && (listing ?? place.data)) return <PlaceDetail listing={(listing ?? place.data)!} panel={panel} />
  if (card.kind === 'person' && person.data) return <PersonDetail person={person.data} panel={panel} />
  if (query.isError) return <Unavailable kind={card.kind} error={query.error} onBack={panel.onBack} inPanel />
  return <Loading mascot={card.kind === 'place' ? 'looking' : 'starry'} />
}

/** "No relevant results" and the suggested posts of flow 02 (PD6c). */
function NoResults({ suggested, picks, onOpen }: { suggested: MatchResult[]; picks?: Omit<Picks, 'onClear'>; onOpen: (result: MatchResult) => void }) {
  return (
    <div className="flex flex-col gap-6 lg:gap-5">
      <div className="flex flex-col items-center gap-3 py-6 text-center lg:gap-4 lg:py-4">
        <span className="flex size-12 items-center justify-center rounded-xl border border-primary text-fg-quaternary shadow-xs"><FaceSad size={24} aria-hidden /></span>
        <div className="flex max-w-88 flex-col gap-1">
          <h3 className="text-md font-semibold text-primary">No relevant results</h3>
          <p className="text-sm text-tertiary">You can either loosen up your ask, or take a look at the suggested posts</p>
        </div>
      </div>
      {suggested.length > 0 && (
        <section className="flex flex-col gap-4 lg:gap-5">
          <h3 className="border-b border-dashed border-secondary pb-4 text-md font-medium text-primary">Suggested posts</h3>
          <ResultGrid results={suggested} picks={picks} onOpen={onOpen} />
        </section>
      )}
    </div>
  )
}

/**
 * The results panel of flow 02: a pure function of Form A (PD6c). `form`: the form of the results. `card`: the card open in the panel,
 * which the chat holds, so an option of a comparison opens here too.
 */
export function ResultsPanel({ form, found, held: { hold, release }, more, sample, notice, picks: pickProps, card, onCard, onClose, onAskInChat }: {
  form: FormA; found: Found; held: Pick<ReturnType<typeof useHeldResults>, 'hold' | 'release'>; more?: More; sample?: boolean; notice?: ReactNode
  /** The selection of the list on the screen: the newest results, or the results of an older card (T-49). */
  picks: Picks; card: OpenCard | null; onCard: (card: OpenCard | null) => void; onClose: () => void; onAskInChat: (card: Picked) => void
}) {
  const { user, loading } = useAuth()
  const [tapped, setTapped] = useState<MatchResult | null>(null)
  // A selection needs a sign-in, as the opening of a card (PD6b).
  const [wall, setWall] = useState(false)
  const { picked, onPick, onClear } = pickProps
  const picks = sample ? undefined : { picked, onPick: (card: Picked) => (user ? onPick(card) : setWall(true)) }

  // A guest signs in to open one card (PD6b), and the card opens after the sign-in. The results stay behind the wall.
  // The tap waits for the auth check, so a signed-in person never sees the wall, as in the app shell.
  useEffect(() => {
    if (!user || !tapped) return
    setTapped(null)
    onCard({ kind: tapped.kind === 'person' ? 'person' : 'place', id: pickOf(tapped).id })
  }, [user, tapped, onCard])
  // The results wait while a card is open, so its label and the grid under it do not change.
  useEffect(() => { if (card) hold() }, [card, hold])

  const onScroll = () => { hold(); release() }
  const closeDetail = () => { onCard(null); release() }
  const result = card && [...found.results, ...found.suggested].find((r) => pickOf(r).id === card.id)
  const panel: DetailPanel = {
    onBack: closeDetail,
    onClose: () => { closeDetail(); onClose() },
    onAskInChat: (asked) => { onAskInChat(asked); closeDetail() },
    against: { form, bestMatch: result?.bestMatch },
  }

  return (
    <section aria-label="Results" className="flex min-h-0 flex-col bg-primary">
      {card
        ? (
          // On a phone the card covers the chat input and the phone bar, as the page of a card.
          // A new card starts at its top.
          <div key={card.id} className="min-h-0 flex-1 overflow-y-auto bg-primary max-lg:fixed max-lg:inset-0 max-lg:z-50">
            <OpenDetail card={card} listing={result?.kind === 'listing' ? result.listing : undefined} panel={panel} />
          </div>
        )
        : (
          <>
            {/* From lg the line under the header spans the content only, as in the designs. */}
            <header className="flex items-center justify-between gap-10 border-b border-secondary px-5 py-3 lg:mx-6 lg:items-start lg:gap-3 lg:px-0 lg:pt-6 lg:pb-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold text-primary">{resultsHeading(found.total)}</h2>
                {sample && <span><Badge tone="warning">Sample data</Badge></span>}
              </div>
              <div className="flex shrink-0 items-center gap-2 lg:gap-4">
                {/* The small secondary button of the designs, with the chevrons of a select. */}
                <span className="relative">
                  <select aria-label="Sort" className="appearance-none rounded-lg border border-primary bg-primary py-1.25 pr-7.75 pl-2.75 text-sm font-semibold text-secondary shadow-xs outline-focus-ring focus-visible:outline-2">
                    <option>Best Matches</option>
                  </select>
                  <ChevronSelectorVertical size={16} aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-fg-quaternary" />
                </span>
                <CloseButton onClose={onClose} />
              </div>
            </header>
            <div onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-6 lg:pt-5 lg:pb-6">
              {notice}
              {picked.length > 0 && (
                <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-secondary bg-secondary py-[5.5px] pr-[5.5px] pl-2.75 lg:mb-6">
                  <p className="text-md font-medium text-primary">{picked.length} Selected</p>
                  <Button variant="tertiary" size="sm" iconLeading={XClose} label="Clear the selection" onClick={onClear} />
                </div>
              )}
              {found.results.length
                ? <ResultGrid results={found.results} picks={picks} onOpen={setTapped} />
                : <NoResults suggested={found.suggested} picks={picks} onOpen={setTapped} />}
              {more && <NextPage more={more} />}
            </div>
          </>
        )}
      {(tapped || wall) && !user && !loading && <SignInWall onClose={() => { setTapped(null); setWall(false) }} />}
    </section>
  )
}
