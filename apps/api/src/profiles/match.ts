import { and, count, desc, eq, sql, type SQL } from 'drizzle-orm'
import { mustHaveKeys, type LifestyleAxis, type MustHaveKey } from '@roomsie/contract'
import type { Db } from '../db/client'
import { textArray } from '../db/sql'
import { profileLifestyle, profileMustHaves, profiles } from '../db/schema'
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
export function searcherAgainst(answers: SearcherAnswers) {
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

/** True or false, or null when the person did not answer. */
function meets(key: MustHaveKey): SQL {
  const { axis, values } = onPerson[key]!
  const answer = axis === 'gender'
    ? sql`${profiles.gender}::text`
    : sql`(select ${profileLifestyle.value} from ${profileLifestyle} where ${profileLifestyle.profileId} = ${profiles.id} and ${profileLifestyle.axisKey} = ${axis})`
  return sql`(${answer} = any(${textArray(values)}))`
}

const theirDealbreakerIn = (keys: MustHaveKey[]) => sql`exists (select 1 from ${profileMustHaves}
  where ${profileMustHaves.profileId} = ${profiles.id} and ${profileMustHaves.weight} = 'dealbreaker' and ${profileMustHaves.mustHaveKey} = any(${textArray(keys)}))`

export type PeopleSearch = {
  viewerUserId?: string
  /** Null: all of Mumbai. */
  areas: string[] | null
  budget: { min: number | null; max: number | null } | null
  moveDate: string | null
  dealbreakers: MustHaveKey[]
  preferences: MustHaveKey[]
  searcher: ReturnType<typeof searcherAgainst>
  /** The Form B points of the person with this user id. */
  formBPoints: (personUserId: SQL) => SQL
  limit: number
  offset: number
}

/** The flatmates seekers who fit, in the Best Matches order of PD3a, and their number. */
export async function matchingPeople(db: Db, s: PeopleSearch) {
  const dealbreakers = s.dealbreakers.filter(appliesToPeople)
  const preferences = s.preferences.filter(appliesToPeople)

  const conditions = [
    ...visiblePeople(s.viewerUserId),
    eq(profiles.intent, 'flatmates'),
    s.areas && sql`${profiles.areas} && ${textArray(s.areas)}`,
    // Two budgets overlap (PD3a).
    s.budget?.max != null && sql`coalesce(${profiles.budgetMin}, 0) <= ${s.budget.max}`,
    s.budget?.min != null && sql`coalesce(${profiles.budgetMax}, 2147483647) >= ${s.budget.min}`,
    s.moveDate && sql`(${profiles.moveDate} is null or ${profiles.moveDate} between ${s.moveDate}::date - 30 and ${s.moveDate}::date + 30)`,
    ...dealbreakers.map((key) => sql`${meets(key)} is not false`),
    s.searcher.fails.length && sql`not ${theirDealbreakerIn(s.searcher.fails)}`,
  ].filter((c): c is SQL => !!c)

  const didntSay = dealbreakers.length
    ? sql`array_remove(array[${sql.join(dealbreakers.map((key) => sql`case when ${meets(key)} is null then ${key} end`), sql`, `)}]::text[], null)`
    : sql`'{}'::text[]`
  const full = sql`(cardinality(${didntSay}) = 0 and not ${theirDealbreakerIn(s.searcher.gaps)})`
  const prefsMet = preferences.length ? sql.join(preferences.map((key) => sql`(case when ${meets(key)} then 1 else 0 end)`), sql` + `) : sql`0`
  const moveGap = s.moveDate ? sql`abs(${profiles.moveDate} - ${s.moveDate}::date)` : sql`null::int`

  const [rows, [total]] = await Promise.all([
    db.select({
      id: profiles.id,
      didntSay: sql<MustHaveKey[]>`${didntSay}`.as('didnt_say'),
      isFull: sql<boolean>`${full}`.as('is_full'),
      prefsMet: sql<number>`${prefsMet}`.as('prefs_met'),
      points: sql<number>`${s.formBPoints(sql`${profiles.userId}`)}`.as('points'),
      moveGap: sql<number | null>`${moveGap}`.as('move_gap'),
    }).from(profiles).where(and(...conditions))
      .orderBy(sql`is_full desc, prefs_met desc, points desc, move_gap asc nulls last`, desc(profiles.createdAt), desc(profiles.id))
      .limit(s.limit).offset(s.offset),
    db.select({ n: count() }).from(profiles).where(and(...conditions)),
  ])
  return {
    rows: rows.map((r) => ({ id: r.id, didntSay: r.didntSay, bestMatch: preferences.length >= 3 && r.prefsMet === preferences.length })),
    total: total!.n,
  }
}
