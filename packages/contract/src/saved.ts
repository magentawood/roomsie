import { z } from 'zod'
import { listingResponse } from './listings'

/** The saved places of the user, newest first. Only live listings show (T-47). */
export const savedPlacesResponse = z.object({
  places: z.array(z.object({ savedAt: z.iso.datetime(), listing: listingResponse })),
})
export type SavedPlacesResponse = z.infer<typeof savedPlacesResponse>

/** The saved people of the user, newest first. T-18b adds the person card. */
export const savedPeopleResponse = z.object({
  people: z.array(z.object({ savedAt: z.iso.datetime(), profileId: z.uuid() })),
})
export type SavedPeopleResponse = z.infer<typeof savedPeopleResponse>
