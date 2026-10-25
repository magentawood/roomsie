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

const pickMany = <T extends readonly [string, ...string[]]>(keys: T) =>
  z.array(z.enum(keys)).refine((list) => new Set(list).size === list.length, 'Each key once')
const text = (max: number) => z.string().trim().min(1).max(max).nullable()
const rupees = z.int().min(0).max(100_000_000)

const nonPgRates = z.array(z.strictObject({ rent: rupees, deposit: rupees.nullable().default(null) })).max(1)
const pgRates = z.array(z.strictObject({ sharing: z.enum(sharingTypes), rent: rupees, deposit: rupees.nullable().default(null) }))
  .max(sharingTypes.length)
  .refine((rates) => new Set(rates.map((r) => r.sharing)).size === rates.length, 'One rent for each sharing type')
const flatmate = z.strictObject({
  name: z.string().trim().min(1).max(60),
  age: z.int().min(18).max(99).nullable().default(null),
  whatTheyDo: text(80).default(null),
  food: z.enum(foodAnswers).nullable().default(null),
  photoKey: z.string().nullable().default(null),
})

const commonFields = {
  areaSlug: z.string().min(1).max(60).nullable(),
  address: text(200),
  shareAddress: z.boolean(),
  building: text(120),
  street: text(120),
  landmark: text(120),
  pincode: z.string().regex(/^\d{6}$/).nullable(),
  nearestStation: text(120),
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
  photoKeys: z.array(z.string()).max(5),
  description: text(2000),
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

/** The fields that each kind accepts. A field of a different kind is a 400 (T-41). */
export const listingEdits = {
  room_in_flat: z.strictObject({
    ...commonFields, ...flatFields,
    whoIsWelcome: pickMany(roomWelcomeGroups),
    rates: nonPgRates,
    flatmates: z.array(flatmate).max(8),
    flatmatesConsent: z.boolean(),
  }).partial(),
  owner_flat: z.strictObject({ ...commonFields, ...flatFields, whoIsWelcome: pickMany(welcomeGroups), rates: nonPgRates }).partial(),
  pg: z.strictObject({
    ...commonFields,
    pgName: text(80),
    sharing: pickMany(sharingTypes),
    bedsFree: z.enum(bedsFree).nullable(),
    meals: z.enum(meals).nullable(),
    curfew: z.enum(curfews).nullable(),
    whoIsWelcome: pickMany(welcomeGroups),
    rates: pgRates,
  }).partial(),
  broker_flat: z.strictObject({
    ...commonFields, ...flatFields,
    whoIsWelcome: pickMany(welcomeGroups),
    rates: nonPgRates,
    brokerage: rupees.nullable(),
  }).partial(),
}
/** All fields of all kinds. The route documents it; listingEdits checks the kind of the listing. */
export const listingEditBody = z.strictObject({
  ...commonFields, ...flatFields,
  pgName: text(80),
  sharing: pickMany(sharingTypes),
  bedsFree: z.enum(bedsFree).nullable(),
  meals: z.enum(meals).nullable(),
  curfew: z.enum(curfews).nullable(),
  brokerage: rupees.nullable(),
  whoIsWelcome: pickMany(welcomeGroups),
  rates: z.array(z.strictObject({ sharing: z.enum(sharingTypes).optional(), rent: rupees, deposit: rupees.nullable().default(null) })),
  flatmates: z.array(flatmate).max(8),
  flatmatesConsent: z.boolean(),
}).partial()
export type ListingEdit = z.infer<typeof listingEditBody>

export const createListingBody = z.strictObject({ kind: listingKind })
export const listingStatusBody = z.strictObject({ status: z.enum(['live', 'inactive', 'filled']) })
export const uploadUrlBody = z.strictObject({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  size: z.int().min(1).max(10 * 1024 * 1024),
})
export const uploadUrlResponse = z.object({
  key: z.string(),
  url: z.url(),
  expiresAt: z.iso.datetime(),
  /** Send these headers with the upload. The link signs them. */
  headers: z.object({ 'content-type': z.string(), 'content-length': z.string() }),
})

export const listingResponse = z.object({
  id: z.uuid(),
  kind: listingKind,
  status: z.enum(listingStatuses),
  pgName: z.string().nullable(),
  areaSlug: z.string().nullable(),
  /** Only the lister sees it, unless shareAddress is on. */
  address: z.string().nullable(),
  shareAddress: z.boolean(),
  building: z.string().nullable(),
  street: z.string().nullable(),
  landmark: z.string().nullable(),
  pincode: z.string().nullable(),
  nearestStation: z.string().nullable(),
  walkStation: z.enum(walkTimes).nullable(),
  walkBus: z.enum(walkTimes).nullable(),
  walkMarket: z.enum(walkTimes).nullable(),
  walkGym: z.enum(walkTimes).nullable(),
  walkMall: z.enum(walkTimes).nullable(),
  placeType: z.enum(placeTypes).nullable(),
  furnishing: z.enum(furnishings).nullable(),
  roomType: z.enum(listingRoomTypes).nullable(),
  floor: z.int().nullable(),
  carpetAreaSqft: z.int().nullable(),
  sharing: z.array(z.enum(sharingTypes)),
  bedsFree: z.enum(bedsFree).nullable(),
  meals: z.enum(meals).nullable(),
  curfew: z.enum(curfews).nullable(),
  bathroom: z.enum(bathrooms).nullable(),
  balcony: z.boolean().nullable(),
  insideItems: z.array(z.enum(insideItems)),
  amenities: z.array(z.enum(amenities)),
  maintenance: z.int().nullable(),
  maintenanceIncluded: z.boolean().nullable(),
  electricity: z.enum(electricityRules).nullable(),
  rentNegotiable: z.boolean().nullable(),
  brokerage: z.int().nullable(),
  availableFrom: z.iso.date().nullable(),
  minStay: z.enum(minStays).nullable(),
  vegOnlyKitchen: z.boolean().nullable(),
  smokingAllowed: z.boolean().nullable(),
  alcoholAllowed: z.boolean().nullable(),
  guests: z.enum(guestsRules).nullable(),
  whoCanMoveIn: z.enum(whoCanMoveIn).nullable(),
  whoIsWelcome: z.array(z.enum(welcomeGroups)),
  flatmatesConsent: z.boolean(),
  description: z.string().nullable(),
  photos: z.array(z.object({ key: z.string(), url: z.url() })),
  rates: z.array(z.object({ sharing: z.enum(sharingTypes).nullable(), rent: z.int(), deposit: z.int().nullable() })),
  flatmates: z.array(z.object({
    name: z.string(),
    age: z.int().nullable(),
    whatTheyDo: z.string().nullable(),
    food: z.enum(foodAnswers).nullable(),
    photoKey: z.string().nullable(),
    photoUrl: z.url().nullable(),
  })),
  expiresAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
export type ListingResponse = z.infer<typeof listingResponse>
export const myListingsResponse = z.object({ listings: z.array(listingResponse) })

/** 422 when a listing cannot go live. */
export const incompleteListingResponse = z.object({ error: z.literal('incomplete'), missing: z.array(z.string()) })
