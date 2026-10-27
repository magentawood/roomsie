/* global self -- the global scope of a service worker */
// The service worker of the push alerts (T-55). FCM sends a data message: { data: { title, link } }. It has no message text (PD17).
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data?.json().data ?? {}
  } catch {
    // Not JSON: the notice shows with its default title.
  }
  event.waitUntil(self.registration.showNotification(data.title || 'roomsie', { body: 'Tap to open roomsie.', data: { link: data.link } }))
})

// A tap opens the chat, or Requests, in a roomsie tab. Only a link of roomsie opens.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link
  const url = typeof link === 'string' && link.startsWith(self.location.origin) ? link : `${self.location.origin}/messages`
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const tab = tabs.find((t) => t.url === url)
    return tab ? tab.focus() : self.clients.openWindow(url)
  })())
})
