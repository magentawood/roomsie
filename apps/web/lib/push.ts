import type { User } from 'firebase/auth'
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { z } from 'zod'
import { noContent } from '@roomsie/contract'
import { api } from './api'
import { firebaseApp } from './firebase'

/** "Push alerts" belongs to each browser (T-55): on means that this browser gave its push token to the API for the signed-in person. */
export type PushState = 'on' | 'off' | 'blocked' | 'unsupported'

const worker = '/alerts-sw.js'
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

// Which person turned push on in this browser. Storage can be off, so each access can fail.
const savedKey = 'roomsie.push'
const savedToken = z.object({ userId: z.string(), token: z.string() })
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
    // The push subscription of the browser still tells if push is on.
  }
}

/** The push subscription of this browser. FCM drops it when it refuses the token, so the switch then shows off. */
async function subscription() {
  const registration = await navigator.serviceWorker.getRegistration(worker)
  return registration && (await registration.pushManager.getSubscription()) ? registration : null
}

/** An iPhone gives push only to roomsie on the home screen, so Safari there is "unsupported". */
export async function pushState(userId: string): Promise<PushState> {
  if (!(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const mine = (saved()?.userId ?? userId) === userId
  return Notification.permission === 'granted' && mine && (await subscription()) ? 'on' : 'off'
}

/** The browser asks "Allow notifications?" only from a tap, so call this in the click. */
export async function turnOnPush(user: User, userId: string): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const serviceWorkerRegistration = await navigator.serviceWorker.register(worker)
  const token = await getToken(getMessaging(firebaseApp()), { vapidKey, serviceWorkerRegistration })
  await api(user, '/v1/me/push-tokens', noContent, { method: 'POST', body: { token } })
  save({ userId, token })
  return 'on'
}

export async function turnOffPush(user: User): Promise<PushState> {
  // With no saved token, FCM gives the token of the subscription again.
  const registration = await subscription()
  const token = saved()?.token ?? (registration && await getToken(getMessaging(firebaseApp()), { vapidKey, serviceWorkerRegistration: registration }))
  if (token) await api(user, '/v1/me/push-tokens', noContent, { method: 'DELETE', body: { token } })
  save(null)
  await deleteToken(getMessaging(firebaseApp())).catch(() => false)
  return 'off'
}
