# Iconography

> **Status:** ✅ DESIGNED | **Phase:** 0
> **Purpose:** Icon set selection, custom Kira concept icons, sizing, alignment, and emoji policy.

---

## 1. Icon Set: Lucide

**Primary icon set:** [Lucide](https://lucide.dev) — open source, consistent 24px grid, 1.5px stroke, MIT licensed.

**Why Lucide:** Clean geometric style matching Kira's minimal aesthetic. Active maintenance. React components available. Consistent stroke weight across all icons.

---

## 2. Icon Sizing Scale

| Size | Pixels | Stroke | Use |
|------|--------|--------|-----|
| xs | 14px | 1.5px | Inline text, badges |
| sm | 16px | 1.5px | Button icons, list items |
| md | 20px | 1.5px | Sidebar nav, card actions (default) |
| lg | 24px | 1.5px | Page headers, feature icons |
| xl | 32px | 2px | Empty states, onboarding |
| xxl | 48px | 2px | Hero illustrations, loading |

---

## 3. Kira Concept Icon Mapping

### Navigation
| Concept | Lucide Icon | Emoji Fallback |
|---------|-------------|----------------|
| Command Center | `LayoutDashboard` | 🏠 |
| Inbox | `Inbox` | 📥 |
| Chat | `MessageCircle` | 💬 |
| Operations | `ListChecks` | 📋 |
| Documents | `FileText` | 📄 |
| Knowledge | `Brain` | 🧠 |
| Dashboards | `BarChart3` | 📊 |
| Agents | `Bot` | 🤖 |
| Settings | `Settings` | ⚙️ |

### SOP Hierarchy
| Concept | Lucide Icon |
|---------|-------------|
| Vision | `Compass` |
| Area | `Layers` |
| Objective | `Target` |
| Project | `FolderKanban` |
| Task | `CircleCheck` |
| Milestone | `Diamond` |
| Key Result | `TrendingUp` |

### Task Metadata
| Concept | Lucide Icon |
|---------|-------------|
| Priority (critical) | `AlertCircle` (red) |
| Priority (high) | `ArrowUp` (orange) |
| Priority (medium) | `Minus` (yellow) |
| Priority (low) | `ArrowDown` (blue) |
| Due date | `Calendar` |
| Duration | `Clock` |
| Blocked | `Ban` |
| Dependency | `GitBranch` |

### Executor Types
| Concept | Icon |
|---------|------|
| Human | `User` |
| Agent | `Bot` |
| Ambiguous | `HelpCircle` |

### Input Queue Types
| Type | Lucide Icon | Color |
|------|-------------|-------|
| Verify | `CheckCircle` | Red |
| Decide | `Scale` | Yellow |
| Create | `Pen` | Green |
| Review | `Eye` | Blue |
| Classify | `Tags` | Gray |

### Channels
| Channel | Lucide Icon |
|---------|-------------|
| Email | `Mail` |
| WhatsApp | Custom (messaging icon variant) |
| Telegram | `Send` |
| Discord | Custom |
| System | `Bell` |

---

## 4. Emoji Policy

Emojis are used as **area identifiers only.** Each area gets a user-chosen emoji as its icon (e.g., 💜 AI Receptionist, 💚 Health, 💛 Relationships).

**Where emojis appear:** Area badges, sidebar area list, area view headers, breadcrumbs.

**Where emojis do NOT appear:** Buttons, status indicators, navigation icons (use Lucide instead).

---

## 5. Icon + Text Alignment

Icons always vertically center-align with adjacent text. Gap between icon and text: 8px (sm), 12px (md).

For icon buttons without text: include `aria-label` and tooltip on hover.

---

*Lucide provides the icon foundation. Emoji for area personality. Every Kira concept has a consistent, recognizable icon.*