import { asc } from 'drizzle-orm'
import type { LifestyleAxis } from '@roomsie/contract'
import { listAreas } from '../areas'
import type { Db } from '../db/client'
import { lifestyleAxes, mustHaves } from '../db/schema'
import { isDevanagari, plainWords } from './words'

/** Letters and digits of each script, so a word in Devanagari stays. A nukta goes, so "सांताक्रूज़" and "सांताक्रूज" are one name. */
const normalized = (words: string) => plainWords(words).replace(/[^\p{L}\p{M}\p{N}]+/gu, ' ').trim()

/** The Marathi endings of a place: "पवईत", "दादरला", "दादरमध्ये", "पश्चिमेला" (PC-09). */
const endings = ['त', 'ात', 'ला', 'मध्ये', 'मधे', 'च्या', 'ची', 'चा', 'चे', 'हून', 'पर्यंत', 'जवळ']
const vowelSigns = /[\u093E-\u094C]$/u
/** A Devanagari name with each Marathi ending on its last word. A last "े" becomes "्या", as "ठाणे" in "ठाण्यात". */
function withEndings(name: string): string[] {
  if (!isDevanagari(name)) return []
  const stems = name.endsWith('े') ? [name, `${name.slice(0, -1)}्या`] : vowelSigns.test(name) ? [name] : [name, `${name}े`, `${name}ा`]
  return stems.flatMap((stem) => endings.map((ending) => stem + ending))
}

/** The name of an area and its other names, in each script. */
export const namesOf = (area: { name: string; aliases: string[] }) => [area.name, ...area.aliases]

/** The seed data that the assistant reads: the areas with their names, and the labels of the questions. */
async function load(db: Db) {
  const [areas, axes, musts] = await Promise.all([
    listAreas(db),
    db.select({ key: lifestyleAxes.key, question: lifestyleAxes.question }).from(lifestyleAxes).orderBy(asc(lifestyleAxes.sortOrder)),
    db.select({ key: mustHaves.key, label: mustHaves.label }).from(mustHaves),
  ])
  // A name of two areas, such as "Andheri", gives both. A name with a Marathi ending is shown as the plain name.
  const byName = new Map<string, string[]>()
  const spelling = new Map<string, string>()
  const add = (key: string, slug: string, shown: string) => {
    byName.set(key, [...new Set([...(byName.get(key) ?? []), slug])])
    if (!spelling.has(key)) spelling.set(key, shown)
  }
  for (const area of areas) {
    for (const name of namesOf(area)) {
      add(normalized(name), area.slug, name)
      for (const form of withEndings(name)) add(normalized(form), area.slug, name)
    }
  }
  const longestName = Math.max(...[...byName.keys()].map((name) => name.split(' ').length))
  return {
    areas,
    bySlug: new Map(areas.map((a) => [a.slug, a])),
    /**
     * The seeded names in the words, the longest first, as "Andheri" in "Andheri station" or "अंधेरी" in "अंधेरीत".
     * `words` is the name as the seed spells it.
     */
    namesIn: (words: string) => {
      const tokens = normalized(words).split(' ')
      const found: { words: string; slugs: string[] }[] = []
      for (let i = 0; i < tokens.length; i++) {
        for (let n = Math.min(longestName, tokens.length - i); n >= 1; n--) {
          const name = tokens.slice(i, i + n).join(' ')
          if (!byName.has(name)) continue
          found.push({ words: spelling.get(name)!, slugs: byName.get(name)! })
          i += n - 1
          break
        }
      }
      return found
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
