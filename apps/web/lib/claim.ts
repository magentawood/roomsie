import type { User } from 'firebase/auth'
import { noContent } from '@roomsie/contract'
import { chatApi } from './api'
import { chatStorage, readStored, writeStored } from './chat'

/**
 * At sign-in (T-17): the visitor chat of this browser moves to the account, then the browser forgets the visitor key.
 * A failed claim keeps the key, so the chat still works, and the next load of a page tries again. False: nothing to claim.
 */
export async function claimVisitorChat(user: User) {
  if (!readStored(chatStorage.visitorKey)) return false
  await chatApi(user, '/v1/goals/claim', noContent, { method: 'POST' })
  writeStored(chatStorage.visitorKey, null)
  return true
}
