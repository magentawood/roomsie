import { z } from 'zod'
import { listingResponse } from './listings'
import { cardResponse } from './profiles'

export const savedKind = z.enum(['places', 'people'])
export type SavedKind = z.infer<typeof savedKind>

/** The saved places of the user, newest first. Only live listings show (T-47). */
export const savedPlacesResponse = z.object({ places: z.array(listingResponse) })

/** The saved people of the user, newest first. Only the cards that the user can see show (T-18b). */
export const savedPeopleResponse = z.object({ people: z.array(cardResponse) })
