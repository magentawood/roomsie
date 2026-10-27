import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose'

export const projectId = 'roomsie-test'

type TokenOptions = { key?: CryptoKey; audience?: string; issuer?: string; iat?: number; exp?: number; authTime?: number | null; googleId?: string; claims?: Record<string, string> }

/** A local key pair in place of Google's keys, and Firebase-shaped ID tokens signed with it. */
export async function testTokens() {
  const pair = await generateKeyPair('RS256')
  const firebaseKeys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'test', alg: 'RS256' }] })
  function idToken(uid: string, opts: TokenOptions = {}) {
    const now = Math.floor(Date.now() / 1000)
    const audience = opts.audience ?? projectId
    const google = opts.googleId ? { firebase: { identities: { 'google.com': [opts.googleId] }, sign_in_provider: 'google.com' } } : {}
    return new SignJWT({ ...(opts.authTime === null ? {} : { auth_time: opts.authTime ?? opts.iat ?? now }), ...google, ...opts.claims })
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setIssuer(opts.issuer ?? `https://securetoken.google.com/${audience}`)
      .setAudience(audience)
      .setSubject(uid)
      .setIssuedAt(opts.iat ?? now)
      .setExpirationTime(opts.exp ?? now + 3600)
      .sign(opts.key ?? pair.privateKey)
  }
  return { firebaseKeys, idToken }
}
