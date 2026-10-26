import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import type { MeResponse } from '@roomsie/contract'
import { rejoin, tombstoneKey } from './account'
import type { Db } from './db/client'
import { users } from './db/schema'

/** jose caches these keys and fetches them again only when Google rotates them. */
export const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export type AuthOptions = { db: Db; firebaseProjectId: string; firebaseKeys: JWTVerifyGetKey }

declare module 'fastify' {
  interface FastifyRequest {
    user: MeResponse | null
    /** The person at the sign-in provider: the Google account id, or the Firebase uid if the token has none. */
    identity: string | null
  }
}

const bearerHeader = z.string().regex(/^Bearer \S+$/)
const firebaseClaims = z.object({
  sub: z.string().min(1),
  auth_time: z.number().int(),
  firebase: z.object({ identities: z.record(z.string(), z.array(z.string())) }).partial().optional(),
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
export function requireUser({ db, firebaseProjectId, firebaseKeys }: AuthOptions, { allowSuspended = false } = {}) {
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
    const { sub: uid, auth_time: authTime, firebase } = claims.data
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
    req.user = { id: user.id, status: user.status }
    req.identity = identity
  }
}

/** ON CONFLICT: two first requests at the same time make one user. */
async function createUser(db: Db, uid: string, signedInAt: Date) {
  await db.insert(users).values({ authProviderId: uid, tokensValidAfter: signedInAt }).onConflictDoNothing()
  return (await findUser(db, uid))!
}

async function findUser(db: Db, uid: string) {
  const [user] = await db
    .select({ id: users.id, status: users.status, tokensValidAfter: users.tokensValidAfter })
    .from(users)
    .where(eq(users.authProviderId, uid))
  return user
}
