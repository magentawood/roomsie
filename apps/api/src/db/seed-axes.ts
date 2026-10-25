/** Form A catalogues of PD15; the values are the answer keys of the designs. */
import { sql } from 'drizzle-orm'
import { foodAnswers } from '@roomsie/contract'
import type { Db } from './client'
import { areas, lifestyleAxes, mustHaves } from './schema'

const LIFESTYLE_AXES = [
  { key: 'food', question: 'What do you eat?', allowedValues: [...foodAnswers], sortOrder: 1 },
  { key: 'smoking', question: 'Do you smoke?', allowedValues: ['non_smoker', 'smoker', 'smoke_outside'], sortOrder: 2 },
  { key: 'drinks', question: 'Drinks at home?', allowedValues: ['none_at_home', 'fine_at_home'], sortOrder: 3 },
  { key: 'guests', question: 'How often do guests come?', allowedValues: ['weekends_only', 'guests_welcome', 'guests_rarely'], sortOrder: 4 },
  { key: 'your_days', question: 'What are your days like?', allowedValues: ['out_most_days', 'home_most_days', 'night_shifts', 'student'], sortOrder: 5 },
  { key: 'sleep', question: 'Night owl or early bird?', allowedValues: ['night_owl', 'early_bird'], sortOrder: 6 },
  { key: 'tidiness', question: 'How tidy are you?', allowedValues: ['very_tidy', 'tidy_enough', 'relaxed_about_mess'], sortOrder: 7 },
  { key: 'pets', question: 'Pets?', allowedValues: ['no_pets', 'fine_with_pets'], sortOrder: 8 },
]

const MUST_HAVES = [
  { key: 'veg_kitchen', label: 'Veg kitchen', sortOrder: 1, active: true },
  { key: 'non_smokers', label: 'Non-smokers', sortOrder: 2, active: true },
  { key: 'no_alcohol', label: 'No alcohol at home', sortOrder: 3, active: true },
  { key: 'women_only', label: 'Women only', sortOrder: 4, active: true },
  { key: 'men_only', label: 'Men only', sortOrder: 5, active: true },
  { key: 'tidy_flatmates', label: 'Tidy flatmates', sortOrder: 6, active: true },
  { key: 'couple_friendly', label: 'Couple friendly', sortOrder: 7, active: true },
]

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
  // The launch flag is not in the update: F-06 sets it, and a deploy must keep it.
  await db.insert(areas).values(AREA_GROUPS)
    .onConflictDoUpdate({ target: areas.slug, set: { name: sql`excluded.name`, sortOrder: sql`excluded.sort_order` } })
}
