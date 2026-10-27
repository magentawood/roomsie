/**
 * roomsie — the match query   (T-14, issue #27)
 *
 * Given a Form A state, return the people who fit, best first.
 *
 * Two jobs that are often confused, kept separate here:
 *   FILTERING  removes people who cannot work — area, budget, move date,
 *              incompatible intent, a violated dealbreaker, a block.
 *   RANKING    orders the rest by how many preferences they meet.
 *
 * interface-shape.md (hole 3) settles why they are separate: filtering needs
 * only area and budget, so results can appear about three turns in, while
 * ranking on compatibility needs lifestyle answers that take much longer.
 * So we show results early and honestly, and withhold the score until it
 * means something.
 */
import { and, inArray, sql, desc } from 'drizzle-orm'
import { areaParents, matchingAreas } from '../areas'
import type { Db } from '../db/client'
import { profiles, profileLifestyle } from '../db/schema'
import { compatibleIntents, type Intent } from './intent'
import { visiblePeople } from './read'

/* ── input ──────────────────────────────────────────────────────────────── */
// TODO(T-08): import Form A from the contract. PD15 moves the weight to the must-haves.
export type LifestyleAnswer = {
  axisKey: string
  value: string
  weight: 'prefer' | 'dealbreaker'
}

export type FormA = {
  intent: Intent
  budgetMin?: number
  budgetMax?: number
  areas: string[]
  moveDate?: string
  lifestyle: LifestyleAnswer[]
}

export type MatchRow = {
  profileId: string
  displayName: string
  age: number | null
  areas: string[]
  budgetMin: number | null
  budgetMax: number | null
  photoKeys: string[]
  /** null until the searcher has stated at least one preference. */
  score: number | null
}

export type MatchResult = {
  rows: MatchRow[]
  total: number
  /** False until intent, areas and budget are all filled. */
  resultsUnlocked: boolean
  /** False until the searcher has stated a preference for the score to measure. */
  scoreShown: boolean
  /** The panel header, which changes as the form fills in. */
  header: string
}

/* ── gates ──────────────────────────────────────────────────────────────── */

/** Results appear once intent, area and budget exist — about three turns
 *  (interface-shape.md, hole 3). Move date is a filter, not a gate. */
export const resultsUnlocked = (f: FormA) =>
  f.intent !== 'unclear' && f.areas.length > 0 && (f.budgetMax != null || f.budgetMin != null)

// TODO(T-14): PD3a replaces the score with the Best match label.
export const scoreShown = (f: FormA) => f.lifestyle.some((a) => a.weight === 'prefer')

/** The completeness gate that ends the interview (ai-agent-design.md §3.3).
 *  The assistant uses this; the query does not. */
export const minimumSlotSetMet = (f: FormA) =>
  f.intent !== 'unclear' &&
  f.areas.length > 0 &&
  (f.budgetMax != null || f.budgetMin != null) &&
  f.moveDate != null &&
  f.lifestyle.filter((a) => a.weight === 'dealbreaker').length >= 2

/** Headers by state, from interface-shape.md hole 3. */
export const panelHeader = (f: FormA, total: number): string => {
  if (!resultsUnlocked(f)) return 'Everything in Mumbai'
  const where = f.areas.length === 1 ? f.areas[0] : `${f.areas.length} areas`
  if (f.budgetMax == null) return `Flats in ${where} · ${total}`
  return `Flats in ${where} under ${f.budgetMax.toLocaleString('en-IN')}`
}

/* ── the query ──────────────────────────────────────────────────────────── */

export async function findMatches(
  db: Db,
  form: FormA,
  opts: { viewerUserId?: string; viewerProfileId?: string; limit?: number; offset?: number } = {},
): Promise<MatchResult> {
  const limit = opts.limit ?? 20
  const unlocked = resultsUnlocked(form)
  const showScore = scoreShown(form)

  if (!unlocked) {
    return { rows: [], total: 0, resultsUnlocked: false, scoreShown: false, header: panelHeader(form, 0) }
  }

  const dealbreakers = form.lifestyle.filter((a) => a.weight === 'dealbreaker')
  const preferences = form.lifestyle.filter((a) => a.weight === 'prefer')

  /** No person fits an intent that sees only listings (PD3a), or picks that are not areas. */
  const intents = compatibleIntents(form.intent)
  const areas = intents.length ? matchingAreas(await areaParents(db), form.areas) : []
  if (!areas.length) return { rows: [], total: 0, resultsUnlocked: true, scoreShown: showScore, header: panelHeader(form, 0) }

  /* Hard filters -------------------------------------------------------- */
  const conditions = [
    ...visiblePeople(opts.viewerUserId),
    inArray(profiles.intent, intents),
    /** Areas overlap, where an area includes the areas under it. `&&` is Postgres array intersection.
     *  Drizzle renders a JS array as a list `($1, $2)`, so the areas go in as one `text[]`. */
    sql`${profiles.areas} && array[${sql.join(areas.map((a) => sql`${a}`), sql`, `)}]::text[]`,
  ]

  /** Budget ranges must overlap, not match. Someone asking up to 25k and
   *  someone offering from 20k can talk; two exact numbers rarely meet. */
  if (form.budgetMax != null) conditions.push(sql`coalesce(${profiles.budgetMin}, 0) <= ${form.budgetMax}`)
  if (form.budgetMin != null) conditions.push(sql`coalesce(${profiles.budgetMax}, 2147483647) >= ${form.budgetMin}`)

  /** Move date within a month either way — moving dates are approximate and
   *  an exact-match filter would empty the panel. */
  if (form.moveDate != null) {
    conditions.push(sql`(${profiles.moveDate} is null or ${profiles.moveDate} between ${form.moveDate}::date - interval '30 days' and ${form.moveDate}::date + interval '30 days')`)
  }

  /* Dealbreakers -------------------------------------------------------- *
   * Each of the searcher's dealbreakers must be satisfied: the candidate
   * must have answered that axis, with that value. A candidate who has not
   * answered is excluded — an unanswered dealbreaker is not a pass.
   */
  for (const db_ of dealbreakers) {
    conditions.push(sql`exists (
      select 1 from ${profileLifestyle} pl
      where pl.profile_id = ${profiles.id}
        and pl.axis_key   = ${db_.axisKey}
        and pl.value      = ${db_.value}
    )`)
  }

  // TODO(T-14): apply the candidate's must-haves back to the searcher, with the mapping of PD3a.

  /* Score ---------------------------------------------------------------- *
   * 70 + 30 × (share of the searcher's preferences the candidate meets).
   * Baseline 70 because everyone here already cleared every hard filter —
   * they are all genuinely viable, and a 12% match on a viable person reads
   * as a worse result than it is. A select list from one table names its
   * columns without the table, so the subquery names the table itself.
   */
  const scoreExpr = showScore
    ? sql<number>`70 + 30.0 * (
        select count(*)::float / ${preferences.length}
        from ${profileLifestyle} pl
        where pl.profile_id = ${profiles}.id
          and (${sql.join(
            preferences.map((p) => sql`(pl.axis_key = ${p.axisKey} and pl.value = ${p.value})`),
            sql` or `,
          )})
      )`
    : sql<number>`null`

  const rows = await db
    .select({
      profileId: profiles.id,
      displayName: profiles.fullName,
      age: profiles.age,
      areas: profiles.areas,
      budgetMin: profiles.budgetMin,
      budgetMax: profiles.budgetMax,
      photoKeys: profiles.photoKeys,
      score: scoreExpr,
    })
    .from(profiles)
    .where(and(...conditions))
    /** Ranked by score when there is one; newest first when there is not, so
     *  an empty ranking never looks arbitrary. */
    .orderBy(showScore ? desc(scoreExpr) : desc(profiles.createdAt))
    .limit(limit)
    .offset(opts.offset ?? 0)

  return {
    rows: rows as MatchRow[],
    total: rows.length,
    resultsUnlocked: true,
    scoreShown: showScore,
    header: panelHeader(form, rows.length),
  }
}
