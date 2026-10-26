import { z } from 'zod'

/* The Form A fields of PD15 that a profile holds. The database enums use the same lists. A value from the profile form is "stated"; T-08 adds the sources of the chat. */
export const intents = ['room', 'pg', 'whole_flat', 'flatmates', 'unclear'] as const
export const whosMovingAnswers = ['student', 'first_job', 'working', 'couple', 'family', 'friends', 'unclear'] as const
/** The answers of a parent about a son or daughter (PD15, PD16). */
export const childTypes = ['student', 'first_job', 'working'] as const
export const genders = ['male', 'female', 'non_binary'] as const
/** The answers of the lifestyle question "What do you eat?" (PD15). */
export const foodAnswers = ['veg', 'non_veg', 'eggetarian', 'jain'] as const
export const lifestyleAnswers = {
  food: foodAnswers,
  smoking: ['non_smoker', 'smoker', 'smoke_outside'],
  drinks: ['none_at_home', 'fine_at_home'],
  guests: ['weekends_only', 'guests_welcome', 'guests_rarely'],
  your_days: ['out_most_days', 'home_most_days', 'night_shifts', 'student'],
  sleep: ['night_owl', 'early_bird'],
  tidiness: ['very_tidy', 'tidy_enough', 'relaxed_about_mess'],
  pets: ['no_pets', 'fine_with_pets'],
} as const
export type LifestyleAxis = keyof typeof lifestyleAnswers
export const mustHaveKeys = ['veg_kitchen', 'non_smokers', 'no_alcohol', 'women_only', 'men_only', 'tidy_flatmates', 'couple_friendly'] as const
export const mustHaveWeights = ['prefer', 'dealbreaker'] as const
export const maxProfilePhotos = 4
export const profileTextLimits = { fullName: 80, jobRole: 80, commuteAddress: 200, bio: 1000 } as const
/** The fields that a card needs to go live, other than the name (PD16). */
export const cardFields = ['age', 'whosMoving', 'areas', 'budget'] as const

const text = (max: number) => z.string().trim().min(1).max(max)
const rupees = z.int().min(0).max(100_000_000)
const age = z.int().min(18).max(99)
const answer = <A extends LifestyleAxis>(axis: A) => z.enum(lifestyleAnswers[axis])
const lifestyle = z.strictObject({
  food: answer('food'), smoking: answer('smoking'), drinks: answer('drinks'), guests: answer('guests'),
  your_days: answer('your_days'), sleep: answer('sleep'), tidiness: answer('tidiness'), pets: answer('pets'),
}).partial()
const lifestyleEdit = z.strictObject({
  food: answer('food').nullable(), smoking: answer('smoking').nullable(), drinks: answer('drinks').nullable(), guests: answer('guests').nullable(),
  your_days: answer('your_days').nullable(), sleep: answer('sleep').nullable(), tidiness: answer('tidiness').nullable(), pets: answer('pets').nullable(),
}).partial()
const mustHaves = z.partialRecord(z.enum(mustHaveKeys), z.enum(mustHaveWeights))
/** profiles/<profile id>/<photo id>.<extension>. The API also checks the profile id. */
export const profilePhotoKey = z.string().regex(/^profiles\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/)

export const createProfileBody = z.strictObject({ fullName: text(profileTextLimits.fullName), age, gender: z.enum(genders) })
export type CreateProfileBody = z.infer<typeof createProfileBody>

/** null clears a field. In `lifestyle` and `mustHaves`, null clears one answer. */
export const profileEditBody = z.strictObject({
  fullName: text(profileTextLimits.fullName),
  age,
  gender: z.enum(genders),
  jobRole: text(profileTextLimits.jobRole).nullable(),
  commuteAddress: text(profileTextLimits.commuteAddress).nullable(),
  bio: text(profileTextLimits.bio).nullable(),
  managedByParent: z.boolean(),
  intent: z.enum(intents),
  whosMoving: z.enum(whosMovingAnswers),
  areas: z.array(z.string().min(1).max(60)).max(9).refine((a) => new Set(a).size === a.length, 'Each area once'),
  budgetMin: rupees.nullable(),
  budgetMax: rupees.nullable(),
  moveDate: z.iso.date().nullable(),
  photoKeys: z.array(profilePhotoKey).max(maxProfilePhotos),
  /** The "Hide my card" switch (PD16). */
  hidden: z.boolean(),
  lifestyle: lifestyleEdit,
  mustHaves: z.partialRecord(z.enum(mustHaveKeys), z.enum(mustHaveWeights).nullable()),
}).partial()
export type ProfileEditBody = z.infer<typeof profileEditBody>

const photo = z.object({ key: profilePhotoKey, url: z.url() })
/** What other users see on a card. */
export const cardResponse = z.object({
  id: z.uuid(),
  fullName: z.string(),
  age: age.nullable(),
  jobRole: z.string().nullable(),
  commuteAddress: z.string().nullable(),
  bio: z.string().nullable(),
  managedByParent: z.boolean(),
  intent: z.enum(intents),
  whosMoving: z.enum(whosMovingAnswers),
  areas: z.array(z.string()),
  budgetMin: rupees.nullable(),
  budgetMax: rupees.nullable(),
  moveDate: z.iso.date().nullable(),
  photos: z.array(photo),
  lifestyle,
  mustHaves,
})
export type CardResponse = z.infer<typeof cardResponse>

/** The own profile: the card, the gender, and if the card is live. */
export const profileResponse = cardResponse.extend({
  gender: z.enum(genders),
  visibility: z.enum(['draft', 'live', 'hidden']),
  /** The fields that the card needs before it goes live. */
  missing: z.array(z.enum(cardFields)),
})
export type ProfileResponse = z.infer<typeof profileResponse>
export const profileUploadUrlResponse = z.object({ key: profilePhotoKey, url: z.url(), expiresAt: z.iso.datetime() })

/** The lister on a listing: the name and the first photo of the profile, if the lister has one that is not a card of a son or daughter. */
export const listerResponse = z.object({ name: z.string(), photoUrl: z.url().nullable() }).nullable()
