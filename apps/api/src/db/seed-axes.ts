/** Form A catalogues of PD15; the values are the answer keys of the designs. */
import { sql } from 'drizzle-orm'
import type { Db } from './client'
import { lifestyleAxes, mustHaves } from './schema'

const LIFESTYLE_AXES = [
  { key: 'food', question: 'What do you eat?', allowedValues: ['veg', 'non_veg', 'eggetarian', 'jain'], sortOrder: 1 },
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
  // Women only and Men only stay inactive until F-13 decides PC-30.
  { key: 'women_only', label: 'Women only', sortOrder: 4, active: false },
  { key: 'men_only', label: 'Men only', sortOrder: 5, active: false },
  { key: 'tidy_flatmates', label: 'Tidy flatmates', sortOrder: 6, active: true },
  { key: 'couple_friendly', label: 'Couple friendly', sortOrder: 7, active: true },
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
}
