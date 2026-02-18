# Kira Dashboard — Chat UI Design Document

**Version:** 1.0
**Date:** February 11, 2026
**Status:** Design Review

---

## 1. Problem Statement

The current dashboard uses a manual `/api/chat/sync` POST to receive messages — meaning only explicitly pushed messages appear. This creates gaps: some messages visible in Telegram don't appear in the dashboard, and vice versa.

Additionally, all AI generation (thinking, tool calls, sub-agents) is invisible to the user, making it impossible to understand what Kira is doing behind the scenes.

**Goal:** A chat UI that shows 100% of Kira's output with rich, expandable blocks AND interactive visual elements that make complex decisions easier to understand.

---

## 2. Data Source Architecture

### 2.1 Source of Truth

OpenClaw stores complete session transcripts at:
```
~/.openclaw/agents/main/sessions/{session-id}.jsonl
```

Each line is a JSON object with:
```json
{
  "type": "message",
  "id": "abc123",
  "parentId": "def456",
  "timestamp": "2026-02-11T08:30:00.000Z",
  "message": {
    "role": "user|assistant|toolResult",
    "content": [
      { "type": "text", "text": "..." },
      { "type": "thinking", "text": "..." },
      { "type": "toolCall", "toolName": "exec", "input": {...} },
      { "type": "toolResult", "output": "..." }
    ]
  }
}
```

Other line types: `session`, `model_change`, `thinking_level_change`, `custom`.

### 2.2 API Design

**`GET /api/chat/messages?sessionId=...&after=...&limit=100`**
- Reads JSONL transcript directly
- `after` param for pagination (timestamp or message ID)
- Returns parsed, structured messages

**`GET /api/chat/sessions`**
- Lists available sessions (main + sub-agents)
- Shows session metadata: label, status, model, timestamps

**`GET /api/chat/stream?sessionId=...`**
- SSE endpoint
- Watches JSONL file for new lines (fs.watch + tail)
- Pushes new messages in real-time
- Sends heartbeat pings every 15s

**`GET /api/chat/subagent/:sessionKey`**
- Fetches sub-agent transcript
- Used when expanding a sub-agent block in the UI

### 2.3 Message Processing Pipeline

```
JSONL line → Parse → Classify → Group → Render

Classify:
  user message       → ChatBubble (left)
  assistant:text     → ChatBubble (right)
  assistant:thinking → ThinkingBlock (collapsible)
  assistant:toolCall → ToolBlock (collapsible, groups with toolResult)
  toolResult         → Attached to parent ToolBlock
  session/meta       → SystemBanner (thin, dismissable)
```

**Grouping logic:** Consecutive assistant content blocks (thinking + toolCalls + text) that share the same `parentId` chain are grouped into a single "turn." This prevents fragmentation.

---

## 3. Message Type Rendering

### 3.0 Layout Philosophy — Discord-Style, Not Chat Bubbles

**No bubbles. No left/right alignment.** All messages flow top-to-bottom in a single column, full-width, like Discord or Slack. Each message has:
- Avatar + username on the left
- Timestamp on the right (subtle)
- Content below, using the full available width

**No inner container or box constraining the messages.** The entire page IS the chat. Content goes edge-to-edge with comfortable padding. Top of the page has a subtle gradient fade (transparent → background) so scrolling feels seamless.

**No header bar with "Chat" or "Telegram ↔ Dashboard".** The session info lives in the status bar at the bottom or in the sidebar. The chat area is clean, distraction-free.

```
┃                                                          ┃
┃  ░░░░░░░░░░ (gradient fade to transparent) ░░░░░░░░░░░  ┃
┃                                                          ┃
┃  👤 Otto                                        09:12    ┃
┃  Yes, please update it                                   ┃
┃                                                          ┃
┃  ⚡ Kira                                        09:12    ┃
┃  ZenithCred product design passed the critic             ┃
┃  loop — **8/10**, investor-ready. One suggestion         ┃
┃  from the critic: add a 1-page executive summary.        ┃
┃                                                          ┃
┃  💭 Thinking...                                 09:12    ┃
┃  ▸ Otto wants me to update the EEG sections...  [+more]  ┃
┃                                                          ┃
┃  🔧 exec                                       09:12    ┃
┃  ▸ $ head -80 ~/kira/scripts/workflows/cr... [expand]    ┃
┃                                                          ┃
┃  ⚡ Kira                                        09:13    ┃
┃  Done — v1.2 updated throughout. Here's what             ┃
┃  changed:                                                ┃
┃  ✅ HRV is now the primary metric...                     ┃
┃                                                          ┃
```

### 3.1 User Messages

```
┃  👤 Otto                                        09:12    ┃
┃  Yes, please update it                                   ┃
```

- Avatar + name + timestamp
- Full-width content, markdown rendered
- Source channel shown as subtle badge after username: `👤 Otto  ᵗᵍ` (if needed, very subtle)
- Media attachments rendered inline (images, voice → audio player)
- Consecutive messages from same user collapse the avatar/name (just show content)

### 3.2 Assistant Text Messages

```
┃  ⚡ Kira                                        09:12    ┃
┃  ZenithCred product design passed the critic             ┃
┃  loop — **8/10**, investor-ready.                        ┃
┃                                                          ┃
┃  | Metric | Target |                                     ┃
┃  |--------|--------|                                     ┃
┃  | HRV    | 8%     |                                     ┃
```

- Same layout as user messages, just different avatar/color
- Full markdown rendering (tables, code blocks, lists, bold/italic)
- Code blocks get syntax highlighting + copy button
- Links are clickable
- Long messages get a "Show more" fold after ~800 chars
- Consecutive messages from Kira collapse avatar (like Discord)

### 3.3 Thinking Blocks

```
┃  💭 Thinking...                                 09:12    ┃
┃  ▸ Otto wants me to design the full chat UI...  [+more]  ┃
```

- Inline in the message flow, slightly dimmed text, subtle left border accent (violet)
- Collapsed by default — first ~100 chars as one-line preview
- Click to expand full thinking text
- Animated shimmer/pulse while actively thinking (before content arrives)
- No box or container — just styled differently (muted color, italic, indented slightly)

### 3.4 Tool Call Blocks

```
┃  🔧 exec                                  ✅   09:12    ┃
┃  ▸ $ find ~/kira -name "*.tsx"              [expand]     ┃
```

Expanded:
```
┃  🔧 exec                                  ✅   09:12    ┃
┃  $ find ~/kira -name "*.tsx"                             ┃
┃  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄                 ┃
┃  /home/adminuser/kira/src/App.jsx                        ┃
┃  /home/adminuser/kira/src/main.jsx                       ┃
┃                                    [+47 more lines]      ┃
```

**Per tool type:**

| Tool | Icon | Collapsed Preview | Expanded Content |
|------|------|-------------------|------------------|
| `exec` | 🔧 | `$ command...` | Full command + output |
| `Read` | 📄 | `Reading file_path...` | File contents (syntax highlighted) |
| `Write` | ✏️ | `Writing file_path...` | File contents written |
| `Edit` | 🔀 | `Editing file_path...` | Diff view (old → new) |
| `web_search` | 🔍 | `Searching: "query"...` | Results with links |
| `web_fetch` | 🌐 | `Fetching url...` | Page content (truncated) |
| `sessions_spawn` | 🤖 | `Spawning: label...` | Task description |
| `memory_search` | 🧠 | `Searching memory...` | Memory snippets found |
| `message` | 💬 | `Sending to target...` | Message content |
| `cron` | ⏰ | `Cron: action...` | Job details |
| `browser` | 🖥️ | `Browser: action...` | Screenshot or snapshot |
| `image` | 🖼️ | `Analyzing image...` | Image + analysis |

- All collapsed by default (single line with preview)
- Status indicator inline: ⏳ running, ✅ success, ❌ failed
- Click anywhere on the line to expand
- Long outputs truncated with "Show full output" link
- `Edit` tool shows a proper diff view (red/green lines)
- Stacked tool calls show as a compact sequence (no repeated timestamps)

### 3.5 Sub-Agent Blocks — Persistent Top Bar

**Sub-agents do NOT appear inline in the chat.** They persist as cards in a **top dock** that stays visible while they're running:

```
┌──────────────────────────────────────────────────────────┐
│ 🤖 zenithcred-pilot ⏳ 2:13  │ 🤖 eeg-research ✅ done │
└──────────────────────────────────────────────────────────┘
┃                                                          ┃
┃  ░░░░░░░░░░ (gradient fade) ░░░░░░░░░░░░░░░░░░░░░░░░░  ┃
┃                                                          ┃
┃  [normal chat messages below]                            ┃
┃                                                          ┃
```

**Sub-agent card states:**
- **Running:** Animated border pulse, timer counting up, task label
- **Completed:** Green check, "Done" label, click to see summary
- **Failed:** Red X, click to see error

**Interactions:**
- Click card → slide-down panel showing: task description, elapsed time, output file link
- "View transcript" → opens sub-agent's full message history in a side panel or new tab
- Completed cards auto-minimize after 30s, can be dismissed with ×
- Cards stack horizontally, scroll if too many

**In the chat flow**, when Kira spawns a sub-agent, a subtle system line appears:
```
┃  ─── 🤖 Spawned: zenithcred-pilot-research ──────       ┃
```

And when it completes, another:
```
┃  ─── ✅ zenithcred-pilot completed (5m 27s) ────────    ┃
```

### 3.6 System Events

```
┃  ─── session started · claude-opus-4-6 · 08:27 ─────    ┃
┃  ─── heartbeat · HEARTBEAT_OK · 09:00 ───────────       ┃
```

- Thin, centered, very muted (barely visible unless you look)
- Heartbeat exchanges auto-collapsed into single line
- Model changes, session events, cron triggers

---

## 4. Live Visual Assets (Interactive HTML/JS Blocks)

### 4.1 Concept

When Kira needs the user to make decisions, understand data, or interact with structured information, she generates **inline interactive HTML/JS widgets** rendered directly in the chat. These are sandboxed iframes with a consistent design system.

This is NOT just markdown — it's live, interactive, rendered UI embedded in the conversation flow.

### 4.2 Widget Types

#### 4.2.1 Decision Cards — When user must choose between options

**Trigger:** Kira detects the user needs to pick between 2-6 options.

```
                ┌─────────────────────────────────────┐
                │ ⚡ Kira                               │
                │                                     │
                │ Which approach do you prefer?        │
                │                                     │
                │ ┌─────────────────────────────────┐ │
                │ │  ┌─────┐  ┌─────┐  ┌─────┐    │ │
                │ │  │ A   │  │ B   │  │ C   │    │ │
                │ │  │     │  │     │  │     │    │ │
                │ │  │HRV  │  │Full │  │Move │    │ │
                │ │  │Only │  │Suite│  │Only │    │ │
                │ │  │     │  │     │  │     │    │ │
                │ │  │€5K  │  │€15K │  │€3K  │    │ │
                │ │  │12wk │  │24wk │  │8wk  │    │ │
                │ │  └─────┘  └─────┘  └─────┘    │ │
                │ │                                 │ │
                │ │  Hover for details. Click to     │ │
                │ │  select.                         │ │
                │ └─────────────────────────────────┘ │
                └─────────────────────────────────────┘
```

**Behavior:**
- Hover: card lifts, shows expanded description + pros/cons
- Click: sends selection back as a user message (via callback)
- Supports 2-6 options in responsive grid
- Each card can have: title, subtitle, icon/emoji, key metrics, description
- Selected card gets highlighted border; others dim

**Data schema:**
```json
{
  "widget": "decision-cards",
  "question": "Which approach do you prefer?",
  "options": [
    {
      "id": "a",
      "title": "HRV Only",
      "subtitle": "Proven metrics",
      "metrics": { "Cost": "€5K", "Timeline": "12 weeks" },
      "description": "Lead with clinically validated HRV...",
      "icon": "❤️"
    }
  ],
  "callbackFormat": "I choose option: {id} — {title}"
}
```

#### 4.2.2 Comparison Tables — When presenting structured data

**Trigger:** Comparing products, companies, features, plans.

```
                ┌───────────────────────────────────────┐
                │ ⚡ Kira                                 │
                │                                       │
                │ Here are the top pilot targets:        │
                │                                       │
                │ ┌───────────────────────────────────┐ │
                │ │ 🏢 Pilot Target Comparison         │ │
                │ │                                   │ │
                │ │ [Sortable table with columns:]     │ │
                │ │ Company | Size | Signal | Score    │ │
                │ │ ─────────────────────────────────  │ │
                │ │ AbbVie   280   11×GPTW    9.2  ▼  │ │
                │ │ Bynder   250   Wellness   8.7  ▼  │ │
                │ │ GoodH..  250   Product    8.5  ▼  │ │
                │ │                                   │ │
                │ │ [Sort ▼] [Filter 🔍] [Export 📊]   │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Behavior:**
- Sortable columns (click header)
- Expandable rows (click row → details slide open)
- Filter/search bar
- Export to CSV button
- Highlight/pin favorites
- Row click can trigger callback ("Tell me more about {company}")

#### 4.2.3 Progress Trackers — For multi-step processes

**Trigger:** Showing project status, task completion, multi-phase work.

```
                ┌───────────────────────────────────────┐
                │ ┌───────────────────────────────────┐ │
                │ │ 📊 ZenithCred Product Design       │ │
                │ │                                   │ │
                │ │ ●━━━━●━━━━●━━━━○━━━━○             │ │
                │ │ Vision  UX  Gamif  Tech  MVP      │ │
                │ │  ✅    ✅    ✅    🔄    ⬜       │ │
                │ │                                   │ │
                │ │ Overall: 60% complete              │ │
                │ │ ████████████░░░░░░░░               │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Behavior:**
- Animated progress bar
- Click phases for detail
- Auto-updates via SSE when sub-agents complete work
- Color coding: ✅ done (green), 🔄 in progress (blue pulse), ⬜ pending (gray)

#### 4.2.4 Data Visualizations — Charts and graphs

**Trigger:** Financial projections, analytics, metrics, trends.

```
                ┌───────────────────────────────────────┐
                │ ┌───────────────────────────────────┐ │
                │ │ 📈 Revenue Projection (3-Year)     │ │
                │ │                                   │ │
                │ │     ╭──────╮                       │ │
                │ │    ╱        ╲    SaaS recurring    │ │
                │ │   ╱    ╭────╲──── Hardware         │ │
                │ │  ╱────╱                            │ │
                │ │ ╱────╱                             │ │
                │ │ Y1    Y2    Y3                     │ │
                │ │                                   │ │
                │ │ [Toggle: Revenue|Costs|Profit]     │ │
                │ │ [Adjust assumptions ⚙️]            │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Implementation:** Lightweight charting via Chart.js or custom SVG.

**Behavior:**
- Hover for exact values
- Toggle data series on/off
- "Adjust assumptions" opens sliders (price, seats, growth rate) → chart updates live
- Export as PNG or SVG

#### 4.2.5 File Previews — Documents, code, images

**Trigger:** When referencing a deliverable or output file.

```
                ┌───────────────────────────────────────┐
                │ ┌───────────────────────────────────┐ │
                │ │ 📄 zenithcred-product-design.md    │ │
                │ │ v1.2 · 4,800 words · Feb 11       │ │
                │ │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │ │
                │ │                                   │ │
                │ │ [Rendered markdown preview]         │ │
                │ │ # ZenithCred — Product Design...   │ │
                │ │ **Version:** 1.2                   │ │
                │ │ ...                                │ │
                │ │                                   │ │
                │ │ [Open full ↗] [Download ⬇] [Raw]   │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Behavior:**
- Rendered markdown preview (first ~30 lines)
- "Open full" → new tab/modal with full rendered document
- Table of contents navigation for long docs
- Code files get syntax highlighting
- Images rendered inline with zoom

#### 4.2.6 Quick Polls / Confirmations

**Trigger:** Yes/no questions, priority ordering, quick feedback.

```
                ┌───────────────────────────────────────┐
                │ ⚡ Kira                                 │
                │                                       │
                │ Should I run it through the critic     │
                │ loop before you review?                │
                │                                       │
                │   ┌──────────┐  ┌──────────┐         │
                │   │  ✅ Yes  │  │  ❌ No   │         │
                │   └──────────┘  └──────────┘         │
                └───────────────────────────────────────┘
```

**Behavior:**
- Large, touch-friendly buttons
- Click sends response as message
- Button disables after selection (prevents double-click)
- Can include "More options..." expander

#### 4.2.7 Timeline / Gantt View

**Trigger:** Project planning, roadmap discussions, scheduling.

```
                ┌───────────────────────────────────────┐
                │ ┌───────────────────────────────────┐ │
                │ │ 🗓 ZenithCred Roadmap              │ │
                │ │                                   │ │
                │ │ Feb    Mar    Apr    May    Jun    │ │
                │ │ ├──MVP──┤                          │ │
                │ │    ├──Pilot v1──┤                  │ │
                │ │         ├───Seed Round────┤        │ │
                │ │              ├──Scale──────────    │ │
                │ │                                   │ │
                │ │ [Drag to adjust] [Add milestone]   │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Behavior:**
- Horizontal timeline, color-coded phases
- Drag edges to adjust dates (sends updated dates as message)
- Click bar for phase details
- Milestone markers (diamonds) on key dates
- Today marker (red vertical line)

#### 4.2.8 Kanban / Status Board

**Trigger:** Showing task status across multiple workstreams.

```
                ┌───────────────────────────────────────┐
                │ ┌───────────────────────────────────┐ │
                │ │ 📋 Today's Tasks                   │ │
                │ │                                   │ │
                │ │  Todo     In Progress    Done      │ │
                │ │ ┌─────┐  ┌─────────┐  ┌───────┐  │ │
                │ │ │Email│  │ZenithCred│  │Webinar│  │ │
                │ │ │Auto │  │Product   │  │Outline│  │ │
                │ │ ├─────┤  │Design    │  ├───────┤  │ │
                │ │ │IAM  │  └─────────┘  │EEG    │  │ │
                │ │ │Comp.│               │Research│  │ │
                │ │ └─────┘               └───────┘  │ │
                │ │                                   │ │
                │ │ [Drag cards to move]                │ │
                │ └───────────────────────────────────┘ │
                └───────────────────────────────────────┘
```

**Behavior:**
- Drag-and-drop between columns (sends status update as message)
- Click card for details
- Color coding by project/priority

### 4.3 Widget Rendering Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Chat Message Area                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  <iframe sandbox="allow-scripts"                 │   │
│  │          srcdoc="{generated HTML/JS/CSS}"        │   │
│  │          style="width:100%; border:none;"        │   │
│  │          @message → postMessage callback         │   │
│  │  />                                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Security model:**
- Widgets render in sandboxed iframes (`sandbox="allow-scripts"`)
- No access to parent DOM, cookies, or localStorage
- Communication via `postMessage` only
- Widget → Parent: user selections, interactions
- Parent → Widget: theme (dark/light), resize events

**Generation flow:**
```
Kira decides widget is needed
  → Generates widget JSON schema (type + data)
  → Dashboard widget renderer maps schema → HTML/JS/CSS
  → Pre-built templates for each widget type
  → Data injected into template
  → Rendered in sandboxed iframe
  → User interaction → postMessage → sent as chat message
```

**Key principle:** Kira generates **structured data**, NOT raw HTML. The dashboard has pre-built, tested, beautiful templates for each widget type. This ensures:
- Consistent visual design
- Security (no arbitrary code execution)
- Responsive behavior
- Theme compatibility (dark/light mode)

### 4.4 Widget Data Protocol

Assistant messages can include widget blocks alongside text:

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Here are the three approaches:" },
    {
      "type": "widget",
      "widget": "decision-cards",
      "data": {
        "question": "Which approach?",
        "options": [...]
      }
    },
    { "type": "text", "text": "I recommend option B, but it's your call." }
  ]
}
```

Since OpenClaw transcripts don't natively support widgets, we embed them as specially-formatted markdown in the text content:

```markdown
Here are the three approaches:

<!-- kira-widget:decision-cards
{
  "question": "Which approach?",
  "options": [...]
}
-->

I recommend option B, but it's your call.
```

The chat UI parser detects `<!-- kira-widget:TYPE ... -->` blocks and renders them as interactive widgets. On platforms that don't support widgets (Telegram), they fall back to the surrounding text.

### 4.5 Widget Design System

All widgets share a consistent visual language:

| Property | Value |
|----------|-------|
| Border radius | 12px |
| Background | `var(--widget-bg)` — adapts to dark/light |
| Font | Inter / system-ui, matching chat |
| Accent color | Electric Violet `#7C3AED` (from ZenithCred palette — or Kira brand color) |
| Shadows | Subtle, layered (`0 1px 3px`, `0 4px 12px`) |
| Animations | 200ms ease-out for transitions, 300ms for reveals |
| Max width | 100% of chat bubble width |
| Min height | 120px |
| Padding | 16px |
| Interactive states | Hover: lift + border glow. Active: scale(0.98). Disabled: opacity 0.5 |

---

## 5. Streaming & Real-Time Behavior

### 5.1 Message Streaming

When Kira is generating a response:

1. **Thinking indicator** — Animated shimmer block appears: "💭 Thinking..."
2. **Tool calls stream in** — Each tool block appears as it's invoked, shows ⏳ while running
3. **Text streams** — Characters appear word-by-word (typewriter effect, ~30 words/sec)
4. **Widgets render** — After text completes, widget blocks animate in (fade + slide up)

### 5.2 Sub-Agent Live Status

When a sub-agent is spawned:
1. Block appears immediately with task description
2. Timer counts up: "⏳ Running (0:00)"
3. Optional: periodic status updates if available
4. On completion: block updates with ✅, shows summary, timer stops

### 5.3 SSE Event Types

```
event: message
data: {"type":"user","id":"...","content":"...","timestamp":"..."}

event: message  
data: {"type":"assistant:text","id":"...","content":"...","streaming":true}

event: message
data: {"type":"assistant:thinking","id":"...","content":"..."}

event: message
data: {"type":"assistant:toolCall","id":"...","tool":"exec","input":{...},"status":"running"}

event: message
data: {"type":"assistant:toolResult","id":"...","parentId":"...","output":"...","status":"success"}

event: message
data: {"type":"subagent","id":"...","label":"...","task":"...","status":"running|completed|failed"}

event: message
data: {"type":"widget","id":"...","widget":"decision-cards","data":{...}}

event: heartbeat
data: {"ts":"..."}
```

---

## 6. Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│ ☰ │ 🤖 pilot ⏳ 2:13 │ 🤖 eeg ✅ │ 🤖 webinar ✅    │ │
├───┤──────────────────────────────────────────────────────┤
│   │ ░░░░░░░░░░░░░░ (fade gradient) ░░░░░░░░░░░░░░░░░░  │
│ S │                                                      │
│ e │  👤 Otto                                     09:12   │
│ s │  Yes, please update it                               │
│ s │                                                      │
│ i │  ⚡ Kira                                     09:12   │
│ o │  Done — v1.2 updated. Here's what changed:           │
│ n │  ✅ HRV is now the primary metric                    │
│ s │  ✅ Sensors split into Core and Premium tiers         │
│   │                                                      │
│ · │  💭 ▸ Otto wants me to update...            [+more]  │
│ · │                                                      │
│ · │  🔧 exec ✅ ▸ $ head -80 ~/kira/sc...    [expand]   │
│ · │  🔧 Edit ✅ ▸ Editing zenithcred-pr...    [expand]   │
│ · │  🔧 Edit ✅ ▸ Editing zenithcred-pr...    [expand]   │
│   │                                                      │
│   │  ⚡ Kira                                     09:13   │
│   │  Updated! Version bumped to 1.2.                     │
│   │                                                      │
│   │                                                      │
│   ├──────────────────────────────────────────────────────┤
│   │  💬 Type a message...                        ⏎ 📎   │
├───┴──────────────────────────────────────────────────────┤
│  ● Connected · opus-4-6 · 23.4k tokens · 💭 low         │
└──────────────────────────────────────────────────────────┘
```

### 6.0 Design Principles

- **Seamless and modern** — no boxes, no inner containers, no edges
- **The page IS the chat** — content goes edge-to-edge with comfortable padding
- **Gradient fade at top** — smooth transparency gradient so scrolling feels infinite
- **No header bar** — no "Chat", no "Telegram ↔ Dashboard", nothing. Clean.
- **Discord-style messages** — all left-aligned, full-width, avatar + name + content

### 6.1 Left Sidebar — Session Navigator (Collapsible)

- Thin icon rail by default (just dots/icons)
- Hover or click ☰ to expand with session names
- Lists: Main session, recent sub-agents, older sessions
- Active session highlighted with accent color
- Status dots: 🟢 active, ✅ done, 🔴 failed
- Click to switch chat view
- On mobile: slide-out drawer

### 6.2 Top Dock — Active Sub-Agents

- Horizontal bar of sub-agent cards, only visible when agents are running or recently completed
- Cards: label + status + timer
- Click to expand details panel (slides down, pushes chat)
- Auto-hides when all agents are idle (after 30s)
- Scrollable horizontally if many agents

### 6.3 Chat Area — Full Page

- NO inner container or box
- Messages flow edge-to-edge with `padding: 0 24px`
- Top gradient fade (40px, `background → transparent`)
- Auto-scroll on new messages (unless user scrolled up)
- "↓ New messages" pill when scrolled up
- Time dividers every 5+ min gap
- Consecutive same-user messages collapse avatar/name

### 6.4 Input Area

- Pinned to bottom, subtle top border (1px, very light)
- Multiline text input (auto-expanding, max 200px height)
- Send on Enter, Shift+Enter for newline
- 📎 attachment button (drag-and-drop on whole page too)
- Placeholder: "Type a message..."
- No visible send button — just Enter (or subtle ⏎ icon)

### 6.5 Status Bar

- Thin bottom bar, muted text
- Connection dot (green/red)
- Current model name
- Token count
- Thinking level
- Clicking opens settings panel

---

## 7. Visual Theme

### 7.1 Dark Mode (Default)

```css
--bg-primary: #0F1117;
--bg-secondary: #1A1D27;
--bg-bubble-user: #2A2D3A;
--bg-bubble-assistant: #1E2030;
--bg-widget: #1A1D27;
--bg-tool: #151720;
--text-primary: #E4E4E7;
--text-secondary: #9CA3AF;
--text-muted: #6B7280;
--accent: #7C3AED;
--accent-glow: rgba(124, 58, 237, 0.2);
--success: #10B981;
--warning: #F59E0B;
--error: #EF4444;
--border: #2A2D3A;
--thinking-bg: #1A1520;
--thinking-border: #7C3AED40;
```

### 7.2 Light Mode

```css
--bg-primary: #FFFFFF;
--bg-secondary: #F8FAFC;
--bg-bubble-user: #F1F5F9;
--bg-bubble-assistant: #FFFFFF;
--bg-widget: #F8FAFC;
--bg-tool: #F1F5F9;
--text-primary: #1E293B;
--text-secondary: #64748B;
--accent: #7C3AED;
--border: #E2E8F0;
```

### 7.3 Typography

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
```

---

## 8. Interaction Callbacks

When a user interacts with a widget, the result flows back into the conversation:

```
User clicks "Option B" on decision card
  → iframe postMessage({ type: "widget-response", widgetId: "abc", selection: "b", text: "I choose option B — Full Suite" })
  → Parent catches message
  → Sends as user message to Kira via API
  → Appears in chat as a normal user message
  → Kira processes and responds
```

This keeps the conversation flow natural — widget interactions become chat messages. The full conversation (including widget responses) is always readable as plain text.

---

## 9. Fallback Behavior

| Platform | Widget Support | Fallback |
|----------|---------------|----------|
| Kira Dashboard (web) | Full interactive widgets | — |
| Telegram | No widgets | Text-only with inline buttons where possible |
| Signal/WhatsApp | No widgets | Plain text with numbered options |
| API/CLI | No widgets | JSON data structure |

Kira should always include text alternatives alongside widgets so the conversation makes sense on any platform.

---

## 10. Implementation Phases

### Phase 1 — Core Chat (Week 1-2)
- [ ] JSONL transcript reader API
- [ ] SSE stream with file watching
- [ ] Message renderer: user, assistant:text, system banners
- [ ] Thinking blocks (collapsible)
- [ ] Tool blocks (collapsible, with result nesting)
- [ ] Basic layout (sidebar + chat + input)
- [ ] Dark/light theme
- [ ] Auto-scroll behavior

### Phase 2 — Interactive Widgets (Week 3-4)
- [ ] Widget parser (detect `<!-- kira-widget:... -->` blocks)
- [ ] Sandboxed iframe renderer
- [ ] Decision cards widget
- [ ] Comparison table widget
- [ ] Quick poll widget
- [ ] File preview widget
- [ ] postMessage callback → chat message flow
- [ ] Widget design system (shared CSS)

### Phase 3 — Rich Widgets (Week 5-6)
- [ ] Chart/data visualization widget (Chart.js)
- [ ] Progress tracker widget
- [ ] Timeline/Gantt widget
- [ ] Kanban board widget
- [ ] Sub-agent live status with transcript drill-down

### Phase 4 — Polish (Week 7-8)
- [ ] Message streaming (typewriter effect)
- [ ] Animations and transitions
- [ ] Mobile responsive layout
- [ ] Keyboard shortcuts
- [ ] Search within chat
- [ ] Export conversation as PDF/MD

---

## 11. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + Vite | Already in use (dashboard-copilot), fast HMR |
| Styling | Tailwind CSS | Rapid prototyping, dark mode built-in |
| Charts | Chart.js or Recharts | Lightweight, React-friendly |
| Markdown | react-markdown + rehype | Render assistant messages |
| Code highlight | Shiki or Prism | Syntax highlighting in tool outputs |
| Diff view | diff2html | For Edit tool visualization |
| Backend | Node.js (existing server.js) | Already running, add new routes |
| Real-time | SSE (Server-Sent Events) | Already implemented, extend |
| Widget sandbox | iframe sandbox | Security isolation |

---

## 12. Widget Specialist Agent Architecture

### 12.1 The Problem

Kira (main agent) should focus on thinking, planning, and executing tasks — not on crafting JSON schemas for visual widgets. Generating widget data is a separate skill that a specialist should handle.

### 12.2 The Solution — Widget Agent

A lightweight specialist agent that Kira can invoke with a single keyword/command. Kira describes WHAT she wants to show; the Widget Agent produces the structured JSON.

**Flow:**
```
Kira thinks: "I need to show Otto 3 options for the sensor approach"
  → Kira sends: @widget decision-cards "3 sensor approaches for ZenithCred"
     with context: { options descriptions, costs, timelines }
  → Widget Agent (sub-agent, fast model like Sonnet) receives request
  → Widget Agent generates the JSON schema for the decision-cards template
  → Returns structured widget data
  → Dashboard renders it inline
  → Otto clicks an option
  → Response flows back as a chat message to Kira
```

### 12.3 Invocation Protocol

Kira can trigger widgets by including a directive in her response:

```markdown
Here are three approaches for the sensor stack:

@widget:decision-cards
context: ZenithCred biofeedback approach selection
options:
  - HRV Only: proven, €5K, 12 weeks
  - Full Suite: HRV + EEG premium, €15K, 24 weeks  
  - Movement Only: camera-based, €3K, 8 weeks

I recommend option A, but it's your call.
```

The dashboard detects `@widget:TYPE` blocks, extracts the context, and either:
1. **Simple widgets** (polls, decisions with clear options): renders directly from the inline data
2. **Complex widgets** (charts, comparison tables, Gantt): spawns the Widget Agent to generate the full JSON

### 12.4 Widget Agent Spec

| Property | Value |
|----------|-------|
| Model | Fast/cheap (Sonnet, Haiku, or local model) |
| Input | Widget type + context/data from Kira |
| Output | Strict JSON matching the widget schema |
| Timeout | 10 seconds max |
| Invocation | `sessions_spawn` with label `widget-render` or direct function call |

**The Widget Agent knows:**
- All widget type schemas (decision-cards, comparison-table, chart, timeline, kanban, etc.)
- The design system (colors, spacing, interaction patterns)
- How to transform messy context into clean structured data
- How to write callback formats that make sense as chat messages

**The Widget Agent does NOT:**
- Generate HTML/CSS/JS directly
- Make decisions about WHAT to show (that's Kira's job)
- Access files or tools (pure data transformation)

### 12.5 Pre-Built vs Generated

| Widget Complexity | Rendering Method |
|-------------------|-----------------|
| Quick poll (yes/no) | Direct render from `@widget` inline data — no agent needed |
| Decision cards (2-6 options) | Direct render if options are clear; agent if context needs structuring |
| Comparison table | Widget Agent generates column definitions + row data |
| Chart/visualization | Widget Agent generates Chart.js config JSON |
| Timeline/Gantt | Widget Agent generates phase definitions + dates |
| Kanban | Widget Agent generates columns + cards from task data |
| Custom/complex | Widget Agent generates full schema |

### 12.6 Widget Schema Registry

All widget templates are defined in a schema file that both the Widget Agent and the Dashboard renderer share:

```
~/kira/dashboard/widgets/
  schemas/
    decision-cards.schema.json
    comparison-table.schema.json
    chart.schema.json
    progress-tracker.schema.json
    timeline.schema.json
    kanban.schema.json
    poll.schema.json
    file-preview.schema.json
  templates/
    decision-cards.html    ← pre-built, tested, beautiful
    comparison-table.html
    chart.html
    ...
  widget-agent-prompt.md   ← system prompt for the Widget Agent
```

The Widget Agent's system prompt includes all schemas so it knows exactly what JSON structure to produce. The dashboard templates are static HTML/CSS/JS that accept JSON data and render it.

### 12.7 Example: End-to-End

**Kira's response:**
```
I found 10 potential pilot companies. Here are the top candidates:

@widget:comparison-table
context: ZenithCred pilot target companies
columns: Company, Size, Location, Wellness Signal, Fit Score
data_source: ~/kira/deliverables/zenithcred-pilot-targets.md
sortable: true
row_action: "Tell me more about {Company}"

Which ones interest you? I recommend starting with the top 3.
```

**Widget Agent produces:**
```json
{
  "widget": "comparison-table",
  "title": "🏢 ZenithCred Pilot Targets",
  "columns": [
    { "key": "company", "label": "Company", "sortable": true },
    { "key": "size", "label": "Size", "sortable": true, "type": "number" },
    { "key": "location", "label": "Location" },
    { "key": "signal", "label": "Wellness Signal" },
    { "key": "score", "label": "Fit", "sortable": true, "type": "number", "highlight": true }
  ],
  "rows": [
    { "company": "AbbVie CH", "size": 280, "location": "Switzerland", "signal": "11× GPTW, 94% satisfaction", "score": 9.2 },
    { "company": "Bynder", "size": 250, "location": "Amsterdam", "signal": "Weekly massages, wellness office", "score": 8.7 },
    ...
  ],
  "defaultSort": { "key": "score", "direction": "desc" },
  "rowCallback": "Tell me more about {company}",
  "exportable": true
}
```

**Dashboard renders:** A beautiful, sortable, interactive table. Otto clicks "AbbVie CH" → sends "Tell me more about AbbVie CH" → Kira responds with details.

---

*This document defines the complete chat UI system. No code should be written until Otto approves this design.*
