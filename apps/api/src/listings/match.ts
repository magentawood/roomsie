import { and, count, desc, inArray, ne, sql, type SQL } from 'drizzle-orm'
import { roomWelcomeGroups, type Gender, type ListingKind, type MustHaveKey, type roomTypes, type welcomeGroups, type WhosMoving, type whoCanMoveIn } from '@roomsie/contract'
import type { Db } from '../db/client'
import { listingRates, listings } from '../db/schema'
import { textArray } from '../db/sql'
import { moveGap, mustHaveSql, near, type BaseSearch } from '../ranking'
import { visibleListing } from './read'

const householdGroups = ['bachelors', 'couples', 'families'] as const satisfies readonly (typeof welcomeGroups)[number][]

/** The type and the household of each answer to "Who's moving", as groups of "Who is welcome" (PD15). A part that is not known is absent. */
const welcomeOf: Record<WhosMoving, { type?: (typeof roomWelcomeGroups)[number]; household?: (typeof householdGroups)[number] }> = {
  student: { type: 'students', household: 'bachelors' },
  first_job: { type: 'working_professionals', household: 'bachelors' },
  working: { type: 'working_professionals', household: 'bachelors' },
  couple: { household: 'couples' },
  family: { household: 'families' },
  friends: { household: 'bachelors' },
  unclear: {},
}

/** What a must-have checks on a listing, as true or false, or null when the lister did not say (PD3a). */
const onListing: Record<MustHaveKey, SQL | null> = {
  veg_kitchen: sql`${listings.vegOnlyKitchen}`,
  non_smokers: sql`(not ${listings.smokingAllowed})`,
  no_alcohol: sql`(not ${listings.alcoholAllowed})`,
  // A listing with no household group did not say. A room can only welcome students and working professionals (PD15).
  couple_friendly: sql`(case when not ${listings.whoIsWelcome} && ${textArray(householdGroups)} then null else 'couples' = any(${listings.whoIsWelcome}) end)`,
  tidy_flatmates: null,
  women_only: null,
  men_only: null,
}
const appliesToListings = (key: MustHaveKey) => onListing[key] !== null

/** "Who can move in" for each gender of a searcher, besides Any (PD3a, F-13). */
const moveInFor: Record<Gender, (typeof whoCanMoveIn)[number][]> = { male: ['men'], female: ['women'], non_binary: [] }

export type ListingSearch = BaseSearch & {
  kinds: ListingKind[]
  roomType: Exclude<(typeof roomTypes)[number], 'unclear'> | null
  whosMoving: WhosMoving | null
  /** Null: the searcher did not give a gender. */
  gender: Gender | null
}

/** The listing welcomes this group, or the lister picked no group of its part (PD15). */
const welcomes = (group: string | undefined, part: readonly string[]) => group
  && sql`(not ${listings.whoIsWelcome} && ${textArray(part)} or ${group} = any(${listings.whoIsWelcome}))`

/** The listings that fit, in the Best Matches order of PD3a, and their number. */
export async function matchingListings(db: Db, search: ListingSearch) {
  const rank = mustHaveSql((key) => onListing[key]!, search.dealbreakers.filter(appliesToListings), search.preferences.filter(appliesToListings))
  const { budget, moveDate, roomType, gender } = search
  const welcome = search.whosMoving ? welcomeOf[search.whosMoving] : {}

  // A PG counts the rents of the room type of the searcher: Single for "private" (PC-29).
  const pgSharing = { private: sql`= 'single'`, shared: sql`<> 'single'` }
  const rentFits = (leeway: boolean) => sql`exists (select 1 from ${listingRates} where ${listingRates.listingId} = ${listings.id}
    ${roomType ? sql`and (${listings.kind} <> 'pg' or ${listingRates.sharing} ${pgSharing[roomType]})` : sql``}
    ${budget?.max != null ? (leeway ? sql`and ${listingRates.rent} * 10 <= ${budget.max} * 11` : sql`and ${listingRates.rent} <= ${budget.max}`) : sql``}
    ${budget?.min != null ? sql`and ${listingRates.rent} >= ${budget.min}` : sql``})`
  const openToAll = sql`(${listings.whoCanMoveIn} is null or ${listings.whoCanMoveIn} = 'any')`
  // A searcher with no "Who's moving" is a gap for a listing that names a group (PD3a).
  const movingGap = welcome.type || welcome.household ? sql`` : sql`and cardinality(${listings.whoIsWelcome}) = 0`

  const conditions = [
    visibleListing(search.viewerUserId),
    search.viewerUserId && ne(listings.ownerUserId, search.viewerUserId),
    inArray(listings.kind, search.kinds),
    search.areas && inArray(listings.areaSlug, search.areas),
    roomType && sql`(${listings.kind} <> 'room_in_flat' or ${listings.roomType} is distinct from ${roomType === 'private' ? 'shared' : 'private'})`,
    rentFits(true),
    moveDate && near(sql`${listings.availableFrom}`, moveDate),
    gender && sql`(${openToAll} or ${inArray(listings.whoCanMoveIn, moveInFor[gender])})`,
    welcomes(welcome.type, roomWelcomeGroups),
    welcomes(welcome.household, householdGroups),
    ...rank.filters,
  ].filter((c): c is SQL => !!c)

  const [rows, [total]] = await Promise.all([
    db.select({
      id: listings.id,
      didntSay: sql<MustHaveKey[]>`${rank.didntSay}`.as('didnt_say'),
      // A guest gives no gender, so a listing for men or women only is not a full match.
      isFull: sql<boolean>`(cardinality(${rank.didntSay}) = 0 ${gender ? sql`` : sql`and ${openToAll}`} ${movingGap})`.as('is_full'),
      inBudget: sql<boolean>`${rentFits(false)}`.as('in_budget'),
      prefsMet: sql<number>`${rank.prefsMet}`.as('prefs_met'),
      moveGap: sql<number | null>`${moveGap(sql`${listings.availableFrom}`, moveDate)}`.as('move_gap'),
    }).from(listings).where(and(...conditions))
      .orderBy(sql`is_full desc, in_budget desc, prefs_met desc, move_gap asc nulls last`, desc(listings.createdAt))
      .limit(search.limit).offset(search.offset),
    db.select({ n: count() }).from(listings).where(and(...conditions)),
  ])
  return { rows: rows.map((r) => ({ id: r.id, ...rank.labels(r) })), total: total!.n }
}
