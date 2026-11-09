import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { mustHaveKeys, type FormA, type HiddenSlot, type LifestyleAxis, type MustHaveKey } from '@roomsie/contract'
import type { Db } from '../db/client'
import { profileLifestyle, profileMustHaves, profiles } from '../db/schema'
import { textArray } from '../db/sql'
import { formBPoints } from '../observations/read'
import { moveGap, mustHaveSql, near, type BaseSearch } from '../ranking'
import { visiblePeople } from './read'

/** What a must-have checks on a person (PD3a). "Couple friendly" and the walk to a station do not apply to a person. */
const onPerson: Record<MustHaveKey, { axis: LifestyleAxis | 'gender'; values: readonly string[] } | null> = {
  veg_kitchen: { axis: 'food', values: ['veg'] },
  non_smokers: { axis: 'smoking', values: ['non_smoker'] },
  no_alcohol: { axis: 'drinks', values: ['none_at_home'] },
  tidy_flatmates: { axis: 'tidiness', values: ['very_tidy', 'tidy_enough'] },
  women_only: { axis: 'gender', values: ['female'] },
  men_only: { axis: 'gender', values: ['male'] },
  couple_friendly: null,
  near_station: null,
}
const appliesToPeople = (key: MustHaveKey) => onPerson[key] !== null

/** The lifestyle answers and the gender of a searcher. A missing key is an answer that the searcher did not give. */
export type SearcherAnswers = Partial<Record<LifestyleAxis | 'gender', string>>

/** The must-haves that the searcher fails, and the must-haves that the searcher did not answer. */
export function searcherMustHaves(answers: SearcherAnswers) {
  const fails: MustHaveKey[] = []
  const gaps: MustHaveKey[] = []
  for (const key of mustHaveKeys.filter(appliesToPeople)) {
    const { axis, values } = onPerson[key]!
    const answer = answers[axis]
    if (answer === undefined) gaps.push(key)
    else if (!values.includes(answer)) fails.push(key)
  }
  return { fails, gaps }
}

function meets(key: MustHaveKey): SQL {
  const { axis, values } = onPerson[key]!
  const answer = axis === 'gender'
    ? sql`${profiles.gender}::text`
    : sql`(select ${profileLifestyle.value} from ${profileLifestyle} where ${profileLifestyle.profileId} = ${profiles.id} and ${profileLifestyle.axisKey} = ${axis})`
  return sql`(${inArray(answer, [...values])})`
}

const theirDealbreakerIn = (keys: MustHaveKey[]) => sql`exists (select 1 from ${profileMustHaves}
  where ${profileMustHaves.profileId} = ${profiles.id} and ${profileMustHaves.weight} = 'dealbreaker' and ${inArray(profileMustHaves.mustHaveKey, keys)})`

/**
 * "Only" removes the people who stated a different value, and "preferably" adds a point to the order.
 * A person who stated nothing stays, and no label tells it (PC-31).
 */
function identitySql(column: typeof profiles.religion | typeof profiles.community, preference: PeopleSearch[HiddenSlot]) {
  if (!preference) return { filter: undefined, point: sql`0` }
  const stated = sql`${column}::text = any(${textArray(preference.values)})`
  return preference.weight === 'dealbreaker'
    ? { filter: sql`(${column} is null or ${stated})`, point: sql`0` }
    : { filter: undefined, point: sql`(case when ${stated} then 1 else 0 end)` }
}

export type PeopleSearch = BaseSearch & {
  searcher: ReturnType<typeof searcherMustHaves>
  formBFloor: number
  religionPreference: FormA['religionPreference']['value']
  communityPreference: FormA['communityPreference']['value']
}

/** The conditions of a search of people, and the parts of its order. */
function peopleFilter(search: PeopleSearch) {
  const mustHaves = mustHaveSql(meets, search.dealbreakers.filter(appliesToPeople), search.preferences.filter(appliesToPeople))
  const { budget, moveDate, searcher } = search
  const religion = identitySql(profiles.religion, search.religionPreference)
  const community = identitySql(profiles.community, search.communityPreference)

  const conditions = [
    ...visiblePeople(search.viewerUserId),
    eq(profiles.intent, 'flatmates'),
    search.ids && inArray(profiles.id, search.ids),
    search.areas && sql`${profiles.areas} && ${textArray(search.areas)}`,
    // Two budgets overlap (PD3a).
    budget?.max != null && sql`coalesce(${profiles.budgetMin}, 0) <= ${budget.max}`,
    budget?.min != null && sql`coalesce(${profiles.budgetMax}, 2147483647) >= ${budget.min}`,
    moveDate && near(sql`${profiles.moveDate}`, moveDate),
    ...mustHaves.filters,
    searcher.fails.length && sql`not ${theirDealbreakerIn(searcher.fails)}`,
    religion.filter,
    community.filter,
  ].filter((c): c is SQL => !!c)
  return { conditions, mustHaves, religion, community }
}

/** The flatmates seekers who fit, in the Best Matches order of PD3a, and their number. */
export async function matchingPeople(db: Db, search: PeopleSearch) {
  const { conditions, mustHaves, religion, community } = peopleFilter(search)
  const { moveDate, searcher } = search
  const [rows, total] = await Promise.all([
    db.select({
      id: profiles.id,
      didntSay: sql<MustHaveKey[]>`${mustHaves.didntSay}`.as('didnt_say'),
      isFull: sql<boolean>`(cardinality(${mustHaves.didntSay}) = 0 and not ${theirDealbreakerIn(searcher.gaps)})`.as('is_full'),
      prefsMet: sql<number>`${mustHaves.prefsMet}`.as('prefs_met'),
      formBPoints: sql<number>`${search.viewerUserId ? formBPoints(search.viewerUserId, sql`${profiles.userId}`, search.formBFloor) : sql`0`}`.as('form_b_points'),
      moveGap: sql<number | null>`${moveGap(sql`${profiles.moveDate}`, moveDate)}`.as('move_gap'),
    }).from(profiles).where(and(...conditions))
      .orderBy(sql`is_full desc, ${mustHaves.prefsMet} + ${religion.point} + ${community.point} desc, form_b_points desc, move_gap asc nulls last`, desc(profiles.createdAt))
      .limit(search.limit).offset(search.offset),
    db.$count(profiles, and(...conditions)),
  ])
  return { rows: rows.map((r) => ({ id: r.id, ...mustHaves.labels(r) })), total }
}

/** For each must-have that a person answers, how many people of the search meet it: the notes of Roomsie Noticed. */
export async function peopleCounts(db: Db, search: PeopleSearch, keys: MustHaveKey[]): Promise<Partial<Record<MustHaveKey, number>>> {
  const asked = keys.filter(appliesToPeople)
  if (!asked.length) return {}
  const [row] = await db.select(Object.fromEntries(asked.map((key) => [key, sql<number>`count(*) filter (where ${meets(key)})`.mapWith(Number)])))
    .from(profiles).where(and(...peopleFilter(search).conditions))
  return row ?? {}
}

/** The flatmates seekers in the areas, whatever their budget: the people a searcher of places could team up with. */
export const teamUpCount = (db: Db, viewerUserId: string | undefined, areas: string[] | null) =>
  db.$count(profiles, and(...visiblePeople(viewerUserId), eq(profiles.intent, 'flatmates'), areas ? sql`${profiles.areas} && ${textArray(areas)}` : undefined))
