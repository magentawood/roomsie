import { listingEditBody, type goLiveFields, type ListingEdit, type ListingKind, type ListingResponse } from '@roomsie/contract'

/** The steps of flow 04 (Product file, and the drafts of T-42). */
export type StepId = 'kind' | 'where' | 'nearby' | 'place' | 'rent' | 'rules' | 'people' | 'photos'
type Field = keyof ListingEdit

export function listingSteps(kind: ListingKind): StepId[] {
  return kind === 'room_in_flat'
    ? ['kind', 'where', 'nearby', 'place', 'rent', 'rules', 'people', 'photos']
    : ['kind', 'where', 'nearby', 'place', 'rent', 'rules', 'photos']
}

export const stepCopy: Record<StepId, { title: string; helper: string }> = {
  kind: { title: 'What are you listing?', helper: 'Pick one.' },
  where: { title: 'Where is it?', helper: 'Seekers see the area, the landmark and the building. The full address is optional.' },
  nearby: { title: 'What’s nearby?', helper: 'The stuff people always ask in the comments. Add what’s close and how far.' },
  place: { title: 'What’s the place?', helper: 'Type, size, floor and bathrooms.' },
  rent: { title: 'Rent, deposit and dates', helper: 'Exact amounts. People filter on these, so be precise.' },
  rules: { title: 'House rules and who’s welcome', helper: 'Saves you a hundred awkward calls. Seekers see it as your promise.' },
  people: { title: 'Who lives here', helper: 'People decide from the flatmates, not just the photos. A face helps a lot.' },
  photos: { title: 'Photos and description', helper: 'People decide most from the photos. Add up to 5.' },
}

const isFlat = (kind: ListingKind) => kind !== 'pg'

/** The fields that a step saves, for each kind (T-41 contract). */
export function stepFields(kind: ListingKind, step: StepId): Field[] {
  switch (step) {
    case 'kind':
      return []
    case 'where':
      return [...(kind === 'pg' ? ['pgName' as const] : []), 'areaSlug', 'address', 'building', 'street', 'landmark', 'pincode', 'shareAddress']
    case 'nearby':
      return ['nearestStation', 'walkStation', 'walkBus', 'walkMarket', 'walkGym', 'walkMall']
    case 'place':
      return [
        ...(isFlat(kind) ? ['placeType' as const, 'furnishing' as const] : ['sharing' as const, 'bedsFree' as const, 'meals' as const, 'curfew' as const]),
        ...(kind === 'room_in_flat' ? ['roomType' as const] : []),
        'bathroom',
        ...(isFlat(kind) ? ['floor' as const, 'carpetAreaSqft' as const] : []),
        'balcony', 'insideItems', 'amenities',
      ]
    case 'rent':
      return [
        'rates',
        ...(isFlat(kind) ? ['maintenance' as const] : []),
        ...(kind === 'broker_flat' ? ['brokerage' as const] : []),
        'maintenanceIncluded', 'electricity', 'rentNegotiable',
        ...(isFlat(kind) ? ['availableFrom' as const] : []),
        'minStay',
      ]
    case 'rules':
      return ['vegOnlyKitchen', 'smokingAllowed', 'alcoholAllowed', 'guests', 'whoCanMoveIn', 'whoIsWelcome']
    case 'people':
      return ['flatmates', 'flatmatesConsent']
    case 'photos':
      return ['photoKeys', 'description']
  }
}

/** The PATCH body of a step: only its fields, and only the ones that the form has. */
export function stepBody(kind: ListingKind, step: StepId, values: ListingEdit): ListingEdit {
  const body: Record<string, unknown> = {}
  for (const field of stepFields(kind, step)) if (field in values) body[field] = values[field]
  return body as ListingEdit
}

/** The form values of a saved listing. A flat rent has no sharing type, so the strict edit schema accepts it. */
export function toEditValues(listing: ListingResponse): ListingEdit {
  const fields: Record<string, unknown> = {}
  for (const key of Object.keys(listingEditBody.shape)) if (key in listing) fields[key] = listing[key as keyof ListingResponse]
  return {
    ...fields,
    photoKeys: listing.photos.map((p) => p.key),
    rates: listing.rates.map((r) => (listing.kind === 'pg' && r.sharing ? { sharing: r.sharing, rent: r.rent, deposit: r.deposit } : { rent: r.rent, deposit: r.deposit })),
    flatmates: listing.flatmates.map((f) => ({ name: f.name, age: f.age, whatTheyDo: f.whatTheyDo, food: f.food, photoKey: f.photoKey })),
  }
}

const missingSteps: Record<(typeof goLiveFields)[number], StepId> = {
  areaSlug: 'where', pgName: 'where', brokerage: 'rent', rates: 'rent', flatmatesConsent: 'people',
}
export const stepForMissing = (field: (typeof goLiveFields)[number]) => missingSteps[field]

export type CardAction = 'edit' | 'continue' | 'filled' | 'deactivate' | 'live'
const actions: Record<ListingResponse['status'], CardAction[]> = {
  live: ['edit', 'filled', 'deactivate'],
  inactive: ['edit', 'live', 'filled'],
  filled: ['edit', 'live'],
  draft: ['continue'],
}
export const cardActions = (status: ListingResponse['status']) => actions[status]

/* Labels of the single and pick-many choices, as the designs write them. */
export const labels = {
  placeType: { '1rk': '1 RK', '1bhk': '1 BHK', '2bhk': '2 BHK', '3bhk': '3 BHK', '4bhk': '4 BHK', studio: 'Studio Flat', independent_house: 'Independent House', bungalow_villa: 'Bungalow/Villa', penthouse: 'Penthouse' },
  furnishing: { fully: 'Fully furnished', semi: 'Semi furnished', unfurnished: 'Unfurnished' },
  roomType: { private: 'Private room', shared: 'Shared room' },
  sharing: { single: 'Single', double: 'Double', triple: 'Triple', four: 'Four sharing', four_plus: '4+ sharing' },
  bedsFree: { '1': '1', '2': '2', '3': '3', '4': '4', '5': '5', '5_plus': '5+' },
  meals: { veg_included: 'Veg, included', veg_non_veg: 'Veg + non-veg', breakfast_only: 'Breakfast only', none: 'No meals' },
  curfew: { none: 'No curfew', '10pm': '10 pm', '10_30pm': '10:30 pm', '11pm': '11 pm', midnight: 'Midnight' },
  bathroom: { attached: 'Attached bathroom', shared: 'Shared bathroom' },
  walkTime: { '5_min': '5 minute walk', '10_min': '10 minute walk', '15_min': '15 minute walk', '30_min': '30 minute walk', not_close: 'Not close' },
  electricity: { included: 'Included', as_per_meter: 'As per meter', split_equally: 'Split equally' },
  minStay: { '3_months': '3 months', '6_months': '6 months', '12_months': '12 months', flexible: 'Flexible' },
  guests: { none: 'No Guests welcome', welcome: 'Guests Welcome', day_visits: 'Day Visits only' },
  whoCanMoveIn: { men: 'Men', women: 'Women', any: 'Any' },
  whoIsWelcome: { students: 'Students', working_professionals: 'Working professionals', couples: 'Couples', families: 'Families', bachelors: 'Bachelors' },
  food: { veg: 'Veg', non_veg: 'Non-veg', eggetarian: 'Eggetarian', jain: 'Jain' },
  insideItems: {
    bed: 'Bed', mattress: 'Mattress', wardrobe: 'Wardrobe', study_table: 'Study table', chair: 'Chair', sofa: 'Sofa', dining_table: 'Dining table', tv: 'TV',
    fridge: 'Fridge', washing_machine: 'Washing machine', microwave: 'Microwave', ac: 'AC', geyser: 'Geyser', water_purifier: 'Water purifier',
    gas_stove: 'Gas stove', curtains: 'Curtains', fans_and_lights: 'Fans and lights', modular_kitchen: 'Modular kitchen', inverter: 'Inverter',
  },
  amenities: {
    lift: 'Lift', cctv: 'CCTV', security_24x7: '24x7 security', power_backup: 'Power backup', gym: 'Gym', swimming_pool: 'Swimming pool',
    clubhouse: 'Clubhouse', garden: 'Garden', water_24x7: '24x7 water', piped_gas: 'Piped gas', intercom: 'Intercom', wifi: 'Wi-Fi',
    housekeeping: 'Housekeeping', maid: 'Maid available', cook: 'Cook available', laundry: 'Laundry', car_parking: 'Car parking', rooftop_terrace: 'Rooftop terrace',
  },
} as const

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`

/** The card title: "2 BHK, full flat", "Private room in 3 BHK" or the PG name. */
export function listingTitle(listing: ListingResponse) {
  if (listing.kind === 'pg') return listing.pgName ?? 'New listing'
  if (!listing.placeType) return 'New listing'
  const place = labels.placeType[listing.placeType]
  if (listing.kind !== 'room_in_flat') return `${place}, full flat`
  return `${listing.roomType ? labels.roomType[listing.roomType] : 'Room'} in ${place}`
}

export function rentLine(listing: ListingResponse) {
  const rents = listing.rates.map((r) => r.rent)
  if (!rents.length) return 'Rent: not set yet'
  const low = Math.min(...rents)
  const high = Math.max(...rents)
  return low === high ? `Rent: ${rupees(low)}/mo` : `Rent: ${rupees(low)}–${rupees(high)}/mo`
}
