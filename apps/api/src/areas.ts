import { and, asc, eq, isNotNull } from 'drizzle-orm'
import type { Db } from './db/client'
import { areas } from './db/schema'

export const listAreas = (db: Db) =>
  db.select({ slug: areas.slug, name: areas.name, parent: areas.parentSlug, aliases: areas.aliases })
    .from(areas).orderBy(asc(areas.sortOrder))

/** A listing is in a sub-area or a pocket, not in a whole group (PD2). */
export const isSubArea = async (db: Db, slug: string | null) =>
  !!slug && (await db.select({ slug: areas.slug }).from(areas).where(and(eq(areas.slug, slug), isNotNull(areas.parentSlug)))).length > 0

export const areaParents = async (db: Db): Promise<ReadonlyMap<string, string | null>> =>
  new Map((await db.select({ slug: areas.slug, parent: areas.parentSlug }).from(areas)).map((a) => [a.slug, a.parent]))

/** The areas that match the picks: each pick, the areas under it, and the areas above it. */
export function relatedAreas(parentOf: ReadonlyMap<string, string | null>, picks: readonly string[]): string[] {
  const lineage = (slug: string): string[] => {
    const parent = parentOf.get(slug)
    return parent ? [slug, ...lineage(parent)] : [slug]
  }
  const above = new Set(picks.flatMap(lineage))
  return [...parentOf.keys()].filter((slug) => above.has(slug) || lineage(slug).some((a) => picks.includes(a)))
}
