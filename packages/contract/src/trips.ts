import { z } from 'zod'

/** A point of a trip: a card, a place that the person named, or a station. */
const spot = z.strictObject({ name: z.string().min(1).max(80), lat: z.number(), lng: z.number() })
/** One ride of a trip by train, metro or monorail, between two stations. */
const leg = z.strictObject({ line: z.string(), from: z.string(), to: z.string(), stops: z.int().min(1) })
export type Leg = z.infer<typeof leg>

/**
 * A trip that code measured from the stations and places of Mumbai (`apps/api/src/geo`): the reply says its numbers, and the chat
 * draws its map. `option`: the number of the card, with two cards or more. `train`: null when no train or metro helps.
 */
export const trip = z.strictObject({
  option: z.int().min(1).max(4).nullable(),
  from: spot,
  to: spot,
  straightKm: z.number().min(0),
  road: z.strictObject({ km: z.number().min(0), minutes: z.tuple([z.int(), z.int()]) }),
  train: z.strictObject({ legs: z.array(leg).min(1), minutes: z.int(), path: z.array(z.tuple([z.number(), z.number()])).min(2) }).nullable(),
})
export type Trip = z.infer<typeof trip>

/** The trips of a reply: one for each card, or one between two places. */
export const maxTrips = 4
export const trips = z.array(trip).max(maxTrips)

/** How far a trip is, in words, so that no model calls 14 km "close": by the straight line, up to 3 km, up to 8 km, then far. */
export const howFarOf = (straightKm: number) => (straightKm <= 3 ? 'near' : straightKm <= 8 ? 'not far' : 'far')
/** The rides of a trip as one sentence: "Central line from Kanjurmarg to Ghatkopar (2 stops), then Metro Line 1 …". */
export const routeOf = (legs: Leg[]) =>
  legs.map((l, i) => `${i ? 'then ' : ''}${l.line} from ${l.from} to ${l.to} (${l.stops} ${l.stops === 1 ? 'stop' : 'stops'})`).join(', ')

/** What the advisor reads of a trip: its names, its numbers and its route in words, with no points and no path. */
export const tripFacts = z.strictObject({
  option: z.int().min(1).max(4).nullable(),
  from: z.string(), to: z.string(),
  howFar: z.enum(['near', 'not far', 'far']),
  straightKm: z.number().min(0),
  road: z.strictObject({ km: z.number().min(0), minutes: z.tuple([z.int(), z.int()]) }),
  train: z.strictObject({ route: z.string(), minutes: z.int() }).nullable(),
})
export type TripFacts = z.infer<typeof tripFacts>
export const factsOfTrip = ({ option, from, to, straightKm, road, train }: Trip): TripFacts =>
  ({ option, from: from.name, to: to.name, howFar: howFarOf(straightKm), straightKm, road, train: train && { route: routeOf(train.legs), minutes: train.minutes } })

/**
 * The locator (the founders, 2026-11-11): a question about a distance names a place that the map of roomsie does not have, as
 * "MGM college", so a model names each place of the question and picks the area that holds it. Code then measures from that area.
 */
export const locatorInput = z.strictObject({ version: z.literal(1), question: z.string().min(1) })
export type LocatorInput = z.infer<typeof locatorInput>
/** Each place in the order of the question. `area`: the slug of an area of roomsie, null outside the region or when not known. Not strict, as the advisor answer. */
export const locatorAnswer = z.object({
  version: z.literal(1).default(1),
  places: z.array(z.object({ name: z.string().trim().min(1).max(60), area: z.string().nullable() })).max(3),
})
export type LocatorAnswer = z.infer<typeof locatorAnswer>
