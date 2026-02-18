# Unified Inbox

> **Status:** ✅ DESIGNED | **Phase:** 1
> **Route:** `/inbox`
> **Purpose:** The single surface where ALL human attention goes. Merges external messages (email, WhatsApp, Telegram) with internal input queue (verify, decide, create items from agents).

---

## 1. Design Intent

This is where you spend 80% of your Kira time. Two streams converge here: messages from the outside world and decisions agents need from you. The UX must make processing these items **fast and satisfying** — like clearing a feed. Every item has a clear action. No item should require more than 2 clicks to resolve.

---

## 2. Layout — Desktop

```
┌──────────────────────────────────────────────────────────────────┐
│ SIDEBAR │              UNIFIED INBOX                             │
│         │                                                        │
│         │  ┌─ TOOLBAR ─────────────────────────────────────────┐ │
│         │  │ [All] [Input Queue] [Messages] │ 🔍 Search │ ⚙️  │ │
│         │  │ Filters: Area ▼  Priority ▼  Channel ▼  Status ▼ │ │
│         │  └───────────────────────────────────────────────────┘ │
│         │                                                        │
│         │  ┌─ LIST (45%) ────────┐  ┌─ DETAIL PANEL (55%) ────┐ │
│         │  │                     │  │                          │ │
│         │  │ ● 🔴 VERIFY        │  │  Research: Best email    │ │
│         │  │   Research: Best    │  │  platform for Client X   │ │
│         │  │   email platform    │  │                          │ │
│         │  │   research-agent    │  │  Agent: research-agent   │ │
│         │  │   2h ago            │  │  Project: Client X Email │ │
│         │  │                     │  │  Created: 2h ago         │ │
│         │  │   🟡 DECIDE        │  │                          │ │
│         │  │   Pricing: 3 opts   │  │  ── DELIVERABLE ──────  │ │
│         │  │   for receptionist  │  │  [Inline markdown/PDF    │ │
│         │  │   comms-agent       │  │   preview of the         │ │
│         │  │   5h ago            │  │   research output]       │ │
│         │  │                     │  │                          │ │
│         │  │   💬 MESSAGE        │  │                          │ │
│         │  │   📧 Jan from       │  │  ── ACTIONS ──────────  │ │
│         │  │   Dental Practice   │  │  [✅ Approve] [✏️ Edit]  │ │
│         │  │   "Following up..." │  │  [🔄 Redo] [❌ Dismiss]  │ │
│         │  │   1d ago            │  │                          │ │
│         │  │                     │  │                          │ │
│         │  │   🟢 CREATE        │  │                          │ │
│         │  │   Call: Follow up   │  │                          │ │
│         │  │   with dentist lead │  │                          │ │
│         │  │   Scheduled: 14:00  │  │                          │ │
│         │  │                     │  │                          │ │
│         │  └─────────────────────┘  └──────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Toolbar

### 3.1 Stream Tabs

| Tab | Filter | Badge |
|-----|--------|-------|
| **All** | No filter — interleaved by priority then recency | Total pending count |
| **Input Queue** | `queue_type IN (verify, decide, create, classify)` | Queue pending count |
| **Messages** | External messages only (email, WhatsApp, Telegram, Discord) | Unread count |

Active tab has `--primary-400` underline (2px) with `--duration-fast` transition.

### 3.2 Filters

Dropdown filters, multi-select. Applied with AND logic:

| Filter | Options | Source |
|--------|---------|--------|
| Area | List of active areas | `GET /api/v1/areas` |
| Priority | Critical, High, Medium, Low | Static |
| Channel | Input Queue, Email, WhatsApp, Telegram, Discord | Static |
| Status | Pending, Scheduled, Snoozed | Static |
| Type | Verify, Decide, Create, Classify, Message | Static |
| Agent | List of agents (for input queue items) | `GET /api/v1/agents` |

Active filters shown as dismissible chips below the filter bar.

### 3.3 Search

Full-text search across item titles, descriptions, message content. Debounced (300ms). Results highlighted with `--accent-400` background.

### 3.4 Batch Actions Menu (⚙️)

- "Approve all verify items" — resolves all visible verify items
- "Snooze all until tomorrow" — reschedules pending items
- "Mark all messages read"
- "Dismiss stale items (> 7 days)"

Confirmation dialog required for batch actions affecting > 5 items.

---

## 4. List Panel (Left)

### 4.1 Item Card Anatomy

```
┌──────────────────────────────────────────┐
│ ● 🔴  Research: Best email platform      │  ← Type badge + title
│       for dental practices               │
│                                          │
│ 🤖 research-agent  │  📋 Client X Email  │  ← Agent + project
│ ██ Health area      │  2h ago            │  ← Area color bar + time
│                              [✅] [❌]   │  ← Quick actions (hover)
└──────────────────────────────────────────┘
```

**Type Badge (left dot):**
| Type | Color | Icon |
|------|-------|------|
| Verify | `--error` (red) | 🔴 |
| Decide | `--warning` (amber) | 🟡 |
| Create | `--success` (green) | 🟢 |
| Classify | `--text-tertiary` (gray) | ⚪ |
| Message | Channel icon (📧/💬/etc.) | — |

**Quick Actions (appear on hover):**
- Verify: [✅ Approve] [❌ Dismiss]
- Decide: Option buttons appear inline
- Create: [✅ Done] [📅 Reschedule]
- Message: [↩️ Reply] [📌 Pin]

**States:**
- Default: `--bg-surface`
- Hover: `--bg-overlay`
- Selected (active in detail panel): `--bg-overlay` + left border `--primary-400`
- Unread: Title in `--font-semibold`, subtle dot indicator

### 4.2 Sorting

Default sort: Priority (critical first) → then recency (newest first).

Alternative sorts (toggle in toolbar): Recency only, Area grouping, Type grouping.

### 4.3 Grouping

When filtered by type, items group under section headers:
```
── 🔴 VERIFY (3) ──────────────────
   [items]
── 🟡 DECIDE (1) ──────────────────
   [items]
── 🟢 CREATE (2) ──────────────────
   [items]
```

---

## 5. Detail Panel (Right)

### 5.1 Layout

```
┌──────────────────────────────────────────┐
│ TYPE BADGE          [← Back] [⋮ Menu]    │  ← Header
├──────────────────────────────────────────┤
│                                          │
│ Research: Best email platform for        │  ← Title (H2)
│ dental practices                         │
│                                          │
│ 🤖 research-agent  │  📋 Client X Email  │  ← Metadata row
│ Area: AI Recept.   │  Priority: High     │
│ Created: 2h ago    │  Due: Tomorrow      │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│ DESCRIPTION                              │  ← Agent's explanation
│ "I compared 5 email platforms for        │
│  dental practices. Here's my analysis    │
│  with pricing, features, and my          │
│  recommendation."                        │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│ DELIVERABLE                              │  ← Inline preview
│ ┌──────────────────────────────────────┐ │
│ │  📄 email-platform-comparison.md     │ │
│ │  [Rendered markdown preview]         │ │
│ │  ...                                 │ │
│ │  [Open full screen ↗]               │ │
│ └──────────────────────────────────────┘ │
│                                          │
├──────────────────────────────────────────┤
│                                          │
│ ACTIONS                                  │
│ [✅ Approve]  [✏️ Edit & Approve]        │
│ [🔄 Redo with notes]  [❌ Dismiss]       │
│                                          │
│ Optional: Add comment before approving   │
│ ┌──────────────────────────────────────┐ │
│ │ Add a note...                        │ │
│ └──────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

### 5.2 Type-Specific Detail Views

**VERIFY:**
- Shows deliverable inline (markdown rendered, PDF embedded, image displayed)
- Actions: Approve, Edit & Approve (opens editor), Redo (with notes field), Dismiss
- Approve → task.status = 'done', input_queue.status = 'resolved'

**DECIDE:**
- Shows options as selectable cards (radio-style)
- Each option card: title, description, pros/cons (if agent provided them)
- Actions: Select option (→ resolution), "Need more info" (→ agent re-researches), Defer
- Select → input_queue.resolution = chosen option, task continues

**CREATE:**
- Shows context: linked task, relevant documents, related conversations
- Scheduled time block highlighted
- Actions: Done (mark task complete), Reschedule (date picker), Delegate (assign to agent)

**CLASSIFY:**
- Shows the ambiguous task title and source
- Actions: "Agent can draft" (→ executor_type='agent'), "I'll do it" (→ executor_type='human'), "Split it" (→ decompose into sub-tasks)

**MESSAGE:**
- Shows full message thread with sender info, channel icon
- Reply composer at bottom with channel selector (reply via same channel or different)
- Extract actions: "Create task from this", "Add to calendar", "Link to project"

---

## 6. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `↓` | Next item in list |
| `k` / `↑` | Previous item in list |
| `a` | Approve / Accept (verify/decide primary action) |
| `d` | Dismiss |
| `r` | Reply (messages) / Redo (verify items) |
| `s` | Snooze → opens date picker |
| `e` | Edit & Approve |
| `Enter` | Open selected item in detail panel |
| `Escape` | Close detail panel / Clear filters |
| `1-4` | Select option 1-4 (decide items) |
| `/` | Focus search bar |
| `Cmd+A` | Select all visible (for batch actions) |

Keyboard shortcut hint bar at bottom of screen (dismissible, shown first 5 uses).

---

## 7. Layout — Mobile (< 768px)

Full-screen list. Tapping an item opens full-screen detail (pushes list off-screen). Swipe gestures for quick actions.

```
┌─────────────────────────┐
│ 📥 Inbox  [🔍] [⚙️]    │  ← Header with search + filter toggle
│ [All] [Queue] [Messages]│  ← Stream tabs (scrollable)
├─────────────────────────┤
│                         │
│ ● 🔴 VERIFY            │  ← Card
│   Research: Best email  │     Swipe right → Approve ✅
│   platform for dental   │     Swipe left  → Dismiss ❌
│   research-agent · 2h   │
│                         │
│ ● 🟡 DECIDE            │
│   Pricing: 3 options    │
│   comms-agent · 5h      │
│                         │
│ ● 💬 📧 MESSAGE         │
│   Jan from Dental       │
│   "Following up on..."  │
│   1d ago                │
│                         │
├─────────────────────────┤
│ 💬 Chat │ 📥 │ 📋 │ •••│  ← Bottom nav
└─────────────────────────┘
```

Swipe gestures:
- **Swipe right:** Primary action (Approve for verify, Done for create)
- **Swipe left:** Secondary action (Dismiss/Snooze)
- **Tap:** Open full-screen detail

Swipe reveals colored action zone: green (right/approve) or red (left/dismiss) with icon.

---

## 8. Empty State

```
┌─────────────────────────────────────────────┐
│                                             │
│              ✨ All clear!                   │
│                                             │
│  Nothing needs your attention right now.    │
│  Your agents are working on 3 tasks.        │
│                                             │
│  [View agent status →]                      │
│  [Start a new task →]                       │
│                                             │
└─────────────────────────────────────────────┘
```

Subtle celebration: Kira Glow + checkmark animation. This is the "inbox zero" moment.

---

## 9. Real-Time Behavior

| SSE Event | Action |
|-----------|--------|
| `INPUT_QUEUE_ITEM_ADDED` | Prepend new item to list (slide-in animation from top). Badge count +1. |
| `INPUT_QUEUE_ITEM_RESOLVED` | Remove item from list (fade-out). Badge count -1. |
| `MESSAGE_RECEIVED` | Prepend to messages. If thread exists, update thread count. |
| `AGENT_STATUS_CHANGED` | Update agent attribution on relevant items. |

---

## 10. Data Loading

**Endpoint:** `GET /api/v1/views/inbox?tab=all&limit=50&offset=0`

Supports pagination (infinite scroll). Returns interleaved input_queue + messages sorted by priority + recency.

**Response shape:**
```json
{
  "items": [
    {
      "id": "abc123",
      "source": "input_queue",
      "queue_type": "verify",
      "title": "Research: Best email platform",
      "description": "...",
      "agent": { "id": "...", "name": "research-agent" },
      "project": { "id": "...", "title": "Client X Email" },
      "area": { "id": "...", "name": "AI Receptionist", "color": "--area-4" },
      "priority": 1,
      "deliverable": { "path": "/vdr/research/...", "type": "markdown" },
      "status": "pending",
      "created_at": "2026-02-18T08:30:00Z"
    },
    {
      "id": "def456",
      "source": "message",
      "channel": "email",
      "sender": { "name": "Jan", "email": "jan@dental.nl" },
      "subject": "Following up on our meeting",
      "preview": "Hi, I wanted to follow up on...",
      "thread_count": 3,
      "is_unread": true,
      "created_at": "2026-02-17T14:22:00Z"
    }
  ],
  "counts": { "total": 12, "input_queue": 7, "messages": 5, "unread": 3 }
}
```

---

*The Inbox is your control surface. Every item has a clear action. Process it like a feed — top to bottom, one action per item, and celebrate inbox zero when you get there.*
