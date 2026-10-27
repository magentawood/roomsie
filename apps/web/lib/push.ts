import type { User } from 'firebase/auth'
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging'
import { noContent, pushTokenStatus } from '@roomsie/contract'
import { api } from './api'
import { firebaseApp } from './firebase'

/** "Push alerts" belongs to each browser (T-55): on means that the API has the push token of this browser for the signed-in person. */
export type PushState = 'on' | 'off' | 'blocked' | 'unsupported'

const worker = '/alerts-sw.js'
const fcmToken = (serviceWorkerRegistration: ServiceWorkerRegistration) =>
  getToken(getMessaging(firebaseApp()), { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY, serviceWorkerRegistration })

/** FCM drops the subscription when it refuses the token. */
async function browserToken() {
  const registration = await navigator.serviceWorker.getRegistration(worker)
  return registration && (await registration.pushManager.getSubscription()) ? fcmToken(registration) : null
}

/** An iPhone gives push only to roomsie on the home screen, so Safari there is "unsupported". */
export async function pushState(user: User): Promise<PushState> {
  if (!(await isSupported())) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const token = Notification.permission === 'granted' ? await browserToken() : null
  if (!token) return 'off'
  const { registered } = await api(user, '/v1/me/push-tokens/status', pushTokenStatus, { method: 'POST', body: { token } })
  return registered ? 'on' : 'off'
}

/** The browser asks "Allow notifications?" only from a tap, so call this in the click. */
export async function turnOnPush(user: User): Promise<PushState> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off'
  const token = await fcmToken(await navigator.serviceWorker.register(worker))
  await api(user, '/v1/me/push-tokens', noContent, { method: 'POST', body: { token } })
  return 'on'
}

export async function turnOffPush(user: User): Promise<PushState> {
  const token = await browserToken()
  if (token) await api(user, '/v1/me/push-tokens', noContent, { method: 'DELETE', body: { token } })
  await deleteToken(getMessaging(firebaseApp())).catch(() => false)
  return 'off'
}
