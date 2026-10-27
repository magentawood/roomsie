import { createContext, useContext } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  areasResponse, conversationsResponse, incomingRequestsResponse, listingResponse, meResponse, messagesResponse, outgoingRequestsResponse, personResponse,
  profileResponse, realtimeResponse, reportQueueResponse, savedPeopleResponse, savedPlacesResponse, type SavedKind,
} from '@roomsie/contract'
import { api, ApiError } from './api'
import { areaTree } from './areas'
import { useUser } from './auth'
import { badgeCount } from './messages'

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
  conversations: ['conversations'],
  messages: (conversationId: string) => ['messages', conversationId],
  requests: (direction: 'incoming' | 'outgoing') => ['requests', direction],
  realtime: ['realtime'],
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

/** `id`: null loads nothing, for a chat or a request that has no listing. */
export function useListing(id: string | null) {
  const user = useUser()
  return useQuery({
    queryKey: queryKeys.listing(id ?? ''),
    queryFn: () => api(user, `/v1/listings/${id}`, listingResponse),
    retry: retryOnServerErrors,
    enabled: id !== null,
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
  const areas = useAreas().data?.areas ?? []
  const tree = areaTree(areas)
  return Object.fromEntries(areas.map((a) => [a.slug, tree.label(a.slug) ?? a.name]))
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

/** True while the private channel of the user is up (lib/live.tsx). The messages data then changes only by its events. */
export const LiveChannel = createContext(false)

const pollWhileDown = 30_000

/** `poll`: a messages screen asks the API again every 30 s while the live channel is down (T-45). */
function useFreshness(poll: boolean) {
  return useContext(LiveChannel) ? { staleTime: Infinity, refetchOnWindowFocus: false } : { refetchInterval: poll ? pollWhileDown : false as const }
}

/** What the web needs to join the channel. A 503 means that Realtime is not set up yet, so there is no retry: the screens poll. */
export function useRealtime() {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.realtime, queryFn: () => api(user, '/v1/me/realtime', realtimeResponse, { method: 'POST' }), staleTime: Infinity, retry: false })
}

export function useConversations(poll = false) {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.conversations, queryFn: () => api(user, '/v1/conversations', conversationsResponse), ...useFreshness(poll) })
}

export function useIncomingRequests(poll = false) {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.requests('incoming'), queryFn: () => api(user, '/v1/requests/incoming', incomingRequestsResponse), ...useFreshness(poll) })
}

export function useOutgoingRequests(poll = false) {
  const user = useUser()
  return useQuery({ queryKey: queryKeys.requests('outgoing'), queryFn: () => api(user, '/v1/requests/outgoing', outgoingRequestsResponse), ...useFreshness(poll) })
}

/** The pages of a thread, newest first. The next page is the one before the oldest message. */
export function useMessages(conversationId: string) {
  const user = useUser()
  return useInfiniteQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: ({ pageParam }) => api(user, `/v1/conversations/${conversationId}/messages${pageParam ? `?before=${pageParam}` : ''}`, messagesResponse),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore ? last.messages.at(-1)?.id : undefined),
    ...useFreshness(true),
  })
}

export function useMessagesBadge() {
  const conversations = useConversations()
  const incoming = useIncomingRequests()
  return badgeCount(conversations.data?.conversations ?? [], incoming.data?.requests ?? [])
}
