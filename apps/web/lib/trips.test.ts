import { describe, expect, it } from 'vitest'
import type { Trip } from '@roomsie/contract'
import { tripLine } from './trips'

const spot = (name: string) => ({ name, lat: 19.1, lng: 72.9 })
const trip = (straightKm: number, train: Trip['train']): Trip => ({ option: null, from: spot('This place'), to: spot('Mithibai College'), straightKm, road: { km: straightKm * 1.4, minutes: [35, 55] }, train })

describe('the line under the map of a trip', () => {
  it('says how far, the straight line, the road and the train', () => {
    const train = { legs: [{ line: 'Central line', from: 'Kanjurmarg', to: 'Ghatkopar', stops: 2 }], minutes: 43, path: [[19.1, 72.9], [19.08, 72.9]] as [number, number][] }
    expect(tripLine(trip(9.9, train))).toBe('Far · 9.9 km away · by road 35–55 min · by train about 43 min')
    expect(tripLine(trip(2.3, null))).toBe('Near · 2.3 km away · by road 35–55 min')
  })
})
