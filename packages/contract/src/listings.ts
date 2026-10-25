import { z } from 'zod'

/* The values of the listing flow (flow 04 of the designs). The database enums use the same lists. */
export const listingKinds = ['room_in_flat', 'owner_flat', 'pg', 'broker_flat'] as const
export const listingStatuses = ['draft', 'live', 'inactive', 'filled'] as const
export const placeTypes = ['1rk', '1bhk', '2bhk', '3bhk', '4bhk', 'studio', 'independent_house', 'bungalow_villa', 'penthouse'] as const
export const furnishings = ['fully', 'semi', 'unfurnished'] as const
export const listingRoomTypes = ['private', 'shared'] as const
export const bathrooms = ['attached', 'shared'] as const
export const meals = ['veg_included', 'veg_non_veg', 'breakfast_only', 'none'] as const
export const curfews = ['none', '10pm', '10_30pm', '11pm', 'midnight'] as const
export const electricityRules = ['included', 'as_per_meter', 'split_equally'] as const
export const minStays = ['3_months', '6_months', '12_months', 'flexible'] as const
export const guestsRules = ['none', 'welcome', 'day_visits'] as const
export const walkTimes = ['5_min', '10_min', '15_min', '30_min', 'not_close'] as const
export const bedsFree = ['1', '2', '3', '4', '5', '5_plus'] as const
export const whoCanMoveIn = ['men', 'women', 'any'] as const
/** The answers of the lifestyle question "What do you eat?" (PD15). */
export const foodAnswers = ['veg', 'non_veg', 'eggetarian', 'jain'] as const

/* The keys of the pick-many fields (ADR-0017). */
export const sharingTypes = ['single', 'double', 'triple', 'four', 'four_plus'] as const
export const insideItems = [
  'bed', 'mattress', 'wardrobe', 'study_table', 'chair', 'sofa', 'dining_table', 'tv', 'fridge', 'washing_machine',
  'microwave', 'ac', 'geyser', 'water_purifier', 'gas_stove', 'curtains', 'fans_and_lights', 'modular_kitchen', 'inverter',
] as const
export const amenities = [
  'lift', 'cctv', 'security_24x7', 'power_backup', 'gym', 'swimming_pool', 'clubhouse', 'garden', 'water_24x7',
  'piped_gas', 'intercom', 'wifi', 'housekeeping', 'maid', 'cook', 'laundry', 'car_parking', 'rooftop_terrace',
] as const
export const welcomeGroups = ['students', 'working_professionals', 'couples', 'families', 'bachelors'] as const
const roomWelcomeGroups = ['students', 'working_professionals'] as const

export const listingKind = z.enum(listingKinds)
export type ListingKind = z.infer<typeof listingKind>

/** The photo types that an upload accepts, and the extension of each in the key. */
export const photoTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const
const photoType = z.enum(Object.keys(photoTypes) as [keyof typeof photoTypes, ...(keyof typeof photoTypes)[]])
/** listings/<listing id>/<photo id>.<extension>. The API also checks the listing id. */
export const photoKey = z.string().regex(
  new RegExp(String.raw`^listings/[0-9a-f-]{36}/[0-9a-f-]{36}\.(${Object.values(photoTypes).join('|')})$`),
)

const pickMany = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.array(z.enum(keys)).refine((list) => new Set(list).size === list.length, 'Each key once')
const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable()
const rupees = z.int().min(0).max(100_000_000)

export const listingRate = z.strictObject({ rent: rupees, deposit: rupees.nullable().default(null) })
export const pgRate = listingRate.extend({ sharing: z.enum(sharingTypes) })
export const listingFlatmate = z.strictObject({
  name: z.string().trim().min(1).max(60),
  age: z.int().min(18).max(99).nullable().default(null),
  whatTheyDo: optionalText(80).default(null),
  food: z.enum(foodAnswers).nullable().default(null),
  photoKey: photoKey.nullable().default(null),
})

const commonFields = {
  areaSlug: z.string().min(1).max(60).nullable(),
  address: optionalText(200),
  shareAddress: z.boolean(),
  building: optionalText(120),
  street: optionalText(120),
  landmark: optionalText(120),
  pincode: z.string().regex(/^\d{6}$/).nullable(),
  nearestStation: optionalText(120),
  walkStation: z.enum(walkTimes).nullable(),
  walkBus: z.enum(walkTimes).nullable(),
  walkMarket: z.enum(walkTimes).nullable(),
  walkGym: z.enum(walkTimes).nullable(),
  walkMall: z.enum(walkTimes).nullable(),
  bathroom: z.enum(bathrooms).nullable(),
  balcony: z.boolean().nullable(),
  insideItems: pickMany(insideItems),
  amenities: pickMany(amenities),
  maintenanceIncluded: z.boolean().nullable(),
  electricity: z.enum(electricityRules).nullable(),
  rentNegotiable: z.boolean().nullable(),
  minStay: z.enum(minStays).nullable(),
  vegOnlyKitchen: z.boolean().nullable(),
  smokingAllowed: z.boolean().nullable(),
  alcoholAllowed: z.boolean().nullable(),
  guests: z.enum(guestsRules).nullable(),
  whoCanMoveIn: z.enum(whoCanMoveIn).nullable(),
  photoKeys: z.array(photoKey).max(5),
  description: optionalText(2000),
}
const flatFields = {
  placeType: z.enum(placeTypes).nullable(),
  furnishing: z.enum(furnishings).nullable(),
  roomType: z.enum(listingRoomTypes).nullable(),
  floor: z.int().min(-3).max(200).nullable(),
  carpetAreaSqft: z.int().min(1).max(100_000).nullable(),
  maintenance: rupees.nullable(),
  availableFrom: z.iso.date().nullable(),
}
const pgFields = {
  pgName: optionalText(80),
  sharing: pickMany(sharingTypes),
  bedsFree: z.enum(bedsFree).nullable(),
  meals: z.enum(meals).nullable(),
  curfew: z.enum(curfews).nullable(),
}
const brokerage = rupees.nullable()
const roomFields = {
  flatmates: z.array(listingFlatmate).max(8),
  flatmatesConsent: z.boolean(),
}
const nonPgRates = z.array(listingRate).max(1)

/** The fields that each kind accepts. A field of a different kind is a 400 (T-41). */
export const listingEdits = {
  room_in_flat: z.strictObject({
    ...commonFields, ...flatFields, ...roomFields, whoIsWelcome: pickMany(roomWelcomeGroups), rates: nonPgRates,
  }).partial(),
  owner_flat: z.strictObject({ ...commonFields, ...flatFields, whoIsWelcome: pickMany(welcomeGroups), rates: nonPgRates }).partial(),
  pg: z.strictObject({
    ...commonFields, ...pgFields,
    whoIsWelcome: pickMany(welcomeGroups),
    rates: z.array(pgRate).max(sharingTypes.length)
      .refine((rates) => new Set(rates.map((r) => r.sharing)).size === rates.length, 'One rent for each sharing type'),
  }).partial(),
  broker_flat: z.strictObject({
    ...commonFields, ...flatFields, brokerage, whoIsWelcome: pickMany(welcomeGroups), rates: nonPgRates,
  }).partial(),
}

/** OpenAPI only: all fields of all kinds. The route also runs the stricter listingEdits. */
export const listingEditBody = z.strictObject({
  ...commonFields, ...flatFields, ...pgFields, ...roomFields, brokerage,
  whoIsWelcome: pickMany(welcomeGroups),
  rates: z.array(pgRate.partial({ sharing: true })),
}).partial()
export type ListingEdit = z.infer<typeof listingEditBody>

export const createListingBody = z.strictObject({ kind: listingKind })
export const listingStatusBody = z.strictObject({ status: z.enum(['live', 'inactive', 'filled']) })
/** Upload with these two values as the content-type and content-length headers. The link signs them. */
export const uploadUrlBody = z.strictObject({ contentType: photoType, size: z.int().min(1).max(10 * 1024 * 1024) })
export const uploadUrlResponse = z.object({ key: photoKey, url: z.url(), expiresAt: z.iso.datetime() })

export const listingResponse = z.object({
  id: z.uuid(),
  kind: listingKind,
  status: z.enum(listingStatuses),
  ...commonFields, ...flatFields, ...pgFields, brokerage,
  whoIsWelcome: pickMany(welcomeGroups),
  flatmatesConsent: z.boolean(),
  photos: z.array(z.object({ key: photoKey, url: z.url() })),
  rates: z.array(z.object({ sharing: z.enum(sharingTypes).nullable(), rent: rupees, deposit: rupees.nullable() })),
  flatmates: z.array(z.object({ ...listingFlatmate.shape, photoUrl: z.url().nullable() })),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).omit({ photoKeys: true })
export type ListingResponse = z.infer<typeof listingResponse>
export const myListingsResponse = z.object({ listings: z.array(listingResponse) })

/** What a listing needs to go live (T-41). */
export const goLiveFields = ['areaSlug', 'pgName', 'brokerage', 'rates', 'flatmatesConsent'] as const
/** 422 when a listing cannot go live. */
export const incompleteListingResponse = z.object({ error: z.literal('incomplete'), missing: z.array(z.enum(goLiveFields)) })
export const errorResponse = z.object({ error: z.string() })
