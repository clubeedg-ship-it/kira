# 21 — Onboarding Experience Design

> Kira Platform · Internal Design Spec · v1.0
> Last updated: 2026-02-12

---

## Table of Contents

1. [Splash Page Experience](#1-splash-page-experience)
2. [Signup Flow](#2-signup-flow)
3. [The "Wow" Onboarding](#3-the-wow-onboarding)
4. [NLP Graph Layer](#4-nlp-graph-layer)
5. [Demo Animation Spec](#5-demo-animation-spec)
6. [Gamification System Design](#6-gamification-system-design)
7. [Post-Onboarding Retention](#7-post-onboarding-retention)

---

## 1. Splash Page Experience

### Design Goal
Unauthenticated users land at the same URL as the app. They must understand what Kira does in under 3 seconds, see it in action within 10 seconds, and feel compelled to sign up within 30 seconds.

### Layout (Top to Bottom)

#### Hero Section (Above the Fold)

**Headline:**
> "Talk to Kira. She builds your life plan."

**Subheadline:**
> "An AI that listens to your goals, extracts tasks, tracks progress, and works while you sleep. Not a chatbot. A life operating system."

**CTA Buttons:**
- Primary: `Start Free →` (purple gradient, glows on hover)
- Secondary: `Watch it work ↓` (ghost button, scrolls to demo)

**Background:** Dark (#0A0A0F), subtle particle field drifting slowly. Purple/blue gradient orb pulses behind the headline like a living thing.

#### Live Demo Animation (Immediately Below Hero)

Full-width container, 600px tall. The animation auto-plays on scroll-into-view. Detailed spec in [Section 5](#5-demo-animation-spec).

Summary of what the viewer sees:
1. A chat interface appears. Someone types "I'm building a SaaS product..."
2. Text gets parsed — entities highlight and float out as tags
3. A dashboard materializes: goals populate, progress rings appear, health colors light up
4. A knowledge graph grows with nodes and edges
5. Final state: a complete, organized life dashboard

#### "How It Works" — 3 Steps

Three columns, each with an icon animation and one sentence:

| Step | Icon | Title | Description |
|------|------|-------|-------------|
| 1 | 🎙️ Waveform animation | **Talk** | "Tell Kira what you're working on. Voice or text. Just talk naturally." |
| 2 | 🧠 Graph growing animation | **Extract** | "Kira identifies goals, tasks, people, deadlines — and organizes everything." |
| 3 | 📊 Dashboard populating animation | **Execute** | "Track progress, get nudges, and let Kira work in the background." |

Each icon animates when scrolled into view. Subtle, 2-second loops.

#### Social Proof Section (Phase 2)

Placeholder structure:
- Metric bar: `X users · Y goals tracked · Z tasks completed`
- 3 testimonial cards (avatar, quote, name/role)
- Logo bar of companies/communities (when available)

#### Footer CTA

Repeat the hero CTA:
> "Your AI is waiting. Start building."
> `Start Free →`

---

## 2. Signup Flow

### Target: 30 seconds from click to inside the app.

#### Option A: Social Login (preferred path)

```
[Start Free →]
  → Modal overlay (not a page redirect)
  → "Continue with Google" (primary, full-width)
  → "Continue with GitHub" (secondary)
  → Divider: "or use email"
  → Email input + "Continue" button
```

Social login = one click → account created → straight to onboarding. No email verification needed.

#### Option B: Email Signup

```
Step 1: Email + Password (single form)
  → Email field (auto-focus)
  → Password field (min 8 chars, show/hide toggle)
  → "Create Account" button
  
Step 2: 6-digit verification
  → "Check your email" screen
  → 6 input boxes for the code (auto-advance on digit entry)
  → "Resend code" link (greyed out for 30s)
  → Auto-submits when 6th digit entered
```

#### Post-Auth Redirect

Both paths land on the same place: the onboarding experience (Section 3). No "welcome" interstitial. No "choose your plan." Straight into the magic.

#### Technical Notes
- Auth via Supabase (already integrated)
- Session token stored in httpOnly cookie
- Social providers: Google OAuth 2.0, GitHub OAuth
- Email verification: Supabase built-in, customized template
- Rate limit: 3 signup attempts per IP per hour

---

## 3. The "Wow" Onboarding

### Design Philosophy

This is the product demo, the aha moment, and the setup wizard — all in one. The user should feel like they're talking to something intelligent that *gets them*. Not filling out forms.

Total time: 3-5 minutes. Five steps.

---

### Step 1: "Tell Me About Yourself"

**Screen layout:**
- Full-screen dark background with subtle gradient
- Kira's avatar (animated, breathing/pulsing) centered at top
- Large text below: **"What are you working on right now?"**
- Subtext: *"Talk naturally. I'll figure out the rest."*
- Two input options:
  - 🎙️ **Voice button** (large, prominent, pulsing ring animation) — default/encouraged
  - ⌨️ **Text area** (below, smaller) — "Or type if you prefer"

**Voice Input Behavior:**
- User taps mic → recording starts
- Real-time waveform visualization around Kira's avatar
- Transcription appears in real-time below the waveform (streaming STT)
- No time limit, but after 30s of silence: "Anything else? Or should I work with this?"

**Text Input Behavior:**
- Large textarea, auto-expanding
- Placeholder text cycles through examples:
  - *"I'm launching a startup and need to..."*
  - *"I want to get in shape but I keep..."*
  - *"My business is growing but I can't keep track of..."*
- Submit button: "Let Kira process this →"

**The NLP Visualization (Critical UX Element):**

While the user is talking/typing, a side panel (or overlay on wider screens) shows real-time extraction:

```
┌─────────────────────────────────────────────┐
│  🧠 Kira is listening...                    │
│                                              │
│  Entities Found:                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ 🏢 SaaS  │ │ 👤 Mike  │ │ 🛠 React │    │
│  │ product  │ │ (cofounder)│ │          │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│  Goals Detected:                             │
│  ◉ Launch MVP by March                       │
│  ◉ Hire two developers                       │
│  ◉ Close seed round                          │
│                                              │
│  Tasks Forming:                              │
│  ○ Design landing page                       │
│  ○ Write investor pitch deck                 │
│  ○ Set up CI/CD pipeline                     │
│  ○ ...extracting more                        │
│                                              │
│  Knowledge Graph:                            │
│  [animated mini-graph with nodes appearing]  │
└─────────────────────────────────────────────┘
```

**Animation details:**
- Each entity/goal/task fades in with a subtle glow as it's extracted
- Entity tags use category-specific colors: people (blue), companies (purple), tools (green), concepts (orange)
- The mini knowledge graph at the bottom shows nodes appearing and edges connecting in real-time
- Particles flow from the transcript text toward the extraction panel

**Transition trigger:** User clicks "Done" or Kira detects a natural stopping point (>10s silence in voice mode, or user submits text).

**Kira responds:** "Got it. Let me show you what I see." → 1.5 second pause with processing animation → transition to Step 2.

---

### Step 2: "Here's Your Life Plan"

**Transition Animation (2 seconds):**
1. The chat interface shrinks and slides left
2. The extraction panel expands to fill the screen
3. Entities reorganize into a dashboard layout
4. Progress rings inflate from 0
5. Color health indicators light up

**Dashboard State After Transition:**

The user sees a fully populated dashboard with data extracted from what they just said:

**Goal Hierarchy (left panel):**
```
🔭 VISION (1-3 items)
├── "Build a successful SaaS company"
│
📅 THIS QUARTER (2-4 items)  
├── "Launch MVP"
├── "Secure funding"
│
📆 THIS MONTH (3-5 items)
├── "Complete landing page"
├── "Finish pitch deck"  
├── "Hire first developer"
│
📋 THIS WEEK (5-8 items)
├── "Design homepage mockup"
├── "Draft executive summary"
├── "Post job listing"
├── "Set up analytics"
├── "Review competitor pricing"
```

**Each goal shows:**
- Progress ring (0% — empty but styled, ready to fill)
- Health color indicator (green — freshly set, full runway)
- Deadline (inferred or marked as "unset — tap to add")
- Task count badge: "0/5 tasks done"

**Right panel — Knowledge Graph:**
- Interactive force-directed graph
- Nodes: entities extracted (people, companies, tools, concepts)
- Edges: relationships ("works with", "uses", "wants to", "blocked by")
- Nodes glow on hover, show detail tooltip
- Graph has subtle ambient animation (nodes breathe, edges pulse)

**Bottom bar — Stats Preview:**
```
Velocity: —  |  Streak: Day 1 🔥  |  Goals: 4  |  Tasks: 12  |  Health: 🟢 All Green
```

**Kira's message (overlay toast, bottom-right):**
> "I extracted 4 goals and 12 tasks from our conversation. Everything look right? You can adjust anything."

**User reaction target:** *"Holy shit, it understood everything."*

---

### Step 3: "Customize Your Plan"

**Tutorial overlay — coach marks, not a modal.**

Five coach marks appear sequentially (user clicks "Next" or taps highlighted area):

**Mark 1: Goal Nesting**
- Highlights the goal hierarchy
- Tooltip: "Your goals are organized from vision (big picture) down to this week's tasks. Tap any goal to drill in."
- Arrow pointing at the hierarchy tree

**Mark 2: Drag & Drop**
- Highlights a task
- Tooltip: "Drag tasks between goals or reorder priorities. Everything updates automatically."
- Animated ghost showing a task being dragged

**Mark 3: Health Colors**
- Highlights a health indicator
- Tooltip: "Green = on track. Yellow = falling behind. Red = will miss deadline at current pace. Kira calculates this automatically."
- Shows a color swatch: 🟢 → 🟡 → 🟠 → 🔴

**Mark 4: Progress Rings**
- Highlights a progress ring
- Tooltip: "Complete subtasks → task fills up → goal fills up → project fills up. Everything rolls up."
- Animated ring filling from 0% to ~40%

**Mark 5: Talk to Kira**
- Highlights the chat/voice input
- Tooltip: "Anytime you want to update your plan, just talk to Kira. 'Add a task', 'I finished X', 'Push the deadline' — she handles it."
- Mic icon pulses

**After last mark:** Coach marks fade. Dashboard is fully interactive. A subtle prompt appears:
> "Try completing a task — tap any checkbox."

When user taps a checkbox:
- Satisfying animation: checkmark draws, ring fills, confetti micro-burst
- Velocity counter ticks: `Velocity: 1`
- Toast: "Nice. That's how progress works here."

---

### Step 4: "Your AI Is Now Working"

**Timing:** Appears 3 seconds after Step 3 completes.

**UI Element:** Sub-agent panel slides in from the right (or bottom on mobile). Dark panel with activity feed:

```
┌─────────────────────────────────────────────┐
│  🤖 Kira is working...                      │
│                                              │
│  ✅ Created your goal hierarchy              │
│  ⏳ Researching "SaaS pricing models"...     │
│     └─ Reading 3 sources...                  │
│  ⏳ Breaking down "Launch MVP" into steps... │
│     └─ Generating 8 subtasks...              │
│  ⏳ Setting up your daily check-in...        │
│     └─ Tomorrow at 9:00 AM                   │
│  🔄 Building your knowledge graph...         │
│     └─ 12 entities, 8 relations indexed      │
│                                              │
│  [Live typing indicator dots]                │
└─────────────────────────────────────────────┘
```

**Animation:**
- Each line appears with a typewriter effect
- Spinner icons animate
- Progress dots pulse
- After ~5 seconds, first task completes: spinner → ✅
- Research results start appearing as expandable cards

**Kira message:**
> "I'm already working on your stuff. Some results will be ready in minutes, others by tomorrow. I don't stop."

**Key psychological impact:** The user sees their AI doing real work immediately. Not "getting set up" — actually researching, planning, organizing. The AI is productive from minute one.

---

### Step 5: "Come Back Tomorrow"

**Screen:** Soft transition — dashboard dims slightly, focus overlay appears.

**Content:**

```
┌─────────────────────────────────────────────┐
│                                              │
│          🔥 Day 1                            │
│                                              │
│   Your streak starts now.                    │
│                                              │
│   Tomorrow morning, Kira will send you:      │
│   📋 Your personalized daily plan            │
│   📊 Updates from tonight's background work  │
│   💡 Insights from your knowledge graph      │
│                                              │
│   ┌──────────────────────────────────┐       │
│   │ 🔔 Enable notifications          │       │
│   │                                  │       │
│   │ ○ Push notifications (recommended)│       │
│   │ ○ Email digest                   │       │
│   │ ○ Both                           │       │
│   └──────────────────────────────────┘       │
│                                              │
│   "I'll have updates for you.                │
│    Check your dashboard or just text me."    │
│                                              │
│         [ Go to Dashboard → ]                │
│                                              │
└─────────────────────────────────────────────┘
```

**Gamification preview (bottom of screen):**
```
Day 1 of building "a successful SaaS company"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 0.3%
                                          ↑ you are here

Keep the streak alive. Come back tomorrow.
```

**After clicking "Go to Dashboard":**
- Full dashboard loads
- Sub-agent panel stays visible (still working)
- A small persistent banner: "Onboarding complete. Talk to Kira anytime."

---

## 4. NLP Graph Layer

### Architecture Overview

The NLP Graph Layer is the intelligence backbone of Kira. Every word the user says becomes structured, searchable, connected knowledge.

### Pipeline Flow

```
User Input (voice/text)
       │
       ▼
┌─────────────────────┐
│  Enrichment Proxy   │  Port 3850 (PM2: msg-proxy)
│  ─────────────────  │
│  1. Typo correction │  (qwen2.5-coder:14b via Ollama)
│  2. Intent classify │
│  3. Context inject  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Entity Extraction  │  (qwen2.5-coder:14b via Ollama)
│  ─────────────────  │
│  • People           │
│  • Companies        │
│  • Tools/Tech       │
│  • Concepts         │
│  • Dates/Deadlines  │
│  • Goals            │
│  • Tasks            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Relation Mapping   │
│  ─────────────────  │
│  Entity A ──rel──▶ Entity B     │
│  "Otto" ──builds──▶ "Kira"     │
│  "MVP" ──deadline──▶ "March"   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Storage Layer      │
│  ─────────────────  │
│  SQLite: unified.db │
│  • entities table   │
│  • relations table  │
│  • facts table      │
│  • embeddings       │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Embedding Gen      │  (nomic-embed-text via Ollama)
│  ─────────────────  │
│  768-dim vectors    │
│  Cosine similarity  │
│  Semantic search    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Context Retrieval  │
│  ─────────────────  │
│  Top-K relevant     │
│  entities + facts   │
│  injected into      │
│  Kira's next prompt │
└─────────────────────┘
```

### Current Scale
- **9,600+ entities** extracted and categorized
- **10,500+ relations** mapped between entities
- **19,000+ facts** stored with confidence scores
- **Auto-maintenance**: dedup, normalization, confidence decay every 2 hours

### Graph Sync Daemon (PM2: graph-sync)
- Runs continuously
- Watches for new messages
- Extracts entities/relations in real-time
- Writes to unified.db
- Updates embeddings incrementally

### Onboarding Visualization

During onboarding (Step 1), the NLP pipeline runs in real-time on the user's input. The visualization shows:

1. **Raw text** → highlighted entities (color-coded by type)
2. **Entities** → appearing as nodes in a mini force-directed graph
3. **Relations** → edges drawing between nodes with labeled connections
4. **Facts** → populating a scrolling feed ("Kira learned: Otto is building a SaaS product")

This isn't decorative. It's the actual pipeline running, visualized. The extraction results directly populate the dashboard in Step 2.

### New User Graph Bootstrap

For a new user, the graph starts empty. After the onboarding conversation:
- Expected: 15-40 entities, 10-30 relations, 20-50 facts
- This is enough to power meaningful context retrieval from day 1
- Graph grows exponentially with daily usage — by day 30, typically 500+ entities
- By day 90, the AI's context window is dramatically richer than day 1

---

## 5. Demo Animation Spec

### Splash Page Version (30-45 seconds)

Built as HTML/CSS/JS using the `live_animation` system. Dark theme (#0A0A0F background), purple (#8B5CF6) and blue (#3B82F6) accents. All transitions use cubic-bezier easing. Particle effects via canvas overlay.

#### Scene 1: The Conversation (0s–10s)

**0.0s** — Fade in: a minimal chat interface, centered. Dark card on dark background. Cursor blinks in the input field.

**1.0s** — Text types in (typewriter effect, 40ms per character):
> "I'm building a SaaS product for small businesses. Need to launch the MVP by March, hire two devs, and close our seed round. My cofounder Mike handles engineering but I'm drowning in everything else."

**1.0s–6.0s** — Text types. As it does:
- Key phrases highlight with a subtle purple underline as they're "detected"
- At 2.5s: "SaaS product" highlights → entity tag floats up and right
- At 3.5s: "March" highlights → deadline tag appears
- At 4.5s: "Mike" highlights → person tag appears
- At 5.5s: "seed round" highlights → goal tag appears

**6.0s–7.0s** — Brief pause. A processing indicator pulses below the text: "Kira is thinking..."

#### Scene 2: The Extraction (7s–15s)

**7.0s** — Chat interface smoothly slides left (40% width). Right side reveals an extraction panel.

**7.5s–12.0s** — Extraction panel populates with staggered fade-ins (200ms between items):

```
Goals:
  ◉ Launch MVP → March        [green health dot]
  ◉ Hire two developers       [green health dot]
  ◉ Close seed round          [green health dot]

Tasks:
  ○ Design product landing page
  ○ Write investor pitch deck
  ○ Post job listings
  ○ Set up development pipeline
  ○ Create financial projections
  ... +4 more
  
Entities:
  🏢 SaaS Product  👤 Mike (cofounder)  📅 March
```

**12.0s–15.0s** — Entities start connecting. Thin lines draw between related items (SVG path animation). A mini knowledge graph forms in the corner.

#### Scene 3: The Dashboard (15s–30s)

**15.0s** — Smooth morph transition. The extraction panel reorganizes:
- Goals move into a sidebar hierarchy
- Tasks flow into a kanban-style board
- Progress rings inflate around each goal (starting at 0%)
- Health color dots are already green

**18.0s** — One task gets checked. Satisfying animation:
- Checkbox fills with purple
- Checkmark draws in white
- Progress ring for parent goal ticks from 0% to 8%
- Micro-confetti burst (6-8 particles, purple/blue)
- Velocity counter appears: `⚡ 1`

**20.0s** — The "Red Line" chart draws in:
- X-axis: time (weeks)
- Two lines animate drawing left to right:
  - Purple line (actual): starts at origin
  - Gray dashed line (target): steady slope toward the goal
- A small gap between them — "you're slightly ahead" indicator

**23.0s** — Knowledge graph expands to show 8-10 nodes with connections. Subtle glow effect. Nodes drift gently.

**25.0s** — Sub-agent activity feed slides in from bottom:
- "Researching SaaS pricing models..."
- "Breaking down MVP into 12 subtasks..."
- Typing indicator dots pulse

**28.0s–30.0s** — Everything settles. A final message fades in over the dashboard:
> "Talk → Extract → Execute → Results."

**30.0s** — Subtle call to action pulses: `Start Free →`

#### Animation Technical Notes

- **Framework:** Vanilla JS + CSS animations + SVG for graphs
- **Canvas:** Background particle system (100-200 particles, low opacity, slow drift)
- **Easing:** `cubic-bezier(0.4, 0, 0.2, 1)` for all transitions
- **Typography:** Inter or system font, no web font blocking
- **Performance target:** 60fps on mid-range devices, graceful degradation
- **Intersection Observer:** Animation starts on scroll-into-view, replays once
- **Reduced motion:** Respects `prefers-reduced-motion` — shows static screenshots instead

### Onboarding Version (60-90 seconds)

Same core animation but:
- Uses the **user's actual data** from Step 1 instead of demo data
- Plays during the Step 1 → Step 2 transition
- Takes longer because it's building a real dashboard, not a demo
- More detail in the knowledge graph (shows all extracted entities)
- Each element is interactive after it appears (not just visual)

---

## 6. Gamification System Design

### Philosophy

Not badges. Not leaderboards. Not dopamine tricks. Kira's gamification is an **accountability mirror** — it shows you exactly where you stand, no hiding. The game is against yourself.

---

### 6.1 Velocity

**What:** Rolling 7-day average of tasks completed per day.

**Display:** A number with a trend arrow.
```
⚡ 4.2 tasks/day  ↑ +0.8
```

**Visual:**
- Number is large, prominent, top of dashboard
- Arrow: ↑ green (improving), → gray (flat), ↓ red (declining)
- Sparkline (7-day mini chart) on hover/tap
- Historical comparison: "vs last week: +12%"

**Calculation:**
```
velocity = sum(tasks_completed_last_7_days) / 7
trend = velocity_today - velocity_yesterday
```

**Why it works:** It's simple, visceral, and hard to game. You either did the work or you didn't. The trend arrow creates gentle pressure.

---

### 6.2 Streak

**What:** Consecutive days with at least 1 task completed.

**Display:**
```
🔥 14 days
```

**Visual:**
- Flame icon grows with streak length:
  - Days 1-3: small flame, single color
  - Days 4-7: medium flame, animated flicker
  - Days 8-14: large flame, gradient (orange → purple)
  - Days 15-30: large flame + glow halo
  - Days 30+: flame + particle embers
- Streak calendar (GitHub contribution graph style) below
- "Longest streak: 23 days" record shown

**Streak rules:**
- Any task completion counts (even one)
- Day boundary: midnight in user's timezone
- "Streak save": 1 free skip per 14-day period (life happens)
- Streak freeze: user can pause streak manually (vacation mode)

---

### 6.3 The Red Line

**What:** A chart for each goal showing projected completion vs actual progress. The critical accountability metric.

**Display:** Line chart, similar to a stock chart.

```
Progress
  100% ┤                                    ╱ ← target line
       │                              ╱╱╱╱
   75% ┤                        ╱╱╱╱
       │                  ╱╱╱╱        ━━━━━ ← actual (you)
   50% ┤            ╱╱╱╱        ━━━━━
       │      ╱╱╱╱        ━━━━━
   25% ┤╱╱╱╱        ━━━━━
       │       ━━━━━
    0% ┼━━━━━─────────────────────────────────
       Start                              Deadline
```

**Visual details:**
- Target line: gray dashed, steady slope from 0% to 100% between start and deadline
- Actual line: purple solid, updates daily based on real progress
- Gap between lines is shaded:
  - Green tint: ahead of schedule
  - Red tint: behind schedule
- Hover shows exact data: "Day 14: Target 35%, Actual 28% — 7% behind"
- Projected completion date shown: "At current pace: March 18 (3 days late)"

**Calculation:**
```
target_progress(day) = (day - start) / (deadline - start) * 100
actual_progress(day) = completed_subtasks / total_subtasks * 100
gap = actual - target  // positive = ahead, negative = behind
projected_end = start + (total_subtasks / velocity_for_goal) days
```

---

### 6.4 Health Colors

**What:** Auto-calculated status for every goal, task, and project.

**Colors:**
| Color | Status | Meaning | Trigger |
|-------|--------|---------|---------|
| 🟢 Green | On Track | Will finish on time at current pace | `projected_end <= deadline` |
| 🟡 Yellow | Attention | Pace is slowing, buffer shrinking | `projected_end` within 2 days of deadline |
| 🟠 Orange | At Risk | Will likely miss without intervention | `projected_end` 3-7 days past deadline |
| 🔴 Red | Critical | Will miss deadline at current pace | `projected_end` >7 days past deadline |
| ⚪ Gray | No deadline | No deadline set, untracked | No deadline assigned |

**Display:** Small colored dot next to every goal/task. Dashboard header shows aggregate: "3 🟢 · 1 🟡 · 0 🔴"

**Auto-recalculation:** Every time a task is completed or a day passes, all health colors update. Users see real-time shifts — complete a bunch of tasks and watch yellows turn green.

---

### 6.5 Progress Rollup

**What:** Everything is hierarchical. Progress flows upward.

```
Vision: "Build a successful SaaS company"        ██░░░░░░░░ 18%
├── Quarter Goal: "Launch MVP"                    ████░░░░░░ 35%
│   ├── Month Goal: "Complete landing page"       ████████░░ 80%
│   │   ├── Task: Design mockup                   ✅ 100%
│   │   ├── Task: Write copy                      ✅ 100%
│   │   ├── Task: Build in code                   ██████░░░░ 60%
│   │   └── Task: Deploy                          ░░░░░░░░░░ 0%
│   ├── Month Goal: "Set up backend"              ██░░░░░░░░ 15%
│   │   └── ...
│   └── Month Goal: "User testing"                ░░░░░░░░░░ 0%
├── Quarter Goal: "Secure funding"                █░░░░░░░░░ 10%
│   └── ...
└── Quarter Goal: "Build team"                    ██░░░░░░░░ 20%
    └── ...
```

**Visual:** Progress rings (not bars). Each level of the hierarchy has a ring:
- Subtasks: small rings
- Tasks: medium rings
- Goals: large rings
- Vision: extra-large ring on the dashboard home

Rings nest visually — a goal ring contains its task rings inside, creating a satisfying radial hierarchy.

**Calculation:**
```
task_progress = completed_subtasks / total_subtasks
goal_progress = avg(child_task_progresses)  // weighted by task size if specified
vision_progress = avg(child_goal_progresses)
```

---

### 6.6 Daily/Weekly Reviews

**Daily Review (generated at user's configured evening time):**

```
📊 Daily Wrap — Thursday, Feb 12

Done today: 6 tasks ⚡
├── ✅ Designed homepage mockup
├── ✅ Drafted executive summary  
├── ✅ Reviewed competitor pricing
├── ✅ Set up CI/CD pipeline
├── ✅ Replied to investor email
└── ✅ Updated roadmap

Skipped/deferred: 2
├── ⏭ Post job listing → moved to tomorrow
└── ⏭ Financial projections → pushed to next week

Health changes:
├── "Launch MVP" 🟢→🟢 (on track, 35% done)
└── "Secure funding" 🟢→🟡 (pitch deck behind schedule)

Velocity: 4.8/day (↑ from 3.9)
Streak: 🔥 14 days

Tomorrow's priority:
1. Finish pitch deck (health: 🟡)
2. Post job listing (overdue)
3. Schedule investor call
```

**Weekly Review (generated Sunday evening):**

Same structure but aggregated:
- Tasks completed this week vs last week
- Goals that changed health color
- The Red Line chart for each active goal
- "Biggest win" and "Biggest risk" auto-identified
- Recommended focus areas for next week

---

### 6.7 Nudges

**What:** Proactive messages from Kira when something needs attention. Not nagging — information.

**Types:**

| Nudge | Trigger | Message Template |
|-------|---------|-----------------|
| Pace Warning | Health turns yellow | "Heads up: '{goal}' is slipping. {X} tasks left, {Y} days remaining. You need {Z}/day to finish on time." |
| Deadline Approaching | <3 days to deadline | "'{goal}' deadline is {date}. You're at {X}% with {Y} tasks remaining." |
| Streak Risk | No activity by 8pm | "Your {X}-day streak is on the line. One task keeps it alive." |
| Velocity Drop | 3-day decline | "Your velocity dropped from {X} to {Y} this week. Everything okay?" |
| Win Celebration | Goal completed or health improved | "'{goal}' just went green. You're back on track. 💪" |
| Idle Detection | No activity in 48h | "Haven't heard from you in a couple days. Want to check in?" |

**Delivery channels:** Push notification, email, in-app toast, or Kira chat message — based on user's notification preferences.

**Frequency cap:** Max 3 nudges per day. Priority: deadline > pace > streak > idle.

---

## 7. Post-Onboarding Retention

### The First 30 Days — Hook Sequence

Retention is not about features. It's about forming a habit. The habit is: **talk to Kira daily**.

---

### 7.1 Morning Brief

**Timing:** Delivered at user's configured wake time (default: 8:00 AM local).

**Content:**
```
Good morning. Here's your day:

🎯 Top 3 priorities:
1. Finish pitch deck (due tomorrow, 🟡)
2. Post job listing (deferred from yesterday)
3. Review Mike's PR

📊 Dashboard: 2 🟢 · 1 🟡 · 0 🔴
⚡ Velocity: 4.2/day | 🔥 Streak: Day 15

💡 Kira worked overnight:
- Researched 3 competitors' pricing pages → saved to your notes
- Drafted job listing for React developer → ready for review
- Updated financial model with latest numbers

Talk to me anytime to adjust the plan.
```

**Delivery:** Push notification with preview → opens dashboard. Also available as voice briefing.

---

### 7.2 Evening Wrap

**Timing:** User's configured evening time (default: 9:00 PM local).

**Content:** The Daily Review from Section 6.6, plus:
- "What's on your mind?" prompt (encourages a quick voice/text check-in)
- Next day's plan preview

---

### 7.3 Voice Check-ins

**What:** Kira initiates a conversational check-in via voice.

**Trigger:** Once per day, at a time the user seems receptive (based on usage patterns). Or on-demand.

**Format:**
> "Hey, quick check-in. You had 3 priorities today — how'd it go? Just talk, I'll update everything."

User responds naturally. Kira:
1. Updates task statuses based on what they said
2. Captures any new tasks/goals mentioned
3. Adjusts plan accordingly
4. Confirms: "Got it. Updated 3 tasks, added 1 new one. Your velocity today is 5. Nice."

---

### 7.4 Graph Growth Visibility

**What:** Show users their knowledge graph growing over time.

**UI element:** "Your AI Brain" section on dashboard.

**Day 1:** Small graph, ~20 nodes. Label: "Kira knows 20 things about you."

**Day 7:** ~100 nodes. "Kira knows 100 things about you. She's learning."

**Day 30:** ~500 nodes. Dense, connected graph. "Kira knows 500 things about you. Context is compounding."

**Day 90:** ~2000+ nodes. "Kira understands your world."

**Milestone notifications:**
- "Your AI just learned its 100th fact about you."
- "Your knowledge graph has 50 connections. Kira's context is getting rich."
- "Day 30: Kira knows 10x more about your work than day 1."

---

### 7.5 Background Work Results

**What:** Every morning, the user sees what Kira did overnight.

**Types of background work:**
- Research on topics from conversations
- Drafting documents (emails, plans, decks)
- Breaking down vague goals into concrete tasks
- Organizing and connecting knowledge graph
- Preparing the daily brief
- Running analytics on progress data

**UI:** Sub-agent panel shows completed work with expandable results. Badge counter on dashboard: "3 new results from Kira."

**Key insight:** The user didn't ask for this. Kira anticipated. This is the "magic" that compounds — the more Kira knows, the more useful the background work becomes.

---

### 7.6 Streak Psychology

**Why streaks work for retention:**
- Days 1-3: "Let me try this out" (novelty)
- Days 4-7: "Don't want to break my streak" (loss aversion)
- Days 8-14: "This is part of my routine" (habit forming)
- Days 15-30: "I can't stop now, look at my streak" (sunk cost + identity)
- Days 30+: "This is just what I do" (identity)

**Design for streak retention:**
- Make it EASY to maintain (one task = streak alive)
- Make it VISIBLE (always on dashboard, in notifications)
- Make it PAINFUL to break (flame extinguish animation, "streak lost" notification)
- Make recovery possible ("streak save" token, earned every 14 days)
- Show "longest streak" as a personal record to beat

---

### Retention Metrics & Targets

| Metric | Day 1 | Day 7 | Day 30 | Day 90 |
|--------|-------|-------|--------|--------|
| Return rate | 100% | 60% | 40% | 25% |
| Daily active | 100% | 45% | 30% | 20% |
| Tasks/day avg | 2 | 4 | 5 | 6 |
| Graph size | 20 | 100 | 500 | 2000+ |
| Background work engagement | 80% view | 60% view | 50% act on | 40% act on |

---

## Appendix: Implementation Priority

| Phase | Component | Effort | Impact |
|-------|-----------|--------|--------|
| **P0** | Signup flow (social + email) | 1 week | Gate |
| **P0** | Onboarding Steps 1-2 (talk + extract + dashboard) | 2 weeks | Core magic |
| **P0** | Basic gamification (velocity, streak, health) | 1 week | Retention |
| **P1** | Splash page + demo animation | 2 weeks | Conversion |
| **P1** | Onboarding Steps 3-5 (tutorial + background + retention) | 1 week | Polish |
| **P1** | Morning brief + evening wrap | 1 week | Retention |
| **P1** | NLP visualization during onboarding | 1 week | Wow factor |
| **P2** | Red Line charts | 1 week | Depth |
| **P2** | Voice check-ins | 1 week | Engagement |
| **P2** | Graph growth visibility | 3 days | Stickiness |
| **P2** | Nudge system | 1 week | Retention |
| **P2** | Weekly reviews | 3 days | Value |

---

*This document is the blueprint. Build P0 first. Ship it. Iterate on P1/P2 based on real user data.*
