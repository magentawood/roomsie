import type { Tx } from '../db/client'
import { hideListingsOf } from '../listings/read'
import { setCardHiddenForReview } from '../profiles/read'
import { actionReportsAbout } from '../reports/read'
import { endOpenRequests } from '../requests/read'
import { suspendAccount } from '../users'

/** A suspended person is signed out everywhere, and leaves the product until a developer ends the suspension (T-19). */
export async function suspend(tx: Tx, userId: string) {
  const now = new Date()
  await suspendAccount(tx, userId, now)
  await setCardHiddenForReview(tx, userId, now)
  await hideListingsOf(tx, userId, now)
  await endOpenRequests(tx, userId)
  await actionReportsAbout(tx, userId)
}
