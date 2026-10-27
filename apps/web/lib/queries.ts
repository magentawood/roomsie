import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  areasResponse, listingResponse, meResponse, personResponse, profileResponse, reportQueueResponse, savedPeopleResponse, savedPlacesResponse, type SavedKind,
} from '@roomsie/contract'
import { api, ApiError } from './api'
import { areaTree } from './areas'
import { useUser } from './auth'

/** The cache keys of the API data. A change sets or refreshes its key. */
export const queryKeys = {
  myListings: ['listings', 'mine'],
  listing: (id: string) => ['listing', id],
  person: (id: string) => ['person', id],
  areas: ['areas'],
  saved: (kind: SavedKind) => ['saved', kind],
  profile: ['profile'],
  me: ['me'],
  reportQueue: ['admin', 'reports'],
} as const

export function useMe() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api(user, '/v1/me', meResponse) })
}

export function useReportQueue() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.reportQueue, queryFn: () => api(user, '/v1/admin/reports', reportQueueResponse) })
}

/** A 4xx is final, for example a listing or a card that is gone. Only 5xx and network errors retry. */
const retryOnServerErrors = (count: number, err: Error) => count < 3 && !(err instanceof ApiError && err.status < 500)

export function useListing(id: string) {
  const user = useUser()
  return useQuery({
    queryKey: queryKeys.listing(id),
    queryFn: () => api(user, `/v1/listings/${id}`, listingResponse),
    retry: retryOnServerErrors,
  })
}

export function usePerson(id: string) {
  const user = useUser()
  return useQuery({
    queryKey: queryKeys.person(id),
    queryFn: () => api(user, `/v1/people/${id}`, personResponse),
    retry: retryOnServerErrors,
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

/** The areas change only with a deploy, so one fetch serves the visit. */
export function useAreas() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.areas, queryFn: () => api(user, '/v1/areas', areasResponse), staleTime: Infinity })
}

export function useAreaLabels(): Record<string, string> {
  const areas = useAreas().data?.areas
  return useMemo(() => {
    const tree = areaTree(areas ?? [])
    return Object.fromEntries((areas ?? []).map((a) => [a.slug, tree.label(a.slug) ?? a.name]))
  }, [areas])
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
  return new Set((kind === 'places' ? places.data?.places : people.data?.people)?.map((x) => x.id))
}
