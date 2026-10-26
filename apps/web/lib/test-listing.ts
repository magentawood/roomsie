import type { ListingResponse } from '@roomsie/contract'

/** A listing for the tests: empty, except for the patch. */
export const listing = (patch: Partial<ListingResponse>): ListingResponse => ({
  id: '0199e4b0-0000-7000-8000-000000000001', kind: 'owner_flat', status: 'draft',
  pgName: null, areaSlug: null, address: null, shareAddress: false, building: null, street: null, landmark: null, pincode: null,
  nearestStation: null, walkStation: null, walkBus: null, walkMarket: null, walkGym: null, walkMall: null,
  placeType: null, furnishing: null, roomType: null, floor: null, carpetAreaSqft: null,
  sharing: [], bedsFree: null, meals: null, curfew: null, bathroom: null, balcony: null, insideItems: [], amenities: [],
  maintenance: null, maintenanceIncluded: null, electricity: null, rentNegotiable: null, brokerage: null, availableFrom: null, minStay: null,
  vegOnlyKitchen: null, smokingAllowed: null, alcoholAllowed: null, guests: null, whoCanMoveIn: null, whoIsWelcome: [],
  flatmatesConsent: false, description: null, photos: [], rates: [], flatmates: [], mine: false, hidden: false,
  expiresAt: null, createdAt: '2026-10-26T10:00:00.000Z', updatedAt: '2026-10-26T10:00:00.000Z',
  ...patch,
})
