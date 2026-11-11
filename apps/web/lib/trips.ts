import { howFarOf, type Trip } from '@roomsie/contract'

const howFarWords = { near: 'Near', 'not far': 'Not far', far: 'Far' } as const

/** The numbers of a trip under its map: "Far · 9.9 km away · by road 35–55 min · by train about 43 min". */
export function tripLine({ straightKm, road, train }: Trip) {
  return [
    howFarWords[howFarOf(straightKm)],
    `${straightKm} km away`,
    `by road ${road.minutes[0]}–${road.minutes[1]} min`,
    ...(train ? [`by train about ${train.minutes} min`] : []),
  ].join(' · ')
}
