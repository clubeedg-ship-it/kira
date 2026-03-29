# Mobile Strategy

> **Status:** ✅ DESIGNED | **Phase:** 6
> **Purpose:** Defines which views exist on mobile, navigation pattern, platform approach, and what's desktop-only. Mobile is where Kira lives day-to-day — not a scaled-down desktop, but a purpose-built experience.

---

## 1. Platform

**React Native** (or Progressive Web App as fallback). Single codebase for iOS and Android. Shares API layer and design tokens with web.

---

## 2. Mobile-First Views (Priority Order)

| Priority | View | Why |
|----------|------|-----|
| 1 | **Chat** | Primary interaction. Voice-ready. Full conversation. |
| 2 | **Inbox** | Process input queue items with swipe gestures. Handle messages. |
| 3 | **Today** | See what's on the agenda. Check off tasks. |
| 4 | **Quick Capture** | Capture tasks from anywhere — widget, share sheet, shortcut. |
| 5 | **Command Center** | Condensed morning brief. Glanceable. |
| 6 | **Notifications** | Smart batched push notifications. |

---

## 3. Navigation: Bottom Tab Bar

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│   💬    │   📥    │   📋    │   🏠    │   ⋯     │
│  Chat   │  Inbox  │  Today  │  Home   │  More   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

- 56px height. iOS safe area bottom padding.
- Active: primary color icon + bold label. Inactive: gray.
- Badge counts on Inbox (pending items) and Chat (unread).
- "More" opens a bottom sheet: Operations (list view), Documents, Agents (status only), Settings.

---

## 4. What's NOT on Mobile

| Feature | Why Not |
|---------|---------|
| Timeline/Gantt | Too complex for small screens. View on desktop. |
| Knowledge Graph explorer | Spatial visualization needs large canvas. |
| Full Agent Monitor | Mobile shows agent status badges only. Full management on desktop. |
| Board View (Kanban) | Possible but lower priority. List view is more mobile-friendly. |
| Custom Dashboards | Widget builder is desktop. Glanceable summary in Command Center instead. |

---

## 5. Mobile Interaction Patterns

| Pattern | Where Used |
|---------|-----------|
| Swipe right | Mark done (Today), Approve (Inbox) |
| Swipe left | Quick actions menu |
| Pull-to-refresh | All list views |
| Long press | Context menu (move, priority, assign) |
| Bottom sheet | Filters, menus, quick add, more options |
| Push navigation | Tap item → new screen with back button |
| Swipe back | iOS-style left-edge swipe to go back |

---

## 6. Offline Behavior

Core data cached locally (today's tasks, recent inbox items, draft messages). Changes queued and synced when connection returns. Offline indicator in top bar. Tasks can be created and completed offline.

---

*Mobile is Kira's daily companion. Chat, Inbox, Today — the three views that keep you moving. Purpose-built, not scaled-down.*