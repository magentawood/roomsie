import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm'
import { mustHaveKeys, type LifestyleAxis, type MustHaveKey } from '@roomsie/contract'
import type { Db } from '../db/client'
import { profileLifestyle, profileMustHaves, profiles } from '../db/schema'
import { textArray } from '../db/sql'
import { formBPoints } from '../observations/read'
import { moveGap, mustHaveSql, near, type BaseSearch } from '../ranking'
import { visiblePeople } from './read'

/** What a must-have checks on a person (PD3a). "Couple friendly" does not apply to a person. */
const onPerson: Record<MustHaveKey, { axis: LifestyleAxis | 'gender'; values: readonly string[] } | null> = {
  veg_kitchen: { axis: 'food', values: ['veg'] },
  non_smokers: { axis: 'smoking', values: ['non_smoker'] },
  no_alcohol: { axis: 'drinks', values: ['none_at_home'] },
  tidy_flatmates: { axis: 'tidiness', values: ['very_tidy', 'tidy_enough'] },
  women_only: { axis: 'gender', values: ['female'] },
  men_only: { axis: 'gender', values: ['male'] },
  couple_friendly: null,
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

export type PeopleSearch = BaseSearch & {
  searcher: ReturnType<typeof searcherMustHaves>
  /** A Form B note counts only above this confidence. */
  formBFloor: number
}

/** The flatmates seekers who fit, in the Best Matches order of PD3a, and their number. */
export async function matchingPeople(db: Db, search: PeopleSearch) {
  const rank = mustHaveSql(meets, search.dealbreakers.filter(appliesToPeople), search.preferences.filter(appliesToPeople))
  const { budget, moveDate, searcher } = search

  const conditions = [
    ...visiblePeople(search.viewerUserId),
    eq(profiles.intent, 'flatmates'),
    search.areas && sql`${profiles.areas} && ${textArray(search.areas)}`,
    // Two budgets overlap (PD3a).
    budget?.max != null && sql`coalesce(${profiles.budgetMin}, 0) <= ${budget.max}`,
    budget?.min != null && sql`coalesce(${profiles.budgetMax}, 2147483647) >= ${budget.min}`,
    moveDate && near(sql`${profiles.moveDate}`, moveDate),
    ...rank.filters,
    searcher.fails.length && sql`not ${theirDealbreakerIn(searcher.fails)}`,
  ].filter((c): c is SQL => !!c)

  const [rows, [total]] = await Promise.all([
    db.select({
      id: profiles.id,
      didntSay: sql<MustHaveKey[]>`${rank.didntSay}`.as('didnt_say'),
      isFull: sql<boolean>`(cardinality(${rank.didntSay}) = 0 and not ${theirDealbreakerIn(searcher.gaps)})`.as('is_full'),
      prefsMet: sql<number>`${rank.prefsMet}`.as('prefs_met'),
      points: sql<number>`${search.viewerUserId ? formBPoints(search.viewerUserId, sql`${profiles.userId}`, search.formBFloor) : sql`0`}`.as('points'),
      moveGap: sql<number | null>`${moveGap(sql`${profiles.moveDate}`, moveDate)}`.as('move_gap'),
    }).from(profiles).where(and(...conditions))
      .orderBy(sql`is_full desc, prefs_met desc, points desc, move_gap asc nulls last`, desc(profiles.createdAt))
      .limit(search.limit).offset(search.offset),
    db.select({ n: count() }).from(profiles).where(and(...conditions)),
  ])
  return { rows: rows.map((r) => ({ id: r.id, ...rank.labels(r) })), total: total!.n }
}
