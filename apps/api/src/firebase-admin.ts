import { importPKCS8, SignJWT } from 'jose'
import { z } from 'zod'

// The REST call of the Admin SDK, with a token of the service account: no SDK dependency.
export const serviceAccount = z.object({ project_id: z.string(), client_email: z.string(), private_key: z.string() })

/** The claims that Supabase Realtime needs (T-44). */
export const realtimeClaims = z.object({ role: z.literal('authenticated'), roomsie_user_id: z.uuid() })
export type FirebaseAdmin = {
  setClaims(uid: string, claims: z.infer<typeof realtimeClaims>): Promise<void>
  /** A push has no message text (PD17), and `link` opens at a tap. "gone": FCM refuses the token, so the browser no longer gets pushes (T-55). */
  sendPush(token: string, push: { title: string; link: string }): Promise<'sent' | 'gone'>
}

const googleToken = z.object({ access_token: z.string(), expires_in: z.number() })
/** FCM refuses a token that a browser dropped with 404 UNREGISTERED, and a token that is not one with 400 INVALID_ARGUMENT. */
const goneStatuses = [400, 404]

export function firebaseAdmin(account: z.infer<typeof serviceAccount>): FirebaseAdmin {
  // A Google token lives one hour, so each scope signs one assertion an hour, not one for each call.
  const tokens = new Map<string, { token: string; until: number }>()
  async function accessToken(scope: string) {
    const kept = tokens.get(scope)
    if (kept && kept.until > Date.now()) return kept.token
    const assertion = await new SignJWT({ scope })
      .setProtectedHeader({ alg: 'RS256' }).setIssuer(account.client_email).setAudience('https://oauth2.googleapis.com/token')
      .setIssuedAt().setExpirationTime('1h').sign(await importPKCS8(account.private_key, 'RS256'))
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    })
    if (!res.ok) throw new Error(`Google token failed: ${res.status}`)
    const { access_token: token, expires_in: seconds } = googleToken.parse(await res.json())
    tokens.set(scope, { token, until: Date.now() + (seconds - 60) * 1000 })
    return token
  }
  return {
    async setClaims(uid, claims) {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${account.project_id}/accounts:update`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await accessToken('https://www.googleapis.com/auth/identitytoolkit')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ localId: uid, customAttributes: JSON.stringify(claims) }),
      })
      if (!res.ok) throw new Error(`Firebase claims failed: ${res.status}`)
    },
    async sendPush(token, { title, link }) {
      // A data message: the service worker of the web shows it, so the browser shows no second notice.
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
        method: 'POST',
        headers: { authorization: `Bearer ${await accessToken('https://www.googleapis.com/auth/firebase.messaging')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ message: { token, webpush: { data: { title, link }, headers: { Urgency: 'high' } } } }),
      })
      if (goneStatuses.includes(res.status)) return 'gone'
      if (!res.ok) throw new Error(`FCM failed: ${res.status}`)
      return 'sent'
    },
  }
}
