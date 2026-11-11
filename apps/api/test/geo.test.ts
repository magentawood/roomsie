import { describe, expect, it } from 'vitest'
import { asksDistance, km, listingSpot, looksLikeQuestion, placesIn, tripBetween } from '../src/geo/geo'

describe('the places and the trips of Mumbai (the founders, 2026-11-11)', () => {
  it('finds the places that a question names, the longer name first, in the order of the text', () => {
    expect(placesIn('how far is this listing from mithibai college?').map((p) => p.name)).toEqual(['Mithibai College'])
    expect(placesIn('distance between Andheri West and Powai').map((p) => p.name)).toEqual(['Andheri West', 'Powai'])
    expect(placesIn('kitna door hai BKC se?').map((p) => p.name)).toEqual(['Bandra Kurla Complex'])
    expect(placesIn('does it allow pets?')).toEqual([])
  })

  it('knows a question about a distance, in English, Hinglish and Devanagari, and a question with no label', () => {
    expect(['how far is it from IIT Bombay', 'commute to BKC', 'college se kitna door hai', 'कॉलेज से कितनी दूर है'].map(asksDistance)).toEqual([true, true, true, true])
    expect(asksDistance('does it allow pets?')).toBe(false)
    expect(['is there a gym near Powai', 'kya yahan parking hai', 'gym nearby?'].map(looksLikeQuestion)).toEqual([true, true, true])
    expect(looksLikeQuestion('2 bhk in bandra under 50k')).toBe(false)
  })

  it('measures a trip: the straight line, the road, and the fastest train on real lines with real stops', () => {
    const mithibai = placesIn('mithibai')[0]!
    const trip = tripBetween(listingSpot('This place', 'Kanjurmarg', null)!, mithibai)
    expect(trip.straightKm).toBeGreaterThan(9)
    expect(trip.straightKm).toBeLessThan(11)
    expect(trip.road.km).toBeCloseTo(trip.straightKm * 1.4, 0)
    expect(trip.train!.legs[0]).toMatchObject({ line: 'Central line', from: 'Kanjurmarg', to: 'Ghatkopar', stops: 2 })
    expect(trip.train!.path[0]).toEqual([trip.from.lat, trip.from.lng])
    // A short trip needs no train.
    expect(tripBetween(listingSpot('This place', 'Andheri', null)!, mithibai).train).toBeNull()
  })

  it('places a listing at its station when the name is a station, else at its area', () => {
    const atStation = listingSpot('This place', 'Bandra', 'powai')!
    const atArea = listingSpot('This place', 'Behind the big mall', 'powai')!
    expect(km(atStation, placesIn('Bandra')[0]!)).toBeLessThan(1.5)
    expect(km(atArea, placesIn('Powai')[0]!)).toBeLessThan(1)
    expect(listingSpot('This place', null, null)).toBeNull()
  })
})
