import { describe, expect, it } from 'vitest'
import { formA, type MatchResult } from '@roomsie/contract'
import { followUps, noteLines, thousands } from './noticed'
import type { Found } from './results'

const stated = <V>(value: V) => ({ source: 'stated', value })
const names: Record<string, string> = { 'bandra-santacruz': 'Bandra–Santacruz', 'powai-vikhroli': 'Powai–Vikhroli', 'dadar-sion': 'Dadar–Sion' }
const areaName = (slug: string) => names[slug] ?? slug
const rooms = formA.parse({ intent: stated(['room']), areas: stated(['bandra-santacruz', 'powai-vikhroli']), budget: stated({ min: null, max: 5000 }) })
const people = formA.parse({ ...rooms, intent: stated(['flatmates']) })
const listing = (id: string) => ({ kind: 'listing', listing: { id, kind: 'room_in_flat', pgName: null, placeType: '2bhk', roomType: 'private' }, bestMatch: false, didntSay: [] }) as unknown as MatchResult
const found = (total: number, ids: string[] = []): Found => ({ total, results: ids.map(listing), suggested: [], noticed: [] })

describe('the notes of Roomsie Noticed (flow 02)', () => {
  it('writes the rents in thousands, as the designs do', () => {
    expect([thousands(12500), thousands(10000), thousands(35500)]).toEqual(['₹12.5k', '₹10k', '₹35.5k'])
  })

  it('words the notes of a search with results, and the tap of each button', () => {
    const lines = noteLines([
      { kind: 'mustHave', key: 'veg_kitchen', count: 6, total: 24 }, { kind: 'teamUp', count: 15 }, { kind: 'mustHave', key: 'near_station', count: 12, total: 24 },
    ], rooms, areaName)
    expect(lines).toEqual([
      { text: 'Heads up, only 6 of 24 have a veg kitchen, if that matters to you.', button: 'Show only veg kitchen', tap: { slot: 'mustHaves.veg_kitchen', value: 'dealbreaker' } },
      {
        text: '15 people looking around Bandra–Santacruz and Powai–Vikhroli want to team up. Split a 2 BHK and it can cost less than a room.',
        button: 'Show people to team up with', tap: { slot: 'intent', value: 'flatmates' },
      },
      { text: '12 are a 10-min walk or less from a metro or station.', button: 'Show only near metro', tap: { slot: 'mustHaves.near_station', value: 'dealbreaker' } },
    ])
  })

  it('words the notes of a search with no results: the next band of the cheapest, a nearby area, and a 2 BHK split two ways', () => {
    const lines = noteLines([
      { kind: 'rents', cheapest: 10000, low: 12500, high: 18000 }, { kind: 'nearbyArea', area: 'dadar-sion' }, { kind: 'share', each: 35500, maintenanceIncluded: true },
    ], rooms, areaName)
    expect(lines.map(({ text, button, tap }) => [text, button, tap])).toEqual([
      ['Rooms in shared flats in Bandra–Santacruz and Powai–Vikhroli usually go for ₹12.5k to ₹18k a month. The cheapest one right now is ₹10k.',
        'Change my budget to under ₹10k', { slot: 'budget', value: 'under_10k' }],
      ['Under ₹5k, rooms in shared flats do come up in Dadar–Sion, next to Bandra–Santacruz.', 'Show rooms in shared flats in Dadar–Sion', { slot: 'areas', value: ['dadar-sion'] }],
      ['A 2 BHK in Bandra–Santacruz split two ways works out to about ₹35.5k each, maintenance included.', 'Show people to share with', { slot: 'intent', value: 'flatmates' }],
    ])
  })

  it('gives only the cheapest rent with fewer than four places, and the top band above ₹35k', () => {
    expect(noteLines([{ kind: 'rents', cheapest: 40000, low: null, high: null }], rooms, areaName)[0]).toMatchObject({
      text: 'The cheapest one right now is ₹40k.', tap: { slot: 'budget', value: 'above_35k' },
    })
  })

  it('leads people to the 2 BHK flats of their area, so a 2 BHK split two ways has a button that does something', () => {
    expect(noteLines([{ kind: 'share', each: 21500, maintenanceIncluded: false }], people, areaName)).toEqual([{
      text: 'A 2 BHK in Bandra–Santacruz split two ways works out to about ₹21.5k each.',
      button: 'Show 2 BHK flats in Bandra–Santacruz', tap: { slot: 'intent', value: 'whole_flat' },
    }])
  })

  it('words a must-have of people as people, and leaves out a note with no words', () => {
    expect(noteLines([{ kind: 'mustHave', key: 'veg_kitchen', count: 1, total: 3 }], people, areaName)[0]!.text).toBe('Heads up, only 1 of 3 eat veg, if that matters to you.')
    expect(noteLines([{ kind: 'mustHave', key: 'women_only', count: 1, total: 3 }], people, areaName)).toEqual([])
  })
})

describe('the chips under the box', () => {
  it('compares the top three results, then adds the other kinds of place, three chips at most', () => {
    const chips = followUps(found(24, ['a', 'b', 'c', 'd']), rooms, areaName)
    expect(chips).toEqual([
      { label: 'Which one’s the best deal?', compare: { kind: 'place', ids: ['a', 'b', 'c'] } },
      { label: 'Show some PGs too', tap: { slot: 'intent', value: 'pg', also: true } },
      { label: 'Show me some flats as well', tap: { slot: 'intent', value: 'whole_flat', also: true } },
    ])
  })

  it('offers no comparison of one result, and no kind of place that the search has', () => {
    const both = formA.parse({ ...rooms, intent: stated(['room', 'pg']) })
    expect(followUps(found(1, ['a']), both, areaName).map((chip) => chip.label)).toEqual(['Show me some flats as well'])
  })

  it('offers the next budget and a different kind of place when nothing fits', () => {
    expect(followUps(found(0), rooms, areaName)).toEqual([
      { label: 'Room in Bandra–Santacruz under ₹10k', tap: { slot: 'budget', value: 'under_10k' } },
      { label: 'Show some PGs in Bandra–Santacruz instead', tap: { slot: 'intent', value: 'pg' } },
    ])
    expect(followUps(found(0), people, areaName).map((chip) => chip.label)).toEqual(['People in Bandra–Santacruz under ₹10k'])
  })
})
