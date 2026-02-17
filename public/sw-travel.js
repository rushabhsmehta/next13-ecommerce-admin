// Service Worker for Push Notifications - Aagam Holidays Travel App
// This file must be served from the public directory

self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || "You have a new notification",
    icon: data.icon || "/travel-icon-192.png",
    badge: "/travel-badge-72.png",
    image: data.image,
    tag: data.tag || "travel-notification",
    data: {
      url: data.url || "/travel",
      groupId: data.groupId,
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Aagam Holidays",
      options
    )
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url = event.notification.data?.url || "/travel";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // If a window with this URL is already open, focus it
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("pushsubscriptionchange", function (event) {
  var options = event.oldSubscription && event.oldSubscription.options
    ? event.oldSubscription.options
    : { userVisibleOnly: true };

  event.waitUntil(
    self.registration.pushManager
      .subscribe(options)
      .then(function (subscription) {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
  );
});
