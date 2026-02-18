# Progressive Web App (PWA)

## Web App Manifest

```json
{
  "name": "Kira — Personal AI Assistant",
  "short_name": "Kira",
  "description": "Your personal AI assistant that lives on your machine",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#1a1a2e",
  "background_color": "#1a1a2e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "categories": ["productivity", "utilities"],
  "shortcuts": [
    {
      "name": "New Chat",
      "url": "/chat",
      "icons": [{ "src": "/icons/chat-96.png", "sizes": "96x96" }]
    },
    {
      "name": "Dashboard",
      "url": "/dashboard",
      "icons": [{ "src": "/icons/dashboard-96.png", "sizes": "96x96" }]
    }
  ]
}
```

---

## Service Worker

### Caching Strategy

```typescript
// service-worker.ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache built assets (versioned by build hash)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Static assets: Cache First (fonts, images)
registerRoute(
  ({ request }) => ['font', 'image'].includes(request.destination),
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// API calls: Network First (always try fresh, fall back to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 5 * 60 })],
  })
);

// Pages: Stale While Revalidate
registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate({ cacheName: 'pages' })
);
```

### Offline Support

When offline, Kira's dashboard shows:
- Cached conversation history (read-only)
- Cached widget data (last known state)
- "You're offline" banner with reconnection indicator
- Queue messages for sending when back online

**What works offline:**
- Viewing past conversations
- Reading dashboard/widgets (cached data)
- Composing messages (queued)

**What doesn't:**
- Sending messages to AI (requires API)
- Real-time data in widgets
- New agent tasks

---

## Install Prompts

### Desktop (Chrome/Edge)

Browser shows native install prompt automatically when PWA criteria are met. Additionally:

```typescript
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner(); // Custom UI: "Install Kira for quick access"
});

function handleInstallClick() {
  deferredPrompt?.prompt();
  deferredPrompt?.userChoice.then((choice) => {
    if (choice.outcome === 'accepted') {
      hideInstallBanner();
    }
    deferredPrompt = null;
  });
}
```

### Mobile (iOS/Android)

- **Android**: Native "Add to Home Screen" prompt via Chrome
- **iOS**: Manual — show instruction banner: "Tap Share → Add to Home Screen"
  - Detect iOS: show only on Safari, dismissible, shown once

---

## Push Notifications

### Via Service Worker

```typescript
// Register for push
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY,
  });
  
  // Send subscription to Kira backend
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
  });
}

// In service worker: handle push
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Kira', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: data.tag || 'kira-notification',
      data: { url: data.url || '/' },
    })
  );
});

// Click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
```

### Notification Types

| Event | Notification |
|-------|-------------|
| Agent completed background task | "✅ Research on [topic] is ready" |
| Scheduled reminder | "⏰ [reminder text]" |
| System alert | "⚠️ Kira needs attention: [issue]" |
| Calendar event | "📅 [event] in 30 minutes" |

User configures which notifications they want in Settings.

---

## Capacitor Wrapping (App Store / Play Store)

For users who want a "real" app from the store.

### Setup

```bash
npm install @capacitor/core @capacitor/cli
npx cap init kira ai.kira.app --web-dir dist

# Add platforms
npx cap add ios
npx cap add android
```

### capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.kira.app',
  appName: 'Kira',
  webDir: 'dist',
  server: {
    // In production, the app connects to the user's local Kira instance
    // URL is configured during setup
    url: undefined, // Set dynamically
    cleartext: true, // Allow HTTP for local network
  },
  plugins: {
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    LocalNotifications: {},
  },
};

export default config;
```

### How It Works

The Capacitor app is a thin shell that:
1. Opens the Kira dashboard URL (user's local instance or cloud)
2. Adds native capabilities: push notifications, biometric auth, background sync
3. Handles "Add Server" flow for connecting to a Kira instance

### App Store Submission Notes

- **iOS**: Must include meaningful offline functionality (cached dashboard)
- **Android**: Straightforward — PWA wrapper is accepted
- **Both**: Need privacy policy, app icons, screenshots, descriptions
- **Review risk**: Low — it's a legitimate productivity app connecting to user's own server

### v1.0 Priority

PWA is the primary target. Capacitor wrapping is a stretch goal — only pursue if there's demand. The PWA provides 90% of the native app experience without App Store complexity.
