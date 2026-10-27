import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import type { MeResponse } from '@roomsie/contract'
import { rejoin, tombstoneKey } from './account'
import type { Db } from './db/client'
import { users } from './db/schema'
import { realtimeClaims, type FirebaseAdmin } from './firebase-admin'
import type { Moderation } from './moderation/settings'

/** jose caches these keys and fetches them again only when Google rotates them. */
export const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export type AuthOptions = { db: Db; firebaseProjectId: string; firebaseKeys: JWTVerifyGetKey; moderation: Moderation }

declare module 'fastify' {
  interface FastifyRequest {
    user: MeResponse | null
    /** The person at the sign-in provider: the Google account id, or the Firebase uid if the token has none. */
    identity: string | null
  }
}

const bearerHeader = z.string().regex(/^Bearer \S+$/)
/** The Firebase uid and the Realtime claims of each request. Only the login path reads the uid, so it stays in this module. */
const tokens = new WeakMap<FastifyRequest, { uid: string; claims?: z.infer<typeof realtimeClaims> }>()
const firebaseClaims = z.object({
  sub: z.string().min(1),
  auth_time: z.number().int(),
  firebase: z.object({ identities: z.record(z.string(), z.array(z.string())) }).partial().optional(),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
})

/** A bad token is the caller's fault. A failure to get Google's keys is ours, so it is not a 401. */
const tokenErrors = [
  errors.JWTClaimValidationFailed, errors.JWTExpired, errors.JWTInvalid, errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed, errors.JOSEAlgNotAllowed, errors.JOSENotSupported, errors.JWKSNoMatchingKey,
]
function badToken(err: unknown) {
  if (tokenErrors.some((type) => err instanceof type)) return null
  throw err
}

/** `allowSuspended` is for account deletion only: a suspended person can still remove their data (DPDP). */
export function requireUser({ db, firebaseProjectId, firebaseKeys, moderation }: AuthOptions, { allowSuspended = false } = {}) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const header = bearerHeader.safeParse(req.headers.authorization)
    if (!header.success) return reply.code(401).send({ error: 'unauthorized' })

    const verified = await jwtVerify(header.data.slice('Bearer '.length), firebaseKeys, {
      issuer: `https://securetoken.google.com/${firebaseProjectId}`,
      audience: firebaseProjectId,
      algorithms: ['RS256'],
      requiredClaims: ['exp'],
      // Also rejects an iat in the future. A Firebase ID token lives one hour.
      maxTokenAge: '1h',
      clockTolerance: '5s',
    }).catch(badToken)
    const claims = firebaseClaims.safeParse(verified?.payload)
    if (!claims.success) return reply.code(401).send({ error: 'unauthorized' })

    // auth_time is the sign-in. A refreshed token keeps it, so a revocation holds (ADR-0007).
    const { sub: uid, auth_time: authTime, firebase, email, email_verified: emailVerified } = claims.data
    const signedInAt = new Date(authTime * 1000)
    // A tombstone keys on the Google account id: it stays when T-53 deletes the Firebase user, and the uid does not.
    const identity = firebase?.identities?.['google.com']?.[0] ?? uid
    let user = await findUser(db, uid)
    if (!user) {
      // No account: a first sign-in, or a sign-in after a deletion (T-20).
      const tombstone = await findUser(db, tombstoneKey(identity))
      if (!tombstone) user = await createUser(db, uid, signedInAt)
      else if (signedInAt < tombstone.tokensValidAfter) return reply.code(401).send({ error: 'unauthorized' })
      else if ((await rejoin(db, tombstone.id, uid, identity, signedInAt)) === 'blocked') return reply.code(403).send({ error: 'forbidden' })
      else user = (await findUser(db, uid))!
    }
    if (signedInAt < user.tokensValidAfter) return reply.code(401).send({ error: 'unauthorized' })
    const allowed = user.status === 'active' || (allowSuspended && user.status === 'suspended')
    if (!allowed) return reply.code(403).send({ error: 'forbidden' })
    // The email alerts go to the verified email of the latest sign-in (T-55).
    if (emailVerified && email && email !== user.email) await db.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, user.id))
    req.user = { id: user.id, status: user.status, moderator: moderation.moderatorUids.includes(uid) }
    req.identity = identity
    tokens.set(req, { uid, claims: realtimeClaims.safeParse(verified!.payload).data })
  }
}

/** ON CONFLICT: two first requests at the same time make one user. */
async function createUser(db: Db, uid: string, signedInAt: Date) {
  await db.insert(users).values({ authProviderId: uid, tokensValidAfter: signedInAt }).onConflictDoNothing()
  return (await findUser(db, uid))!
}

async function findUser(db: Db, uid: string) {
  const [user] = await db
    .select({ id: users.id, status: users.status, tokensValidAfter: users.tokensValidAfter, email: users.email })
    .from(users)
    .where(eq(users.authProviderId, uid))
  return user
}

/**
 * Supabase trusts a Firebase token only with these claims (T-44). Adds them to the Firebase user when the token has none.
 * A new claim shows in the next token, so it returns true when the web must refresh the token.
 */
export async function ensureRealtimeClaims(req: FastifyRequest, admin: FirebaseAdmin) {
  const { uid, claims } = tokens.get(req)!
  const userId = req.user!.id
  if (claims?.roomsie_user_id === userId) return false
  await admin.setClaims(uid, { role: 'authenticated', roomsie_user_id: userId })
  return true
}
