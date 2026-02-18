# Kira Dashboard Polish Checklist
*Prepared: 2026-02-14 09:00 UTC — for Otto's focused session*

## Current State
- **Stack:** Vanilla JS, single `index.html` (3,666 lines), `server-v2.js` on port 3847
- **Status:** Running (PM2 `kira-dashboard`, online 10h, 109 restarts)
- **URL:** app.zenithcred.com

## Known Issues & Polish Items

### 🔴 Critical (from Feb 13 incident)
- [ ] **JS crash guard** — Add try/catch around all render functions to prevent total lockout (Feb 13: undefined var crashed everything)
- [ ] **Error boundary** — If a page fails to render, show error + fallback instead of blank screen

### 🟡 Persistent Views / State
- [ ] **Page persistence** — `localStorage.setItem('kira-page')` exists but verify it works on refresh for ALL pages
- [ ] **Scroll position persistence** — Long pages (tasks, docs) should remember scroll position
- [ ] **Chat history persistence** — Verify chat messages survive page navigation
- [ ] **Filter/sort state** — Task filters, VDR sort order should persist

### 🟡 UI Consistency
- [ ] **Nav styling** — Ensure all nav items have consistent hover/active states
- [ ] **Card styling** — Overview cards, task cards, VDR cards — same border-radius, shadows, spacing
- [ ] **Typography** — Consistent font sizes, weights across all pages
- [ ] **Color palette** — Dark theme consistency (no mismatched grays/blues)
- [ ] **Loading states** — All async pages should show spinners, not blank content
- [ ] **Empty states** — What shows when tasks/docs/memory is empty?

### 🟡 Pages to Verify
- [ ] **Overview** — Stats accuracy, live data, layout
- [ ] **Tasks/Kanban** — Drag-drop, create, edit, status changes
- [ ] **Goals** — CRUD, progress tracking
- [ ] **Documents** — Create, edit, folder nav, markdown preview
- [ ] **VDR** — File browsing, viewer, search
- [ ] **Memory** — File listing, content viewing
- [ ] **Services** — PM2 status display
- [ ] **Chat/Scratchpad** — Message send/receive, streaming
- [ ] **Settings** — Profile, preferences

### 🟢 Polish
- [ ] **Responsive** — Mobile/tablet layout
- [ ] **Splash page** — Login flow smooth, branding aligned
- [ ] **Animations** — Smooth transitions between pages
- [ ] **Keyboard shortcuts** — Any needed?

### ⚙️ Infrastructure
- [ ] **109 restarts** — Why so many? Check PM2 logs for crash patterns
- [ ] **Auth flow** — Token refresh working? Edge cases?
- [ ] **API error handling** — Graceful degradation on server errors

## Quick Commands
```bash
# View dashboard
open https://app.zenithcred.com

# Check logs
pm2 logs kira-dashboard --lines 50

# Restart after changes
cp index.html public/index.html && pm2 restart kira-dashboard

# Check restart reasons
pm2 logs kira-dashboard --err --lines 20
```
