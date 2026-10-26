import { z } from 'zod'
import { optionalText, photoKeyIn, rupees, uploadUrlReply } from './shared'

/* The Form A fields of PD15. The database enums use the same lists. */
export const intents = ['room', 'pg', 'whole_flat', 'flatmates', 'unclear'] as const
/** Private or shared room. Only the chat fills it (PD15), so the profile form has no room type. */
export const roomTypes = ['private', 'shared', 'unclear'] as const
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
/** The fields that a card needs to go live, other than the name and the age, which a profile always has (PD16). */
export const liveCardFields = ['whosMoving', 'areas', 'budget'] as const
export const visibilities = ['draft', 'live', 'hidden'] as const

const text = (max: number) => z.string().trim().min(1).max(max)
const age = z.int().min(18).max(99)
const answer = <A extends LifestyleAxis>(axis: A) => z.enum(lifestyleAnswers[axis])
const answers = {
  food: answer('food'), smoking: answer('smoking'), drinks: answer('drinks'), guests: answer('guests'),
  your_days: answer('your_days'), sleep: answer('sleep'), tidiness: answer('tidiness'), pets: answer('pets'),
}
const lifestyle = z.strictObject(answers).partial()
type NullableAnswers = { [A in LifestyleAxis]: z.ZodNullable<(typeof answers)[A]> }
const lifestyleEdit = z.strictObject(Object.fromEntries(Object.entries(answers).map(([axis, s]) => [axis, s.nullable()])) as NullableAnswers).partial()
const weight = z.enum(mustHaveWeights)
const mustHaves = z.partialRecord(z.enum(mustHaveKeys), weight)
export const profilePhotoKey = photoKeyIn('profiles')

export const createProfileBody = z.strictObject({ fullName: text(profileTextLimits.fullName), age, gender: z.enum(genders) })
export type CreateProfileBody = z.infer<typeof createProfileBody>

/** null clears a field. In `lifestyle` and `mustHaves`, null clears one answer. */
export const profileEditBody = z.strictObject({
  ...createProfileBody.shape,
  jobRole: optionalText(profileTextLimits.jobRole),
  commuteAddress: optionalText(profileTextLimits.commuteAddress),
  bio: optionalText(profileTextLimits.bio),
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
  mustHaves: z.partialRecord(z.enum(mustHaveKeys), weight.nullable()),
}).partial()
export type ProfileEditBody = z.infer<typeof profileEditBody>

const photo = z.object({ key: profilePhotoKey, url: z.url() })
/** What other users see on a card. */
export const cardResponse = z.object({
  id: z.uuid(),
  ...profileEditBody.required().omit({ gender: true, photoKeys: true, hidden: true, lifestyle: true, mustHaves: true }).shape,
  age: age.nullable(),
  photos: z.array(photo),
  lifestyle,
  mustHaves,
})
export type CardResponse = z.infer<typeof cardResponse>

export const profileResponse = cardResponse.extend({
  gender: z.enum(genders),
  visibility: z.enum(visibilities),
  /** The fields that the card needs before it goes live. */
  missing: z.array(z.enum(liveCardFields)),
})
export type ProfileResponse = z.infer<typeof profileResponse>
export const profileUploadUrlResponse = uploadUrlReply(profilePhotoKey)

/** Null when the lister has no profile, or a parent manages it. */
export const listerResponse = z.object({ name: z.string(), photoUrl: z.url().nullable() }).nullable()
