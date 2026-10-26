import { z } from 'zod'
import { listingResponse } from './listings'

export const savedKind = z.enum(['places', 'people'])
export type SavedKind = z.infer<typeof savedKind>

/** The saved places of the user, newest first. Only live listings show (T-47). */
export const savedPlacesResponse = z.object({ places: z.array(listingResponse) })

/** The ids of the saved people of the user, newest first. T-18b adds the person card. */
export const savedPeopleResponse = z.object({ people: z.array(z.uuid()) })
