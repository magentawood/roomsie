/** Form A catalogues of PD15; the values are the answer keys of the designs. */
import { sql } from 'drizzle-orm'
import { lifestyleAnswers, mustHaveKeys, type LifestyleAxis } from '@roomsie/contract'
import type { Db } from './client'
import { areas, lifestyleAxes, mustHaves } from './schema'

const questions: Record<LifestyleAxis, string> = {
  food: 'What do you eat?', smoking: 'Do you smoke?', drinks: 'Drinks at home?', guests: 'How often do guests come?',
  your_days: 'What are your days like?', sleep: 'Night owl or early bird?', tidiness: 'How tidy are you?', pets: 'Pets?',
}
const LIFESTYLE_AXES = (Object.keys(questions) as LifestyleAxis[])
  .map((key, i) => ({ key, question: questions[key], allowedValues: [...lifestyleAnswers[key]], sortOrder: i + 1 }))

const mustHaveLabels: Record<(typeof mustHaveKeys)[number], string> = {
  veg_kitchen: 'Veg kitchen', non_smokers: 'Non-smokers', no_alcohol: 'No alcohol at home', women_only: 'Women only',
  men_only: 'Men only', tidy_flatmates: 'Tidy flatmates', couple_friendly: 'Couple friendly',
}
const MUST_HAVES = mustHaveKeys.map((key, i) => ({ key, label: mustHaveLabels[key], sortOrder: i + 1, active: true }))

/** The nine area groups of PD2, in the order of the designs. */
const AREA_GROUPS = [
  { slug: 'andheri-goregaon', name: 'Andheri–Goregaon', sortOrder: 1 },
  { slug: 'bandra-santacruz', name: 'Bandra–Santacruz', sortOrder: 2 },
  { slug: 'powai-vikhroli', name: 'Powai–Vikhroli', sortOrder: 3 },
  { slug: 'lower-parel-worli', name: 'Lower Parel–Worli', sortOrder: 4 },
  { slug: 'south-mumbai', name: 'South Mumbai', sortOrder: 5 },
  { slug: 'malad-borivali', name: 'Malad–Borivali', sortOrder: 6 },
  { slug: 'chembur-ghatkopar', name: 'Chembur–Ghatkopar', sortOrder: 7 },
  { slug: 'thane', name: 'Thane', sortOrder: 8 },
  { slug: 'navi-mumbai', name: 'Navi Mumbai', sortOrder: 9 },
]

export async function seedCatalogues(db: Db) {
  await db.insert(lifestyleAxes).values(LIFESTYLE_AXES)
    .onConflictDoUpdate({
      target: lifestyleAxes.key,
      set: { question: sql`excluded.question`, allowedValues: sql`excluded.allowed_values`, sortOrder: sql`excluded.sort_order` },
    })
  await db.insert(mustHaves).values(MUST_HAVES)
    .onConflictDoUpdate({
      target: mustHaves.key,
      set: { label: sql`excluded.label`, sortOrder: sql`excluded.sort_order`, active: sql`excluded.active` },
    })
  await db.insert(areas).values(AREA_GROUPS)
    .onConflictDoUpdate({ target: areas.slug, set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` } })
}
