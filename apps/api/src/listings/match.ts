import { and, count, desc, inArray, ne, sql, type SQL } from 'drizzle-orm'
import type { ListingKind, MustHaveKey } from '@roomsie/contract'
import type { Db } from '../db/client'
import { listingRates, listings } from '../db/schema'
import { textArray } from '../db/sql'
import { visibleListing } from './read'

/** What a must-have checks on a listing, as true or false, or null when the lister did not say (PD3a). */
const onListing: Record<MustHaveKey, SQL | null> = {
  veg_kitchen: sql`${listings.vegOnlyKitchen}`,
  non_smokers: sql`(not ${listings.smokingAllowed})`,
  no_alcohol: sql`(not ${listings.alcoholAllowed})`,
  couple_friendly: sql`(case when cardinality(${listings.whoIsWelcome}) = 0 then null else 'couples' = any(${listings.whoIsWelcome}) end)`,
  tidy_flatmates: null,
  women_only: null,
  men_only: null,
}
const appliesToListings = (key: MustHaveKey) => onListing[key] !== null

/** "Who can move in" for each gender of a searcher (PD3a, F-13). */
const welcomeFor = { male: ['men', 'any'], female: ['women', 'any'], non_binary: ['any'] } as const

export type ListingSearch = {
  viewerUserId?: string
  kinds: ListingKind[]
  /** Null: all of Mumbai. */
  areas: string[] | null
  budget: { min: number | null; max: number | null } | null
  moveDate: string | null
  roomType: 'private' | 'shared' | null
  dealbreakers: MustHaveKey[]
  preferences: MustHaveKey[]
  /** Null: the searcher did not give a gender. */
  gender: keyof typeof welcomeFor | null
  limit: number
  offset: number
}

/** The listings that fit, in the Best Matches order of PD3a, and their number. */
export async function matchingListings(db: Db, s: ListingSearch) {
  const dealbreakers = s.dealbreakers.filter(appliesToListings)
  const preferences = s.preferences.filter(appliesToListings)

  // A PG counts the rents of the room type of the searcher: Single for "private" (PC-29).
  const pgSharing = { private: sql`= 'single'`, shared: sql`<> 'single'` }
  const rentFits = (leeway: boolean) => sql`exists (select 1 from ${listingRates} where ${listingRates.listingId} = ${listings.id}
    ${s.roomType ? sql`and (${listings.kind} <> 'pg' or ${listingRates.sharing} ${pgSharing[s.roomType]})` : sql``}
    ${s.budget?.max != null ? (leeway ? sql`and ${listingRates.rent} * 10 <= ${s.budget.max} * 11` : sql`and ${listingRates.rent} <= ${s.budget.max}`) : sql``}
    ${s.budget?.min != null ? sql`and ${listingRates.rent} >= ${s.budget.min}` : sql``})`
  const welcome = s.gender && welcomeFor[s.gender]
  const welcomeOpen = sql`(${listings.whoCanMoveIn} is null or ${listings.whoCanMoveIn} = 'any')`

  const conditions = [
    visibleListing(s.viewerUserId),
    s.viewerUserId && ne(listings.ownerUserId, s.viewerUserId),
    inArray(listings.kind, s.kinds),
    s.areas && sql`${listings.areaSlug} = any(${textArray(s.areas)})`,
    s.roomType && sql`(${listings.kind} <> 'room_in_flat' or ${listings.roomType} is distinct from ${s.roomType === 'private' ? 'shared' : 'private'})`,
    rentFits(true),
    s.moveDate && sql`(${listings.availableFrom} is null or ${listings.availableFrom} between ${s.moveDate}::date - 30 and ${s.moveDate}::date + 30)`,
    welcome && sql`(${welcomeOpen} or ${listings.whoCanMoveIn}::text = any(${textArray(welcome)}))`,
    ...dealbreakers.map((key) => sql`${onListing[key]} is not false`),
  ].filter((c): c is SQL => !!c)

  const didntSay = dealbreakers.length
    ? sql`array_remove(array[${sql.join(dealbreakers.map((key) => sql`case when ${onListing[key]} is null then ${key} end`), sql`, `)}]::text[], null)`
    : sql`'{}'::text[]`
  // A guest gives no gender, so a listing for men or women only is not a full match.
  const full = sql`(cardinality(${didntSay}) = 0 ${s.gender ? sql`` : sql`and ${welcomeOpen}`})`
  const prefsMet = preferences.length ? sql.join(preferences.map((key) => sql`(case when ${onListing[key]} then 1 else 0 end)`), sql` + `) : sql`0`
  const moveGap = s.moveDate ? sql`abs(${listings.availableFrom} - ${s.moveDate}::date)` : sql`null::int`

  const [rows, [total]] = await Promise.all([
    db.select({
      id: listings.id,
      didntSay: sql<MustHaveKey[]>`${didntSay}`.as('didnt_say'),
      isFull: sql<boolean>`${full}`.as('is_full'),
      inBudget: sql<boolean>`${rentFits(false)}`.as('in_budget'),
      prefsMet: sql<number>`${prefsMet}`.as('prefs_met'),
      moveGap: sql<number | null>`${moveGap}`.as('move_gap'),
    }).from(listings).where(and(...conditions))
      .orderBy(sql`is_full desc, in_budget desc, prefs_met desc, move_gap asc nulls last`, desc(listings.createdAt), desc(listings.id))
      .limit(s.limit).offset(s.offset),
    db.select({ n: count() }).from(listings).where(and(...conditions)),
  ])
  return {
    rows: rows.map((r) => ({ id: r.id, didntSay: r.didntSay, bestMatch: preferences.length >= 3 && r.prefsMet === preferences.length })),
    total: total!.n,
  }
}
