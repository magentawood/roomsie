import { useQuery } from '@tanstack/react-query'
import { areasResponse, savedPeopleResponse, savedPlacesResponse } from '@roomsie/contract'
import { api } from './api'
import { useUser } from './auth'

/** The cache keys of the API data. A change sets or refreshes its key. */
export const queryKeys = {
  myListings: ['listings', 'mine'],
  listing: (id: string) => ['listing', id],
  areas: ['areas'],
  savedPlaces: ['saved', 'places'],
  savedPeople: ['saved', 'people'],
} as const

/** The area groups change only with a deploy, so one fetch serves the visit. */
export function useAreas() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.areas, queryFn: () => api(user, '/v1/areas', areasResponse), staleTime: Infinity })
}

export function useSavedPlaces() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.savedPlaces, queryFn: () => api(user, '/v1/saved/places', savedPlacesResponse) })
}

export function useSavedPeople() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.savedPeople, queryFn: () => api(user, '/v1/saved/people', savedPeopleResponse) })
}

