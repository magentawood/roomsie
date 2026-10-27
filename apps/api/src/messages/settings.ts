import { z } from 'zod'
import { firebaseAdmin, serviceAccount, type FirebaseAdmin } from '../firebase-admin'
import { noRealtime, supabaseRealtime, type Realtime } from '../realtime'

/** An unset secret of the deploy arrives as an empty string. */
const optional = z.preprocess((v) => v || undefined, z.string().optional())

/** The settings of the messages (T-44). Each is optional, so development and the tests run with no Supabase and no Firebase. */
export const messagingSettings = z.object({
  SUPABASE_URL: optional.pipe(z.url().optional()),
  SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  FIREBASE_SERVICE_ACCOUNT: optional.transform((json) => json && serviceAccount.parse(JSON.parse(json))),
}).transform((s): Messaging => ({
  realtime: s.SUPABASE_URL && s.SUPABASE_SERVICE_ROLE_KEY ? supabaseRealtime({ url: s.SUPABASE_URL, serviceKey: s.SUPABASE_SERVICE_ROLE_KEY }) : noRealtime,
  firebaseAdmin: s.FIREBASE_SERVICE_ACCOUNT ? firebaseAdmin(s.FIREBASE_SERVICE_ACCOUNT) : null,
  realtimeClient: s.SUPABASE_URL && s.SUPABASE_ANON_KEY ? { url: s.SUPABASE_URL, key: s.SUPABASE_ANON_KEY } : null,
}))

/** `realtimeClient` is the public URL and key that the web joins Realtime with. */
export type Messaging = { realtime: Realtime; firebaseAdmin: FirebaseAdmin | null; realtimeClient: { url: string; key: string } | null }
