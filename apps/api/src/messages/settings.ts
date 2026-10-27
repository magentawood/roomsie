import { z } from 'zod'
import { unsetIfEmpty } from '../env-values'
import { firebaseAdmin, serviceAccount } from '../firebase-admin'
import { noRealtime, supabaseRealtime } from '../realtime'

/** Each is optional, so development runs with no Supabase and no Firebase (T-44). */
export const messagingSettings = z.object({
  SUPABASE_URL: unsetIfEmpty.pipe(z.url().optional()),
  SUPABASE_ANON_KEY: unsetIfEmpty,
  SUPABASE_SERVICE_ROLE_KEY: unsetIfEmpty,
  FIREBASE_SERVICE_ACCOUNT: unsetIfEmpty.transform((json) => json && serviceAccount.parse(JSON.parse(json))),
}).transform((s) => ({
  realtime: s.SUPABASE_URL && s.SUPABASE_SERVICE_ROLE_KEY ? supabaseRealtime({ url: s.SUPABASE_URL, serviceKey: s.SUPABASE_SERVICE_ROLE_KEY }) : noRealtime,
  firebaseAdmin: s.FIREBASE_SERVICE_ACCOUNT ? firebaseAdmin(s.FIREBASE_SERVICE_ACCOUNT) : null,
  webRealtime: s.SUPABASE_URL && s.SUPABASE_ANON_KEY ? { url: s.SUPABASE_URL, key: s.SUPABASE_ANON_KEY } : null,
}))
export type Messaging = z.output<typeof messagingSettings>
