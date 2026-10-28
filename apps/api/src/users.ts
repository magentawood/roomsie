import { eq, inArray, sql, type SQLWrapper } from 'drizzle-orm'
import type { Db, Tx } from './db/client'
import { users } from './db/schema'

/* The account module (this file, auth.ts and account.ts) owns `users`. Other modules call these functions. */

/** A SQL condition: the user of this column has an active account, so suspended and deleted people drop out. */
export const activeAccount = (userId: SQLWrapper) => sql`exists (select 1 from ${users} u where u.id = ${userId} and u.status = 'active')`

/** The account status of each user id. */
export async function statusesOf(db: Db, userIds: string[]) {
  const rows = await db.select({ id: users.id, status: users.status }).from(users).where(inArray(users.id, userIds))
  return new Map(rows.map((u) => [u.id, u.status]))
}

/** Locks the users row of the person. Account deletion locks it too, so a write under this lock cannot race a deletion. */
export async function lockAccount(tx: Tx, userId: string) {
  const [user] = await tx.select({ status: users.status }).from(users).where(eq(users.id, userId)).for('update')
  return user
}

/** The lock of lockAccount, with the Firebase uid, for account deletion (T-53). */
export async function lockAccountForDeletion(tx: Tx, userId: string) {
  const [user] = await tx.select({ status: users.status, uid: users.authProviderId }).from(users).where(eq(users.id, userId)).for('update')
  return user
}

/** A suspended person is signed out everywhere (T-19). */
export const suspendAccount = (tx: Tx, userId: string, at: Date) =>
  tx.update(users).set({ status: 'suspended', tokensValidAfter: at }).where(eq(users.id, userId))

/** The status, the email and the "Email alerts" switch of a person (T-55). */
export async function alertContactOf(db: Db, userId: string) {
  const [user] = await db.select({ status: users.status, email: users.email, emailAlerts: users.emailAlerts }).from(users).where(eq(users.id, userId))
  return user
}

export const setEmailAlerts = (db: Db, userId: string, emailAlerts: boolean) =>
  db.update(users).set({ emailAlerts, updatedAt: new Date() }).where(eq(users.id, userId))
