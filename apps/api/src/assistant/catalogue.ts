import { asc } from 'drizzle-orm'
import type { LifestyleAxis } from '@roomsie/contract'
import { listAreas } from '../areas'
import type { Db } from '../db/client'
import { lifestyleAxes, mustHaves } from '../db/schema'

/** Letters and digits of each script, so a word in Devanagari stays. A nukta goes, so "सांताक्रूज़" and "सांताक्रूज" are one name. */
const normalized = (words: string) => words.normalize('NFD').replace(/\u093C/g, '').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()

/** The name of an area and its other names, in each script. */
export const namesOf = (area: { name: string; aliases: string[] }) => [area.name, ...area.aliases]

/** The seed data that the assistant reads: the areas with their names, and the labels of the questions. */
async function load(db: Db) {
  const [areas, axes, musts] = await Promise.all([
    listAreas(db),
    db.select({ key: lifestyleAxes.key, question: lifestyleAxes.question }).from(lifestyleAxes).orderBy(asc(lifestyleAxes.sortOrder)),
    db.select({ key: mustHaves.key, label: mustHaves.label }).from(mustHaves),
  ])
  // A name of two areas, such as "Andheri", gives both.
  const byName = new Map<string, string[]>()
  const spelling = new Map<string, string>()
  for (const area of areas) {
    for (const name of namesOf(area)) {
      byName.set(normalized(name), [...new Set([...(byName.get(normalized(name)) ?? []), area.slug])])
      if (!spelling.has(normalized(name))) spelling.set(normalized(name), name)
    }
  }
  return {
    areas,
    bySlug: new Map(areas.map((a) => [a.slug, a])),
    /** The areas of a name that the person typed, or none for a name that is not in the seed. */
    areasNamed: (words: string) => byName.get(normalized(words)) ?? [],
    /** The seeded names inside longer words, as "Andheri" in "Andheri station". A name inside a longer found name does not count. */
    namesIn: (words: string) => {
      const found = [...byName.keys()].filter((name) => saidIn(words, name)).sort((a, b) => b.length - a.length)
      const outer = found.filter((name, i) => !found.slice(0, i).some((longer) => saidIn(longer, name)))
      return outer.map((name) => ({ words: spelling.get(name)!, slugs: byName.get(name)! }))
    },
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
export const saidIn = (text: string, words: string) => normalized(words).length > 0 && ` ${normalized(text)} `.includes(` ${normalized(words)} `)
