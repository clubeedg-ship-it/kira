# CEO Dashboard UI/UX Specification
*For Otto - Oopuo Command Center*

## Design Philosophy

**Core Principle:** One glance = full picture. Deep dive = one click away.

**Design Language:** 
- Catppuccin Mocha (consistent with Nexus OS)
- Information density over white space
- Real-time data streams
- Progressive disclosure

---

## Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  OOPUO COMMAND CENTER              [Kira Status] [Alerts: 2]   │
├─────────────────┬───────────────────┬───────────────────────────┤
│                 │                   │                           │
│   HEALTH        │   TODAY'S FOCUS   │   ACTIVE WORK             │
│   VITALS        │                   │                           │
│                 │   • Meeting 10am  │   📝 Pitch deck v3        │
│   💰 Cash: €XX  │   • Call with Y   │   🔄 SentinAgro research  │
│   📈 MRR: €XX   │   • Review Z      │   ✅ Email campaign       │
│   ⚡ Burn: €XX  │                   │                           │
│                 │                   │   [Kira: 3 agents active] │
├─────────────────┴───────────────────┴───────────────────────────┤
│                                                                 │
│   COMPANY CARDS (horizontally scrollable)                       │
│                                                                 │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│   │ZenithCred│ │SentinAgro│ │ OttoGen  │ │   IAM    │ →        │
│   │ 🟢 OK    │ │ 🟡 NEED  │ │ 🟢 OK    │ │ 🟢 OK    │          │
│   │ €XX rev  │ │ €XX rev  │ │ €XX rev  │ │ €XX rev  │          │
│   │ 3 tasks  │ │ 5 tasks  │ │ 2 tasks  │ │ 1 task   │          │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   KIRA ACTIVITY FEED (real-time)                                │
│                                                                 │
│   13:54 🔄 Research agent completed: multi-company-os           │
│   13:52 📝 Created input-output matrix                          │
│   13:51 ⬇️ GLM-4.7-Flash download: 15% complete                 │
│   13:45 🚀 Spawned 5 research agents                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Views

### 1. Command Center (Default)
- Health vitals (cash, revenue, burn)
- Today's schedule
- Active work streams
- Company status cards
- Kira activity feed

### 2. Financial View
- Full P&L by company
- Cash flow projections
- AR/AP aging
- Budget vs actual

### 3. Company Deep Dive
- Selected company metrics
- Active projects
- Team status
- Recent decisions

### 4. Strategy View
- OKR progress
- Competitive landscape
- Pipeline overview
- Resource allocation

### 5. Kira View
- Full conversation history
- Memory status
- Sub-agent monitoring
- Background tasks

---

## Interactions

### One-Click Actions
| Button | Action |
|--------|--------|
| 🔴 Alert badge | Jump to issue |
| Company card | Open deep dive |
| Task item | Mark complete / reschedule |
| Kira status | Open chat |
| Activity item | View details |

### Gestures (Mobile)
- Swipe left: Archive/complete
- Swipe right: Flag/prioritize
- Long press: Quick actions menu
- Pull down: Refresh data

### Keyboard Shortcuts (Desktop)
| Key | Action |
|-----|--------|
| `G + H` | Go to Home |
| `G + F` | Go to Financial |
| `G + C` | Go to Companies |
| `G + K` | Go to Kira |
| `/` | Command palette |
| `?` | Help |

---

## Data Sources

| Widget | Source | Refresh |
|--------|--------|---------|
| Cash | Banking API | 1 hour |
| Revenue | Stripe/CRM | Real-time |
| Tasks | Notion API | 5 min |
| Kira Activity | @chimera_activity_bot | Real-time |
| Company Status | Aggregated | 15 min |

---

## Alert System

### Severity Levels
| Level | Color | Sound | Persistence |
|-------|-------|-------|-------------|
| 🔴 Critical | Red | Yes | Until ack |
| 🟠 Warning | Orange | No | 24 hours |
| 🟡 Info | Yellow | No | 8 hours |
| 🟢 Success | Green | No | 1 hour |

### Alert Examples
- 🔴 Cash below 2-month runway
- 🔴 Major customer churn
- 🟠 Budget variance >20%
- 🟠 Sub-agent failed
- 🟡 Scheduled meeting in 15m
- 🟢 Pitch deck completed

---

## Technical Implementation

### Stack
- **Frontend:** Next.js 15 + React
- **Styling:** Tailwind + Catppuccin
- **Charts:** Recharts / D3
- **Real-time:** WebSocket
- **State:** Zustand
- **Deploy:** Cloudflare Pages

### API Integration
```typescript
// Data fetching pattern
const useDashboardData = () => {
  const { data: financial } = useSWR('/api/financial', fetcher, { refreshInterval: 3600000 })
  const { data: companies } = useSWR('/api/companies', fetcher, { refreshInterval: 900000 })
  const { data: kiraActivity } = useSWR('/api/kira/activity', fetcher, { refreshInterval: 5000 })
  
  return { financial, companies, kiraActivity }
}
```

---

## MVP Scope

### Phase 1 (Week 1)
- [ ] Basic layout with mock data
- [ ] Company cards
- [ ] Kira activity feed (from Telegram)
- [ ] Navigation

### Phase 2 (Week 2)
- [ ] Financial integrations
- [ ] Notion task sync
- [ ] Alert system
- [ ] Mobile responsive

### Phase 3 (Week 3)
- [ ] Deep dive views
- [ ] Real-time updates
- [ ] Keyboard shortcuts
- [ ] Polish

---

*This spec evolves with Otto's feedback*
