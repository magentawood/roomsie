import { z } from 'zod'
import { firebaseAdmin, serviceAccount } from '../firebase-admin'
import { noRealtime, supabaseRealtime } from '../realtime'

/** An unset secret of the deploy arrives as an empty string. */
const optional = z.preprocess((v) => v || undefined, z.string().optional())

/** Each is optional, so development runs with no Supabase and no Firebase (T-44). */
export const messagingSettings = z.object({
  SUPABASE_URL: optional.pipe(z.url().optional()),
  SUPABASE_ANON_KEY: optional,
  SUPABASE_SERVICE_ROLE_KEY: optional,
  FIREBASE_SERVICE_ACCOUNT: optional.transform((json) => json && serviceAccount.parse(JSON.parse(json))),
}).transform((s) => ({
  realtime: s.SUPABASE_URL && s.SUPABASE_SERVICE_ROLE_KEY ? supabaseRealtime({ url: s.SUPABASE_URL, serviceKey: s.SUPABASE_SERVICE_ROLE_KEY }) : noRealtime,
  firebaseAdmin: s.FIREBASE_SERVICE_ACCOUNT ? firebaseAdmin(s.FIREBASE_SERVICE_ACCOUNT) : null,
  webRealtime: s.SUPABASE_URL && s.SUPABASE_ANON_KEY ? { url: s.SUPABASE_URL, key: s.SUPABASE_ANON_KEY } : null,
}))
export type Messaging = z.output<typeof messagingSettings>
