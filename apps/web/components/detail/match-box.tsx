'use client'

import { Stars02 } from '@untitledui/icons'
import type { CardResponse, FormA, ListingResponse } from '@roomsie/contract'
import { areaTree } from '../../lib/areas'
import { factSentence, formOfProfile, matchTitle, personFacts, placeFacts, sideOfForm, sideOfProfile } from '../../lib/match-box'
import { useAreas, useFit, useProfile } from '../../lib/queries'

/** What a detail compares with in the chat: the form of the goal, and the label of the card in the results when it is there. */
export type Against = { form: FormA; bestMatch?: boolean }
type Target = { kind: 'place'; listing: ListingResponse } | { kind: 'person'; card: CardResponse }

/**
 * "A great match" under the title of a detail (PD3a): the label of the best-match rule, and one sentence of the facts that the two sides share.
 * No number and no model. In the chat it compares with the form of the goal; on a page, with the profile of the viewer.
 */
export function MatchBox({ target, against }: { target: Target; against?: Against }) {
  const profile = useProfile()
  const areas = useAreas().data?.areas
  const own = target.kind === 'place' ? target.listing.mine : profile.data?.id === target.card.id
  const id = target.kind === 'place' ? target.listing.id : target.card.id
  const form = against?.form ?? (profile.data ? formOfProfile(profile.data) : null)
  // A card of the results has its label. Another card asks the API for it.
  const fit = useFit(!own && against?.bestMatch === undefined ? form : null, target.kind, id)
  const bestMatch = against?.bestMatch ?? fit.data?.bestMatch
  if (own || profile.isPending || !areas || bestMatch === undefined) return null
  const side = against ? sideOfForm(against.form, profile.data) : profile.data && sideOfProfile(profile.data)
  if (!side) return null
  const tree = areaTree(areas)
  const names = { lineage: tree.lineage, name: (slug: string) => tree.label(slug) ?? slug }
  const sentence = factSentence(target.kind === 'place' ? placeFacts(side, target.listing, names) : personFacts(side, target.card, names))
  if (!sentence) return null
  const title = matchTitle(bestMatch)
  return (
    // The 1.5 px rainbow border of Roomsie Noticed, with the text 12 in from its outside, as in the designs.
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg bg-noticed p-[10.5px]">
      <h2 className="flex items-center gap-2 text-md font-semibold text-secondary"><Stars02 size={24} aria-hidden className="shrink-0 text-noticed" />{title}</h2>
      <p className="text-sm text-secondary">{sentence}</p>
    </section>
  )
}
