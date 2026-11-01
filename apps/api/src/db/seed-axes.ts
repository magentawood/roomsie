/** Form A catalogues of PD15, with the answer keys of the designs, and the Form B topics. */
import { sql } from 'drizzle-orm'
import { lifestyleAnswers, mustHaveKeys, type LifestyleAxis } from '@roomsie/contract'
import type { Db } from './client'
import { lifestyleAxes, mustHaves, observationTopics } from './schema'
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

const OBSERVATION_TOPICS = [
  { key: 'guest_frequency', label: 'Guests and partners who stay over' },
  { key: 'work_pattern', label: 'Work hours and work from home' },
  { key: 'noise', label: 'Noise and quiet' },
  { key: 'cooking', label: 'Cooking and the kitchen' },
  { key: 'past_flatmates', label: 'What went wrong with past flatmates' },
  { key: 'move_reason', label: 'Why they are moving' },
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
  await db.insert(observationTopics).values(OBSERVATION_TOPICS)
    .onConflictDoUpdate({ target: observationTopics.key, set: { label: sql`excluded.label`, active: sql`excluded.active` } })
  await seedAreas(db)
}
