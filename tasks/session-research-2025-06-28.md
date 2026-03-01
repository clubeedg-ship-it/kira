# Session Research: Text-to-Task Pipeline & Dynamic Dashboard

**Date:** 2025-06-28
**Purpose:** Use real IAM work session as case study to define how the system should actually work

---

## THE PROBLEM (observed today)

Otto received a WhatsApp message from a colleague with 5 IAM tasks. Today, Kira (me) manually:

1. **Parsed the message** → extracted 5 discrete tasks
2. **Classified each** → delegate (Randall/GA), research (cold emails, HubSpot), audit (WordPress), draft (email templates)
3. **Pre-digested work** → scanned interactivemove.nl, found plugins/analytics/stack, researched cold email tools, drafted templates
4. **Organized for QA** → structured what Otto just needs to approve vs what needs his input
5. **Identified blockers** → WP admin access needed, HubSpot account status unknown

**This entire workflow was manual and conversational.** The dashboard shows none of it. Sub-agents did none of it. Otto can't see the progress anywhere except this chat.

---

## WHAT SHOULD HAVE HAPPENED

### Step 1: Message Intake (text-to-task)
Message arrives → NLP extracts tasks → creates structured task objects in SQLite:

```
Input: "About IAM: Google Analytics on website -> Randall, Cold Emails Tool Setup..."
Output:
  Task 1: {title: "Set up Google Analytics", assignee: "Randall", project: "IAM", priority: P1}
  Task 2: {title: "Cold Emails Tool Setup", assignee: "Kira", project: "IAM", priority: P1}
  Task 3: {title: "Check website backend WordPress", assignee: "Kira", project: "IAM", priority: P2}
  Task 4: {title: "HubSpot form on website", assignee: "Kira", project: "IAM", priority: P1}
  Task 5: {title: "Send email templates to Hannelore", assignee: "Kira→Otto QA", project: "IAM", priority: P1}
```

### Step 2: Auto-triage & Sub-agent Dispatch
Kira's orchestrator looks at each task and decides:
- **Can be fully automated?** → spawn sub-agent, execute, put in QA queue
- **Needs research first?** → spawn researcher agent, gather data, produce recommendation
- **Needs human input?** → put in Otto's inbox with clear question
- **Delegation?** → draft message for Otto to send to the person

### Step 3: Sub-agents Execute
Each agent works its task. Real examples from today:

| Task | Agent Work | Output |
|------|-----------|--------|
| GA → Randall | Scan site, find GA already installed, draft message | Ready-to-send message for Randall |
| Cold Emails | Research tools, compare pricing, draft recommendation | Decision document: "Pick Saleshandy/Lemlist/Woodpecker" |
| WP Backend | Curl site, enumerate plugins/theme/versions, check security headers | Audit report with findings |
| HubSpot Form | Research integration methods for WP+HubSpot | Implementation plan |
| Email Templates | Draft 3 templates in Dutch for kindergarten outreach | Templates ready for QA |

### Step 4: Dashboard Shows Everything
Otto opens dashboard and sees:

**Operations tab:**
- 5 tasks from IAM, color-coded by status
- 3 completed by sub-agents (green, awaiting QA)
- 1 needs his decision (cold email tool choice)
- 1 blocked (WP access needed)

**Inbox tab:**
- "Approve cold email tool: Saleshandy €25/mo" [Approve] [Reject] [Discuss]
- "Review email templates for Hannelore" [Approve] [Edit] [Reject]
- "Send this message to Randall about GA?" [Send] [Edit]

**Agents tab:**
- Full transcript of each sub-agent's work
- What they searched, what they found, what they produced
- Time taken, tokens used

### Step 5: Heartbeat Retrieval
Every heartbeat, Kira checks:
- New messages that might contain tasks → extract them
- Sub-agent outputs → process and route to inbox/operations
- Stale tasks → alert Otto

---

## CURRENT STATE OF THE CODEBASE

### What Exists
1. **admin-dashboard/** — Monolithic HTML dashboard (port 3880)
   - Tabs: Overview, Agents, Outputs, Sessions, Token Usage, Logs, Services, Documents
   - Agent orchestrator (`agents/orchestrator.js`) — has agent definitions but no real dispatch
   - SQLite DB for agent_runs and agent_outputs
   - SSE streaming for live updates
   - No task/goal tables, no inbox, no operations view

2. **dashboard-copilot/** — React app ("Kira's Mind") with SSE
   - Shows episodes, blackboard, reflections, procedures
   - Not connected to task system

3. **design/dashboard/tasks-goals.md** — FULL spec for tasks & goals
   - Complete data models, views (List/Kanban/Calendar/Timeline)
   - Agent-powered task creation from conversations
   - Goal decomposition, OKR structure
   - SSE architecture, keyboard shortcuts
   - **This is the blueprint. It just hasn't been built.**

4. **design-v2/07-dashboard.md** — Platform UI spec
   - Sidebar navigation, pages, design system, routing
   - Overview, Chat, Tasks, Documents, Knowledge, Settings

5. **design-v2/10-tasks-goals.md** — Simplified schema (SQLite)
   - tasks table + goals table
   - Status: todo/in_progress/review/done

### What's Missing
1. **Task extraction from messages** — no NLP pipeline for text-to-task
2. **Dynamic inbox** — no "decisions awaiting Otto" queue
3. **Operations view** — no real-time task board populated by agents
4. **Sub-agent → task integration** — agents exist but don't create/update tasks
5. **Heartbeat task retrieval** — heartbeat doesn't check for new tasks from messages
6. **Agent transcript viewer** — can see sessions but not mapped to tasks

---

## SITE AUDIT DATA (from today's research)

### interactivemove.nl
- **Stack:** WordPress 6.x, PHP 8.2.30, Nginx, Plesk hosting
- **Theme:** Astra
- **Page Builder:** Elementor + Elementor Pro
- **Plugins detected:**
  - elementor, elementor-pro
  - elementskit-lite
  - google-site-kit (GA integration)
  - gtranslate (translation)
  - jet-engine, jet-menu (Crocoblock)
  - unlimited-elements-for-elementor-premium
  - woocommerce, woocommerce-payments
  - **HubSpot WP plugin v11.3.33 ALREADY INSTALLED** (Page Analytics tracking active)
- **GTM Container:** GTM-KPX78C22
- **GA:** Site Kit installed with consent mode (GDPR-compliant for EU regions)
- **SEO:** Yoast SEO v26.7
- **Security:** 
  - ❌ No Strict-Transport-Security header
  - ❌ No X-Frame-Options
  - ❌ No X-Content-Type-Options
  - ❌ No Content-Security-Policy
  - ✅ wp-json/users endpoint blocked (403)
  - ⚠️ Only permissions-policy header present
- **Caching:** No caching plugin detected (no wp-rocket, w3-total, etc.)
- **Sitemap:** Active via Yoast, 7 sub-sitemaps
- **Pages:** 32 indexed pages including products, blog, shop, catalog
- **Contact page:** `/contacts/` — has contact form (type unclear, possibly Elementor form)
- **Partner page:** `/be-a-partner/` — exists

### Cold Email Tools Research
| Tool | Price | Best For |
|------|-------|----------|
| Saleshandy | €25/mo | Unlimited accounts, A/B testing, lead DB |
| Lemlist | €29/mo | AI personalization, LinkedIn integration |
| Woodpecker | €40/mo | Simple B2B, CRM sync |
| Snov.io | Free-€39/mo | Email + LinkedIn combo |

**Recommendation:** Saleshandy for IAM (best value, kindergarten/school outreach focus)

### Email Templates
3 Dutch templates drafted (cold intro, follow-up, break-up) targeting schools/kindergartens. Stored in `tasks/iam-session-2025-06-28.md`.

---

## KEY DISCOVERY: HubSpot Already Installed!

The HubSpot WordPress plugin (v11.3.33) is ALREADY active on interactivemove.nl. The Page Analytics tracking snippet is present in the HTML. This means:
- An account already exists
- The plugin just needs form configuration, not installation
- Task simplifies from "install HubSpot" to "configure HubSpot form on contact pages"

---

## IMPLEMENTATION PRIORITIES FOR TONIGHT

### Phase 1: Data Layer (SQLite tables)
- tasks table (from design-v2/10-tasks-goals.md schema)
- goals table
- task_activities table (audit log)
- inbox_items table (decisions awaiting human)

### Phase 2: Task Extraction API
- POST /api/tasks/extract — takes raw text, returns structured tasks
- Uses LLM to parse natural language into task objects
- Confidence scoring for ambiguous items

### Phase 3: Dashboard Dynamic Views
- Replace hardcoded Operations with live task board
- Replace hardcoded Inbox with decision queue
- Add Agents tab with transcript viewer (via OpenClaw sessions API)

### Phase 4: Heartbeat Integration
- On heartbeat: check for new messages containing tasks
- Extract → create tasks → dispatch to agents → route outputs to inbox

### Phase 5: Sub-agent ↔ Task Bridge
- When agent spawned for a task, link session to task ID
- Agent updates task status as it works
- Agent outputs become inbox items for QA
