import type { User } from 'firebase/auth'
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { z } from 'zod'
import { noContent } from '@roomsie/contract'
import { api } from './api'
import { firebaseApp } from './firebase'

/** "Push alerts" belongs to each browser (T-55): on means that this browser gave its token to the API for the signed-in person. */
export type PushState = 'on' | 'off' | 'blocked' | 'unsupported'

// A convenience of this browser only: the API holds the tokens. Storage can be off, so each access can fail.
const savedKey = 'roomsie.push'
const savedToken = z.object({ uid: z.string(), token: z.string() })
function saved() {
  try {
    return savedToken.safeParse(JSON.parse(localStorage.getItem(savedKey) ?? 'null')).data ?? null
  } catch {
    return null
  }
}
function save(value: z.infer<typeof savedToken> | null) {
  try {
    if (value) localStorage.setItem(savedKey, JSON.stringify(value))
    else localStorage.removeItem(savedKey)
  } catch {
    // The switch then shows off at the next visit, and a new tap gives the same token again.
  }
}

/** An iPhone gives push only to roomsie on the home screen, so Safari there is "unsupported". */
export async function pushState(user: User): Promise<PushState> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  return Notification.permission === 'granted' && saved()?.uid === user.uid ? 'on' : 'off'
}

/** The browser asks "Allow notifications?" only from a tap, so call this in the click. */
export async function turnOnPush(user: User): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const serviceWorkerRegistration = await navigator.serviceWorker.register('/alerts-sw.js')
  const token = await getToken(getMessaging(firebaseApp()), { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration })
  await api(user, '/v1/me/push-tokens', noContent, { method: 'POST', body: { token } })
  save({ uid: user.uid, token })
  return 'on'
}

export async function turnOffPush(user: User): Promise<PushState> {
  const token = saved()?.token
  if (token) await api(user, '/v1/me/push-tokens', noContent, { method: 'DELETE', body: { token } })
  save(null)
  await deleteToken(getMessaging(firebaseApp())).catch(() => false)
  return 'off'
}
