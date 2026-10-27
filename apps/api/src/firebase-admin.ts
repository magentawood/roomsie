import { importPKCS8, SignJWT } from 'jose'
import { z } from 'zod'

// The REST call of the Admin SDK, with a token of the service account: no SDK dependency.
export const serviceAccount = z.object({ project_id: z.string(), client_email: z.string(), private_key: z.string() })

/** The claims that Supabase Realtime needs (T-44). */
export const realtimeClaims = z.object({ role: z.literal('authenticated'), roomsie_user_id: z.uuid() })
export type FirebaseAdmin = { setClaims(uid: string, claims: z.infer<typeof realtimeClaims>): Promise<void> }

export function firebaseAdmin(account: z.infer<typeof serviceAccount>): FirebaseAdmin {
  async function accessToken() {
    const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/identitytoolkit' })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email).setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt().setExpirationTime('1h').sign(await importPKCS8(account.private_key, 'RS256'))
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    if (!res.ok) throw new Error(`Google token failed: ${res.status}`)
    return z.object({ access_token: z.string() }).parse(await res.json()).access_token
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
