import { useQuery } from '@tanstack/react-query'
import { areasResponse, listingResponse, profileResponse, savedPeopleResponse, savedPlacesResponse, type SavedKind } from '@roomsie/contract'
import { api, ApiError } from './api'
import { useUser } from './auth'

/** The cache keys of the API data. A change sets or refreshes its key. */
export const queryKeys = {
  myListings: ['listings', 'mine'],
  listing: (id: string) => ['listing', id],
  areas: ['areas'],
  saved: (kind: SavedKind) => ['saved', kind],
  profile: ['profile'],
} as const

export function useListing(id: string) {
  const user = useUser()
  return useQuery({
    queryKey: queryKeys.listing(id),
    queryFn: () => api(user, `/v1/listings/${id}`, listingResponse),
    // A 404 means no longer listed. Only 5xx and network errors retry.
    retry: (count, err) => count < 3 && !(err instanceof ApiError && err.status < 500),
  })
}

/** The own profile, or null when the account has none yet. */
export function useProfile() {
  const user = useUser()
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api(user, '/v1/me/profile', profileResponse).catch((err: unknown) => {
      if (err instanceof ApiError && err.status === 404) return null
      throw err
    }),
  })
}

/** The area groups change only with a deploy, so one fetch serves the visit. */
export function useAreas() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.areas, queryFn: () => api(user, '/v1/areas', areasResponse), staleTime: Infinity })
}

export function useAreaNames() {
  const areas = useAreas()
  return Object.fromEntries((areas.data?.areas ?? []).map((a) => [a.slug, a.name]))
}

export function useSavedPlaces(enabled = true) {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.saved('places'), queryFn: () => api(user, '/v1/saved/places', savedPlacesResponse), enabled })
}

export function useSavedPeople(enabled = true) {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.saved('people'), queryFn: () => api(user, '/v1/saved/people', savedPeopleResponse), enabled })
}

/** The ids that the user saved, of one kind. Only the list of that kind loads. */
export function useSavedIds(kind: SavedKind) {
  const places = useSavedPlaces(kind === 'places')
  const people = useSavedPeople(kind === 'people')
  return new Set(kind === 'places' ? (places.data?.places ?? []).map((l) => l.id) : (people.data?.people ?? []))
}
