import { importPKCS8, SignJWT } from 'jose'
import { z } from 'zod'

/**
 * The only code that calls the Firebase Admin API. It calls the REST API that the Admin SDK calls,
 * with a token of the service account, so the API needs no SDK.
 */
export type FirebaseAdmin = { setClaims(uid: string, claims: Record<string, string>): Promise<void> }

export const serviceAccount = z.object({ project_id: z.string(), client_email: z.string(), private_key: z.string() })
type ServiceAccount = z.infer<typeof serviceAccount>

export function firebaseAdmin(account: ServiceAccount): FirebaseAdmin {
  let token: { value: string; expires: number } | null = null
  // A Google access token lives one hour. One token serves each call until 5 minutes before it ends.
  async function accessToken() {
    if (token && token.expires > Date.now() + 5 * 60_000) return token.value
    const now = Math.floor(Date.now() / 1000)
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit' })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email).setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt(now).setExpirationTime(now + 3600).sign(await importPKCS8(account.private_key, 'RS256'))
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    if (!res.ok) throw new Error(`Google token failed: ${res.status}`)
    const body = z.object({ access_token: z.string(), expires_in: z.number() }).parse(await res.json())
    token = { value: body.access_token, expires: Date.now() + body.expires_in * 1000 }
    return token.value
  }
  return {
    async setClaims(uid, claims) {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${account.project_id}/accounts:update`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }),
      })
      if (!res.ok) throw new Error(`Firebase claims failed: ${res.status}`)
    },
  }
}
