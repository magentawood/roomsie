import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, errors, jwtVerify, type JWTVerifyGetKey } from 'jose'
import { z } from 'zod'
import type { MeResponse } from '@roomsie/contract'
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
  }
}

const bearerHeader = z.string().regex(/^Bearer \S+$/)
const firebaseClaims = z.object({ sub: z.string().min(1), iat: z.number().int() })

/** A bad token is the caller's fault. A failure to get Google's keys is ours, so it is not a 401. */
const tokenErrors = [
  errors.JWTClaimValidationFailed, errors.JWTExpired, errors.JWTInvalid, errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed, errors.JOSEAlgNotAllowed, errors.JOSENotSupported, errors.JWKSNoMatchingKey,
]
function badToken(err: unknown) {
  if (tokenErrors.some((type) => err instanceof type)) return null
  throw err
}

export function requireUser({ db, firebaseProjectId, firebaseKeys }: AuthOptions) {
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

    const { sub: uid, iat } = claims.data
    const issuedAt = new Date(iat * 1000)
    let user = await findUser(db, uid)
    if (!user) {
      // tokens_valid_after starts at the first token's iat (ADR-0007).
      await db.insert(users).values({ authProviderId: uid, tokensValidAfter: issuedAt }).onConflictDoNothing()
      user = (await findUser(db, uid))!
    }
    if (issuedAt < user.tokensValidAfter) return reply.code(401).send({ error: 'unauthorized' })
    if (user.status !== 'active') return reply.code(403).send({ error: 'forbidden' })
    req.user = { id: user.id, status: user.status }
  }
}

async function findUser(db: Db, uid: string) {
  const [user] = await db
    .select({ id: users.id, status: users.status, tokensValidAfter: users.tokensValidAfter })
    .from(users)
    .where(eq(users.authProviderId, uid))
  return user
}
