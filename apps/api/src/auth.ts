import type { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose'
import type { Db } from './db/client'
import { users } from './db/schema'

/** jose caches these keys and fetches them again only when Google rotates them. */
export const googleKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
)

export type AuthOptions = { db: Db; firebaseProjectId: string; firebaseKeys: JWTVerifyGetKey }
export type AuthUser = { id: string; status: 'active' | 'suspended' | 'deleted' }

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthUser | null
  }
}

/** A preHandler for signed-in routes: it verifies the Firebase ID token and loads the user. */
export function requireUser({ db, firebaseProjectId, firebaseKeys }: AuthOptions) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1]
    if (!token) return reply.code(401).send({ error: 'unauthorized' })

    let uid: string
    let issuedAt: Date
    try {
      const { payload } = await jwtVerify(token, firebaseKeys, {
        issuer: `https://securetoken.google.com/${firebaseProjectId}`,
        audience: firebaseProjectId,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'iat', 'exp'],
      })
      uid = payload.sub!
      issuedAt = new Date(payload.iat! * 1000)
    } catch {
      return reply.code(401).send({ error: 'unauthorized' })
    }

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
  const user = await findUser(db, uid)
  if (!user) throw new Error(`users row for ${uid} is missing after insert`)
  return user
}
