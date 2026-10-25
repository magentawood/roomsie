import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
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

export function requireUser({ db, firebaseProjectId, firebaseKeys }: AuthOptions) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const header = bearerHeader.safeParse(req.headers.authorization)
    if (!header.success) return reply.code(401).send({ error: 'unauthorized' })

    const verified = await jwtVerify(header.data.slice('Bearer '.length), firebaseKeys, {
      issuer: `https://securetoken.google.com/${firebaseProjectId}`,
      audience: firebaseProjectId,
      algorithms: ['RS256'],
      requiredClaims: ['exp'],
    }).catch(() => null)
    const claims = firebaseClaims.safeParse(verified?.payload)
    if (!claims.success) return reply.code(401).send({ error: 'unauthorized' })

    const uid = claims.data.sub
    const issuedAt = new Date(claims.data.iat * 1000)
    const user = (await findUser(db, uid)) ?? (await createUser(db, uid, issuedAt))
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

async function createUser(db: Db, uid: string, issuedAt: Date) {
  // The first token is older than the new row, so tokens_valid_after starts at its iat.
  await db.insert(users).values({ authProviderId: uid, tokensValidAfter: issuedAt }).onConflictDoNothing()
  return (await findUser(db, uid))!
}
