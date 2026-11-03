import { and, asc, eq, inArray, isNotNull } from 'drizzle-orm'
import type { Db } from './db/client'
import { areas } from './db/schema'

export const listAreas = (db: Db) =>
  db.select({ slug: areas.slug, name: areas.name, parent: areas.parentSlug, aliases: areas.aliases })
    .from(areas).orderBy(asc(areas.sortOrder))

/** The names of these areas, by slug. */
export async function areaNames(db: Db, slugs: string[]) {
  const rows = slugs.length ? await db.select({ slug: areas.slug, name: areas.name }).from(areas).where(inArray(areas.slug, slugs)) : []
  return new Map(rows.map(({ slug, name }) => [slug, name]))
}

/** The slugs of these that are areas. */
export const knownAreas = (db: Db, slugs: string[]) => db.select({ slug: areas.slug }).from(areas).where(inArray(areas.slug, slugs))

/** A listing is in a sub-area or a pocket, not in a whole group (PD2). */
export const isSubArea = async (db: Db, slug: string | null) =>
  !!slug && (await db.select({ slug: areas.slug }).from(areas).where(and(eq(areas.slug, slug), isNotNull(areas.parentSlug)))).length > 0

export const areaParents = async (db: Db): Promise<ReadonlyMap<string, string | null>> =>
  new Map((await db.select({ slug: areas.slug, parent: areas.parentSlug }).from(areas)).map((a) => [a.slug, a.parent]))

/** An area and the areas above it, up to its area group. */
export function lineage(parentOf: ReadonlyMap<string, string | null>, slug: string): string[] {
  const parent = parentOf.get(slug)
  return parent ? [slug, ...lineage(parentOf, parent)] : [slug]
}

/** The area groups next to these area groups, in seed order, without the groups themselves (PD6c). */
export async function neighboursOf(db: Db, groups: string[]) {
  const rows = await db.select({ neighbours: areas.neighbours }).from(areas).where(inArray(areas.slug, groups)).orderBy(asc(areas.sortOrder))
  return [...new Set(rows.flatMap((r) => r.neighbours))].filter((slug) => !groups.includes(slug))
}

/** The areas that match the picks: each pick, the areas under it, and the areas above it. */
export function matchingAreas(parentOf: ReadonlyMap<string, string | null>, picks: readonly string[]): string[] {
  return [...parentOf.keys()].filter((slug) => picks.some((pick) => lineage(parentOf, pick).includes(slug) || lineage(parentOf, slug).includes(pick)))
}
