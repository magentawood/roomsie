import { useQuery } from '@tanstack/react-query'
import type { User } from 'firebase/auth'
import { areasResponse } from '@roomsie/contract'
import { api } from './api'

/** The cache keys of the API data. A change sets or refreshes its key. */
export const queryKeys = {
  myListings: ['listings', 'mine'],
  listing: (id: string) => ['listing', id],
  areas: ['areas'],
} as const

/** The area groups change only with a deploy, so one fetch serves the visit. */
export function useAreas(user: User | null) {
  return useQuery({ queryKey: queryKeys.areas, queryFn: () => api(user!, '/v1/areas', areasResponse), enabled: !!user, staleTime: Infinity })
}
