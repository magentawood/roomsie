import type { User } from 'firebase/auth'
import { noContent } from '@roomsie/contract'
import { chatApi } from './api'
import { chatStorage, readStored, writeStored } from './chat'

/** A failed claim keeps the key, so the next load of a page tries again (T-17). False: no key. */
export async function claimVisitorChat(user: User) {
  if (!readStored(chatStorage.visitorKey)) return false
  await chatApi(user, '/v1/goals/claim', noContent, { method: 'POST' })
  writeStored(chatStorage.visitorKey, null)
  return true
}
