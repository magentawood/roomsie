'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight } from '@untitledui/icons'
import type { Trip } from '@roomsie/contract'
import { tripLine } from '../../lib/trips'

/** The light map of OpenFreeMap: free, with no key, from OpenStreetMap data. */
const mapStyle = 'https://tiles.openfreemap.org/styles/positron'

/** "Directions" opens the trip in Google Maps, which gives the times of this hour. */
const directionsHref = ({ from, to }: Trip) =>
  `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=transit`

/** A pin sits on its dot, 14 px wide, not on the middle of the dot and its name, so the line meets the dot. */
const onDot = { anchor: 'left' as const, offset: [-7, 0] as [number, number] }

/** A label on the map: a dot and its name. */
function pin(name: string, end: boolean) {
  const el = document.createElement('div')
  el.className = 'flex items-center gap-1.5'
  const dot = document.createElement('span')
  dot.className = `size-3.5 rounded-full ring-2 ring-white shadow-sm ${end ? 'bg-(--color-blue-500)' : 'bg-brand-solid'}`
  const label = document.createElement('span')
  label.className = 'rounded-md bg-primary/90 px-1.5 py-0.5 text-xs font-medium text-primary shadow-xs'
  label.textContent = name
  el.append(dot, label)
  return el
}

/**
 * The map of the trips of a reply (the founders, 2026-11-11): each start and the place, the path of the train or metro, else a
 * straight dashed line, and under it the numbers that code measured. MapLibre loads only when a reply has a trip.
 */
export function TripMap({ trips }: { trips: Trip[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let map: import('maplibre-gl').Map | null = null
    let gone = false
    void (async () => {
      try {
        const [{ default: maplibre }] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')])
        if (gone || !box.current) return
        const points = trips.flatMap((t) => [t.from, t.to])
        const bounds = points.reduce((b, p) => b.extend([p.lng, p.lat]), new maplibre.LngLatBounds([points[0]!.lng, points[0]!.lat], [points[0]!.lng, points[0]!.lat]))
        map = new maplibre.Map({
          container: box.current, style: mapStyle, bounds, fitBoundsOptions: { padding: 48, maxZoom: 14 },
          // The credit is a line under the map, so no box covers a pin on a phone.
          cooperativeGestures: true, attributionControl: false, dragRotate: false, pitchWithRotate: false,
        })
        map.on('load', () => {
          for (const [i, t] of trips.entries()) {
            const coordinates = t.train ? t.train.path.map(([lat, lng]) => [lng, lat]) : [[t.from.lng, t.from.lat], [t.to.lng, t.to.lat]]
            map!.addSource(`trip-${i}`, { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } })
            map!.addLayer({
              id: `trip-${i}`, type: 'line', source: `trip-${i}`, layout: { 'line-cap': 'round', 'line-join': 'round' },
              paint: { 'line-color': i ? '#737373' : '#171717', 'line-width': 3, ...(t.train ? {} : { 'line-dasharray': [1.5, 1.5] }) },
            })
            new maplibre.Marker({ element: pin(t.from.name, false), ...onDot }).setLngLat([t.from.lng, t.from.lat]).addTo(map!)
          }
          const to = trips[0]!.to
          new maplibre.Marker({ element: pin(to.name, true), ...onDot }).setLngLat([to.lng, to.lat]).addTo(map!)
        })
        map.on('error', () => setFailed(true))
      } catch {
        setFailed(true)
      }
    })()
    return () => { gone = true; map?.remove() }
  }, [trips])

  return (
    <figure className="flex flex-col overflow-hidden rounded-xl border border-secondary bg-primary">
      {!failed && <div ref={box} role="img" aria-label={`Map of the trip to ${trips[0]!.to.name}`} className="h-56 w-full bg-secondary lg:h-64" />}
      <figcaption className="flex flex-col divide-y divide-secondary">
        {trips.map((t) => (
          <div key={`${t.option}-${t.from.name}`} className="flex items-start justify-between gap-3 px-3 py-2.5">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-sm font-semibold text-primary">{t.from.name} to {t.to.name}</p>
              <p className="text-sm text-tertiary">{tripLine(t)}</p>
            </div>
            <a href={directionsHref(t)} target="_blank" rel="noreferrer"
              className="flex shrink-0 items-center gap-1 rounded-md px-1 py-0.5 text-sm font-semibold text-secondary outline-focus-ring hover:text-secondary_hover focus-visible:outline-2">
              Directions <ArrowUpRight size={16} aria-hidden />
            </a>
          </div>
        ))}
        <p className="px-3 py-1.5 text-xs text-quaternary">
          <a href="https://openfreemap.org" target="_blank" rel="noreferrer" className="hover:underline">OpenFreeMap</a>{' '}
          <a href="https://www.openmaptiles.org" target="_blank" rel="noreferrer" className="hover:underline">© OpenMapTiles</a>{' '}
          Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:underline">OpenStreetMap</a>
        </p>
      </figcaption>
    </figure>
  )
}
