// Domino VPN Service Worker — Push Notifications
self.addEventListener('push', function(event) {
  let data = { title: 'Domino VPN', body: 'Уведомление' }
  try { data = event.data.json() } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'Domino VPN', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: data,
      vibrate: [200, 100, 200]
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      if (list.length > 0) return list[0].focus()
      return clients.openWindow('/cabinet.html')
    })
  )
})
