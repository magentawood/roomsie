import { asc } from 'drizzle-orm'
import { waitlistPlaceSlugs, waitlistPlaces, type LifestyleAxis, type WaitlistPlace } from '@roomsie/contract'
import { listAreas } from '../areas'
import type { Db } from '../db/client'
import { lifestyleAxes, mustHaves } from '../db/schema'
import { isDevanagari, plainText } from './words'


/** The Marathi endings of a place: "पवईत", "दादरला", "दादरमध्ये", "पश्चिमेला" (PC-09). */
const endings = ['त', 'ात', 'ला', 'मध्ये', 'मधे', 'च्या', 'ची', 'चा', 'चे', 'हून', 'पर्यंत', 'जवळ']
const vowelSigns = /[\u093E-\u094C]$/u
/** A Devanagari name with each Marathi ending on its last word. A last "े" or "ा" becomes "्या", as "ठाण्यात" and "कुर्ल्यात". */
function withEndings(name: string): string[] {
  if (!isDevanagari(name)) return []
  const oblique = name.endsWith('े') || name.endsWith('ा') ? [`${name.slice(0, -1)}्या`] : []
  const stems = oblique.length || vowelSigns.test(name) ? [name, ...oblique] : [name, `${name}े`, `${name}ा`]
  return stems.flatMap((stem) => endings.map((ending) => stem + ending))
}

/** The name of an area and its other names, in each script. */
export const namesOf = (area: { name: string; aliases: readonly string[] }) => [area.name, ...area.aliases]

/** The seed data that the assistant reads: the areas with their names, and the labels of the questions. */
async function load(db: Db) {
  const [areas, axes, musts] = await Promise.all([
    listAreas(db),
    db.select({ key: lifestyleAxes.key, question: lifestyleAxes.question }).from(lifestyleAxes).orderBy(asc(lifestyleAxes.sortOrder)),
    db.select({ key: mustHaves.key, label: mustHaves.label }).from(mustHaves),
  ])
  // A name of two areas, such as "Andheri", gives both. A name with a Marathi ending keeps the plain name as `words`.
  // A waitlist place has no areas: `outside` names it. One match finds both, so the longer name wins.
  const byName = new Map<string, { words: string; slugs: string[]; outside?: WaitlistPlace }>()
  const add = (key: string, words: string, slug: string | null, outside?: WaitlistPlace) => {
    const known = byName.get(key)
    byName.set(key, { words: known?.words ?? words, slugs: [...new Set([...(known?.slugs ?? []), ...(slug ? [slug] : [])])], ...(outside && { outside }) })
  }
  const addNames = (names: string[], slug: string | null, outside?: WaitlistPlace) => {
    for (const name of names) for (const form of [name, ...withEndings(name)]) add(plainText(form), name, slug, outside)
  }
  for (const area of areas) addNames(namesOf(area), area.slug)
  for (const slug of waitlistPlaceSlugs) addNames(namesOf(waitlistPlaces[slug]), null, slug)
  const longestName = Math.max(...[...byName.keys()].map((name) => name.split(' ').length))
  return {
    areas,
    bySlug: new Map(areas.map((a) => [a.slug, a])),
    /** The seeded names in a text, longest first, as "अंधेरी" in "अंधेरीत". Each gives the name as the seed spells it, and its areas. */
    namesIn: (text: string) => {
      const tokens = plainText(text).split(' ')
      const found: { words: string; slugs: string[]; outside?: WaitlistPlace }[] = []
      for (let i = 0; i < tokens.length; i++) {
        for (let n = Math.min(longestName, tokens.length - i); n >= 1; n--) {
          const hit = byName.get(tokens.slice(i, i + n).join(' '))
          if (!hit) continue
          found.push(hit)
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
export const saidIn = (text: string, words: string) => plainText(words).length > 0 && ` ${plainText(text)} `.includes(` ${plainText(words)} `)
