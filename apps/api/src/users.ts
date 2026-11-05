import { and, desc, eq, ilike, inArray, ne, sql, type SQLWrapper } from 'drizzle-orm'
import type { Db, Tx } from './db/client'
import { users } from './db/schema'
import { containing } from './text/like'

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

/** The sign-in emails of some accounts, for the logs of the admin (T-65). */
export async function emailsOf(db: Db, userIds: string[]) {
  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, userIds))
  return new Map(rows.map((r) => [r.id, r.email]))
}

/** The accounts for the admin (T-63): the status, the times, and the email. */
export const accountsOf = (db: Db | Tx, userIds: string[]) => db.select({ id: users.id, email: users.email, status: users.status, joinedAt: users.createdAt, lastSignInAt: users.lastSignInAt })
  .from(users).where(inArray(users.id, userIds))

/** The newest accounts: all of them, the suspended ones, or the ones with an email that has the text. */
export const newestAccounts = (db: Db, limit: number, { suspended = false, email }: { suspended?: boolean; email?: string } = {}) =>
  db.select({ id: users.id }).from(users)
    .where(and(suspended ? eq(users.status, 'suspended') : ne(users.status, 'deleted'), email ? ilike(users.email, containing(email)) : undefined))
    .orderBy(desc(users.createdAt)).limit(limit)

export const suspendedCount = (db: Db) => db.$count(users, eq(users.status, 'suspended'))
