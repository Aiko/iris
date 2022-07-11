console.log("Service Worker Loaded")
const channel = new BroadcastChannel('notify-messages')
//! This will not work until Electron implements persistent Push Notifications
self.addEventListener('notificationclick', event => {
  channel.postMessage({action: event.action, mid: event.notification.tag})
})