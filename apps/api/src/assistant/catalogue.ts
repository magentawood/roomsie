import { asc } from 'drizzle-orm'
import type { LifestyleAxis } from '@roomsie/contract'
import { listAreas } from '../areas'
import type { Db } from '../db/client'
import { lifestyleAxes, mustHaves } from '../db/schema'

const normal = (words: string) => words.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** The seed data that the assistant reads: the areas with their names, and the labels of the questions. */
async function load(db: Db) {
  const [areas, axes, musts] = await Promise.all([
    listAreas(db),
    db.select({ key: lifestyleAxes.key, question: lifestyleAxes.question }).from(lifestyleAxes).orderBy(asc(lifestyleAxes.sortOrder)),
    db.select({ key: mustHaves.key, label: mustHaves.label }).from(mustHaves),
  ])
  // A name of two areas, such as "Andheri", gives both.
  const byName = new Map<string, string[]>()
  for (const area of areas) {
    for (const name of [area.name, ...area.aliases]) byName.set(normal(name), [...new Set([...(byName.get(normal(name)) ?? []), area.slug])])
  }
  return {
    areas,
    names: new Map(areas.map((a) => [a.slug, a.name])),
    /** The areas of a name that the person typed, or none for a name that is not in the seed. */
    areasNamed: (words: string) => byName.get(normal(words)) ?? [],
    questions: new Map(axes.map((a) => [a.key as LifestyleAxis, a.question])),
    mustHaveLabels: new Map(musts.map((m) => [m.key, m.label])),
  }
}
export type Catalogue = Awaited<ReturnType<typeof load>>

/** The seed changes only at a deploy, so each database loads it one time. */
const loaded = new WeakMap<Db, Promise<Catalogue>>()
export function catalogueOf(db: Db) {
  if (!loaded.has(db)) loaded.set(db, load(db).catch((err: unknown) => {
    loaded.delete(db)
    throw err
  }))
  return loaded.get(db)!
}

/** The words of the person must be in the turn: the model copies them, it does not write them (PD7). */
export const saidIn = (text: string, words: string) => normal(words).length > 0 && ` ${normal(text)} `.includes(` ${normal(words)} `)
