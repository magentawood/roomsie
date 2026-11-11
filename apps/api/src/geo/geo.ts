import type { Trip } from '@roomsie/contract'
import data from './mumbai.json'

/**
 * The places, stations and lines of Mumbai (`mumbai.json`, from Wikidata by tools/build-geo.py), and the trips between two points.
 * Code measures each number, so a reply says real distances and real lines (the founders, 2026-11-11).
 */
export type Spot = { name: string; lat: number; lng: number }
type Station = Spot & { id: string }

const stations: Station[] = data.stations
const byId = new Map(stations.map((s) => [s.id, s]))

/** Minutes for each stop: a slow local train, a metro, the monorail. A change adds a walk and a wait. */
const stopMinutes = { rail: 2.8, metro: 2, monorail: 3 } as const
const waitMinutes = 5
/** Two stations this close are one change, on foot. */
const changeMetres = 600
/** A walk at the ends of a trip: further than this, the person takes an auto. */
const walkMetres = 1500
/** Roads in Mumbai are about 1.4 times the straight line, at 15 to 25 km/h. */
const roadFactor = 1.4

export function km(a: Spot, b: Spot) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

type Edge = { to: string; minutes: number; line: string | null }
const graph = new Map<string, Edge[]>()
const link = (a: string, b: string, minutes: number, line: string | null) => {
  graph.set(a, [...(graph.get(a) ?? []), { to: b, minutes, line }])
  graph.set(b, [...(graph.get(b) ?? []), { to: a, minutes, line }])
}
for (const line of data.lines) for (const [a, b] of line.edges) link(a!, b!, stopMinutes[line.mode as keyof typeof stopMinutes], line.name)
for (const [i, a] of stations.entries()) {
  for (const b of stations.slice(i + 1)) {
    const metres = km(a, b) * 1000
    if (metres <= changeMetres) link(a.id, b.id, waitMinutes + (metres * 1.3) / 80, null)
  }
}

/** Minutes to reach a station from a point: on foot when it is close, else by auto. */
const accessMinutes = (metres: number) => (metres <= walkMetres ? (metres * 1.3) / 80 : 3 + (metres * roadFactor) / 1000 / 20 * 60)

/** The fastest way by train or metro, with the stations near each end. Null: no station near, or the road is as fast. */
function trainBetween(from: Spot, to: Spot): Trip['train'] {
  const near = (spot: Spot) => stations.map((s) => ({ s, metres: km(spot, s) * 1000 })).filter(({ metres }) => metres <= 3000).sort((a, b) => a.metres - b.metres).slice(0, 4)
  const starts = near(from)
  const ends = new Map(near(to).map(({ s, metres }) => [s.id, metres]))
  if (!starts.length || !ends.size) return null
  // Dijkstra from each start at once: the cost of a start is its access.
  const cost = new Map<string, number>()
  const back = new Map<string, { from: string; line: string | null }>()
  const open = new Set<string>()
  for (const { s, metres } of starts) { cost.set(s.id, accessMinutes(metres) + waitMinutes); open.add(s.id) }
  let best: { id: string; total: number } | null = null
  while (open.size) {
    const id = [...open].reduce((a, b) => (cost.get(a)! <= cost.get(b)! ? a : b))
    open.delete(id)
    const here = cost.get(id)!
    if (best && here >= best.total) break
    const end = ends.get(id)
    if (end !== undefined && (!best || here + accessMinutes(end) < best.total)) best = { id, total: here + accessMinutes(end) }
    for (const edge of graph.get(id) ?? []) {
      const next = here + edge.minutes
      if (next < (cost.get(edge.to) ?? Infinity)) { cost.set(edge.to, next); back.set(edge.to, { from: id, line: edge.line }); open.add(edge.to) }
    }
  }
  if (!best) return null
  const steps: { id: string; line: string | null }[] = []
  for (let id: string | undefined = best.id; id; id = back.get(id)?.from) steps.unshift({ id, line: back.get(id)?.line ?? null })
  // The rides: the stations of one line in a row. A change on foot is no ride.
  const legs: NonNullable<Trip['train']>['legs'] = []
  for (const [i, step] of steps.entries()) {
    if (!i || !step.line) continue
    const last = legs.at(-1)
    const prev = byId.get(steps[i - 1]!.id)!.name
    if (last && last.line === step.line && last.to === prev) Object.assign(last, { to: byId.get(step.id)!.name, stops: last.stops + 1 })
    else legs.push({ line: step.line, from: prev, to: byId.get(step.id)!.name, stops: 1 })
  }
  if (!legs.length) return null
  const path: [number, number][] = [[from.lat, from.lng], ...steps.map(({ id }) => [byId.get(id)!.lat, byId.get(id)!.lng] as [number, number]), [to.lat, to.lng]]
  return { legs, minutes: Math.round(best.total), path }
}

const round5 = (n: number) => Math.max(5, Math.round(n / 5) * 5)

/** A trip between two points: the straight line, the road, and the train when it helps. */
export function tripBetween(from: Spot, to: Spot, option: number | null = null): Trip {
  const straight = km(from, to)
  const roadKm = straight * roadFactor
  const road = { km: Math.round(roadKm * 10) / 10, minutes: [round5((roadKm / 25) * 60), round5((roadKm / 15) * 60)] as [number, number] }
  const train = straight < 2 ? null : trainBetween(from, to)
  // A train that is slower than the slow road is no help.
  return { option, from, to, straightKm: Math.round(straight * 10) / 10, road, train: train && train.minutes <= road.minutes[1] ? train : null }
}

const plain = (text: string) => ` ${text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim()} `

type Named = Spot & { names: string[] }
/** The named points, most precise first: places, then stations, then the areas of the catalogue. */
const named: Named[] = [
  ...data.places.map((p) => ({ name: p.name, lat: p.lat, lng: p.lng, names: [p.name, ...p.aliases] })),
  ...stations.map((s) => ({ name: s.name, lat: s.lat, lng: s.lng, names: [s.name] })),
  ...Object.values(data.areas).map((a) => ({ name: a.name, lat: a.lat, lng: a.lng, names: [a.name, ...a.aliases] })),
].map((p) => ({ ...p, names: p.names.map(plain).filter((n) => n.trim().length >= 3) }))

/** The places that a question names, in the order of the text. A longer name wins over a name inside it, as "Andheri West" over "Andheri". */
export function placesIn(text: string): Spot[] {
  const words = plain(text)
  const hits: { at: number; end: number; spot: Spot }[] = []
  for (const p of named) {
    for (const name of p.names) {
      const at = words.indexOf(name)
      if (at >= 0) hits.push({ at, end: at + name.length, spot: { name: p.name, lat: p.lat, lng: p.lng } })
    }
  }
  const kept: typeof hits = []
  for (const hit of hits.sort((a, b) => b.end - b.at - (a.end - a.at))) {
    if (!kept.some((k) => hit.at < k.end && k.at < hit.end)) kept.push(hit)
  }
  return kept.sort((a, b) => a.at - b.at).map((k) => k.spot)
}

/** The point of a listing: its station when the name is a known station, else its area. */
export function listingSpot(name: string, nearestStation: string | null, areaSlug: string | null): Spot | null {
  const station = nearestStation && stations.find((s) => plain(s.name) === plain(nearestStation))
  if (station) return { name, lat: station.lat, lng: station.lng }
  const area = areaSlug ? (data.areas as Record<string, Spot | undefined>)[areaSlug] : undefined
  return area ? { name, lat: area.lat, lng: area.lng } : null
}

/** A question about a distance, a commute or a route, in English, Hinglish, Marathi or Devanagari. */
export const asksDistance = (text: string) =>
  /\b(how far|far from|distance|km|kms|close to|closer|closest|near(est)?|commute|travel|reach|route|how long|how much time|minutes|get to|go to|door|kitna door|kitni door|paas|nazdeek|kitni der|kitna time|pahunch|javal|jawal|kiti vel|lamb)\b/i.test(text)
  || /दूर|पास|नज़दीक|नजदीक|कितना समय|कितनी देर|पहुँच|पहुंच|जवळ|किती वेळ|लांब/.test(text)

/** A message that reads as a question, for a turn that the router cannot label. */
export const looksLikeQuestion = (text: string) => /\?\s*$/.test(text.trim())
  || /^(what|how|where|which|who|when|why|is|are|can|could|does|do|did|should|will|would|kya|kaise|kahan|kaun|kitna|kitni|kitne|kab|kyun|kyon|kay|kasa|kuthe|kon|kiti|kevha)\b/i.test(text.trim())
  || /^(क्या|कैसे|कहाँ|कौन|कितना|कितनी|कब|क्यों|काय|कसे|कुठे|कोण|किती|केव्हा)/.test(text.trim())
