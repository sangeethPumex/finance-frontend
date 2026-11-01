// Brain Jogger push: shows the notification the server sends and opens the app on tap.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Brain Jogger", {
    body: d.body || "", tag: d.tag, renotify: !!d.tag, icon: "/pwa-icon-192.png", badge: "/pwa-icon-192.png", data: { url: d.url || "/jogger" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/jogger";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
    for (const c of all) if ("focus" in c) { c.navigate(url).catch(() => {}); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
