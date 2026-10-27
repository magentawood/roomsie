/** Form A catalogues of PD15; the values are the answer keys of the designs. */
import { sql } from 'drizzle-orm'
import { lifestyleAnswers, mustHaveKeys, type LifestyleAxis } from '@roomsie/contract'
import type { Db } from './client'
import { lifestyleAxes, mustHaves } from './schema'
import { seedAreas } from './seed-areas'

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
  await seedAreas(db)
}
