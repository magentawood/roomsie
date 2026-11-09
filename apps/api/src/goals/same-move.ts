import { and, desc, eq, ne } from 'drizzle-orm'
import { formA, goalTitle, intentsOf, type FormA } from '@roomsie/contract'
import type { SameMoveTarget } from '../assistant/assistant'
import { catalogueOf, type Catalogue } from '../assistant/catalogue'
import type { Db } from '../db/client'
import { goals } from '../db/schema'
import { ownedBy, type Asker } from './store'

/** A move for a place (a room, a PG or a flat), or for people to rent with. Null: no place type yet. */
const kindOf = (form: FormA) => {
  const types = intentsOf(form)
  return types.length === 0 ? null : types[0] === 'flatmates' ? 'people' : 'places'
}

/** The area group of an area: a sub-area or a pocket counts as its group, so "Bandra West" and "Bandra–Santacruz" are one area. */
const groupOf = ({ bySlug }: Catalogue) => (slug: string) => {
  let at = slug
  for (let parent = bySlug.get(at)?.parent; parent; parent = bySlug.get(at)?.parent) at = parent
  return at
}

/** Two forms of one move: the same kind (places or people), and an area group in common, or no area in either (the founders, 2026-11-09). */
export function looksLikeSameMove(a: FormA, b: FormA, group: (slug: string) => string) {
  const kind = kindOf(a)
  if (!kind || kind !== kindOf(b)) return false
  const [areasA, areasB] = [a, b].map((form) => new Set((form.areas.value ?? []).map(group)))
  return areasA!.size === 0 && areasB!.size === 0 ? true : [...areasA!].some((area) => areasB!.has(area))
}

/** The other open goal of the owner, most recently changed first, that looks like the same move as `form`. Null: none. */
export async function sameMoveOf(db: Db, asker: Asker, form: FormA, except?: string): Promise<SameMoveTarget | null> {
  if (!kindOf(form) || (!asker.userId && !asker.sessionId)) return null
  const rows = await db.select({ id: goals.id, form: goals.form }).from(goals)
    .where(and(ownedBy(asker), eq(goals.status, 'open'), except ? ne(goals.id, except) : undefined)).orderBy(desc(goals.updatedAt)).limit(50)
  const catalogue = await catalogueOf(db)
  const group = groupOf(catalogue)
  for (const row of rows) {
    const other = formA.parse(row.form)
    if (looksLikeSameMove(form, other, group)) return { goalId: row.id, title: goalTitle(other, (slug) => catalogue.bySlug.get(slug)?.name ?? slug) }
  }
  return null
}
