# Setup Wizard — First-Run Experience

> **Goal:** A non-technical user goes from zero to talking with their personal AI agent in under 5 minutes.

## Design Principles

- **Progressive disclosure** — show only what's needed at each step
- **Smart defaults** — every step has a sensible default or skip option
- **Instant feedback** — validate inputs immediately, show success/failure clearly
- **No dead ends** — every error state has a recovery path
- **Mobile-first** — works on phone screens; desktop gets wider layout, same flow

## Flow Overview

```
Welcome → Connect AI → (OpenRouter) → Create Agent → Connect Channels → (Import Context) → Set Goals → Tour → First Conversation
  [1]        [2]           [3]            [4]              [5]               [6]            [7]     [8]         [9]
```

Steps in parentheses are optional/skippable. Estimated time per step shown below.

---

## Step 1: Welcome (~15s)

### Screen

Full-screen hero with Kira logo/animation. Clean, minimal.

**Headline:** "Meet Kira"
**Subheadline:** "Your personal AI agent that actually gets things done."

**Body (3 bullet points with icons):**
- 🧠 **Remembers everything** — conversations, decisions, context across days and weeks
- ⚡ **Takes action** — manages tasks, checks email, searches the web, writes code
- 💬 **Lives where you do** — Telegram, Discord, Signal, WhatsApp, or just the web

**CTA:** `[Get Started →]` (primary button)

**Footer link:** "Already have an account? Sign in"

### Interactions
- Single button click advances to Step 2
- Background: subtle ambient animation (particles, gradient shift) — no heavy assets
- If user is already authenticated (came from invite link), skip to Step 2 automatically

### Skip
- Not skippable (it's 3 seconds of reading + 1 click)

---

## Step 2: Connect AI (~60s)

### Screen

**Headline:** "Connect Your AI Brain"
**Subheadline:** "Kira needs an AI provider to think. Choose one:"

**Two cards side by side:**

#### Card A: Anthropic API Key
- Icon: Anthropic logo
- Label: "Anthropic API Key"
- Description: "Best quality. Pay per use. ~$3-10/month typical."
- Input field: `sk-ant-...` with paste support
- Link: "Get an API key →" (opens console.anthropic.com in new tab)
- On paste: immediate validation spinner → ✅ "Connected! Using Claude Sonnet 4" or ❌ "Invalid key — check and try again"

#### Card B: Claude Max (Future)
- Icon: Claude logo with ✨
- Label: "Claude Max Subscription"
- Description: "Unlimited usage. $100/month flat rate."
- Button: `[Connect Claude Max]` → OAuth flow
- Badge: "Coming Soon" (greyed out until supported)

### Model Selection (appears after valid key)

Expandable section: "AI Model" with dropdown:
- **Claude Sonnet 4** (recommended) — "Fast, smart, affordable"
- **Claude Opus 4** — "Maximum intelligence, higher cost"
- **Claude Haiku** — "Ultra-fast, cheapest, good for simple tasks"

Default: Sonnet 4 (pre-selected)

### Validation

1. User pastes key
2. Spinner: "Validating..."
3. API call: `POST /v1/messages` with a trivial prompt
4. Success: green checkmark, show model name, show remaining credits if available
5. Failure states:
   - **Invalid key format:** "That doesn't look like an Anthropic key. It should start with `sk-ant-`"
   - **Invalid/revoked key:** "This key didn't work. It may be expired or revoked. [Get a new key →]"
   - **Rate limited:** "Key works but is currently rate-limited. This is fine — it'll work normally."
   - **Network error:** "Couldn't reach Anthropic. Check your internet connection. [Retry]"

### Error Recovery
- Input field stays editable, user can re-paste
- "Need help?" expandable section with FAQ:
  - "Where do I get an API key?"
  - "How much does it cost?"
  - "Is my key safe?" → links to security doc

### Skip
- **Not skippable** — AI provider is required. No key = no agent.
- If user is stuck, show: "Need help? Join our Discord for setup support."

---

## Step 3: OpenRouter Key (Optional) (~30s)

### Screen

**Headline:** "Sub-Agents: Save Money on Background Work"
**Subheadline:** "Optional — your main agent uses Anthropic. But background tasks (summarizing, searching, organizing) can use cheaper models."

**Explainer card:**
```
Without OpenRouter:   All tasks use Claude → ~$10/month
With OpenRouter:      Background tasks use cheaper models → ~$3/month
                      Main conversations still use Claude
```

**Input field:** OpenRouter API key with paste support
**Link:** "Get an OpenRouter key (free signup) →"

### Validation
Same pattern as Step 2 — paste, validate, confirm.

### Skip
- `[Skip — I'll use Anthropic for everything]` button (secondary style)
- Clearly communicates: "You can add this later in Settings"

---

## Step 4: Create Your Agent (~60s)

### Screen

**Headline:** "Create Your Agent"
**Subheadline:** "Give your AI a personality. This shapes how it talks to you."

### Two Paths (Tab Toggle)

#### Tab A: "I'll Choose" (default)

**Name field:** Text input, placeholder "e.g., Kira, Atlas, Nova, Jarvis"
- Max 20 chars, alphanumeric + spaces
- Suggested names below: clickable chips

**Personality selector:** 5 cards in a horizontal scroll:
| Template | Emoji | Description |
|----------|-------|-------------|
| Professional | 💼 | Clear, concise, business-like |
| Creative | 🎨 | Expressive, metaphorical, playful |
| Technical | ⚙️ | Precise, detailed, no fluff |
| Friend | 😊 | Warm, casual, supportive |
| Executive | 🎯 | Strategic, direct, action-oriented |

Clicking a card: shows a sample message from that personality in a chat bubble preview.

**Example preview (updates live):**
```
Professional: "Good morning. You have 3 tasks due today. Shall I prioritize them?"
Friend: "Hey! You've got 3 things on your plate today — want me to help figure out what to tackle first? 😊"
```

**Emoji picker:** Click to choose agent's emoji (used in chat, notifications)

**Avatar:** 
- Upload image (drag & drop or file picker)
- Or: choose from 8 pre-made avatars (abstract, friendly designs)
- Or: "Generate one" → creates avatar from personality + name using AI

#### Tab B: "Let the AI Choose"

Single button: `[Let Kira Introduce Itself]`

What happens:
1. Spinner: "Your agent is thinking..."
2. Agent generates its own name, personality, and intro message
3. Shows result in a chat bubble: "Hi! I'm [Name]. I'm [personality description]. Here's what I'm good at..."
4. User sees: `[Love it!]` or `[Try again]` or `[Let me customize instead]`

### Validation
- Name: required, 1-20 chars
- Personality: required (default: Friend if none selected)
- Emoji: optional (default: 🤖)
- Avatar: optional (default: generated from initials)

### Skip
- `[Use defaults]` → Name: "Kira", Personality: Friend, Emoji: 🤖
- Fast-tracks to next step

---

## Step 5: Connect Channels (~60s)

### Screen

**Headline:** "Where Should [Agent Name] Live?"
**Subheadline:** "Connect a messaging app so your agent is always a message away. Or just use the web dashboard."

### Channel Cards (grid layout)

Each card shows: platform logo, name, setup time estimate, status badge.

| Platform | Time | Description |
|----------|------|-------------|
| 🌐 Web Dashboard | Instant | "Already set up. Always available." (pre-checked ✅) |
| ✈️ Telegram | ~2 min | "Most popular. Rich features." |
| 💬 Discord | ~2 min | "Great for teams and communities." |
| 📱 WhatsApp | ~1 min | "QR code scan. Simple." |
| 📡 Signal | ~2 min | "Maximum privacy." |

**Clicking a card** → expands inline setup flow (see `channel-connection.md` for details per platform).

**After connecting:** card shows ✅ with "Connected" badge. Agent sends a test message to that channel.

### Multi-Channel (appears after 2+ channels connected)
"You've connected multiple channels! Want to set routing rules?"
- Quick toggle: "Send everything to all channels" (default)
- Or: "Let me pick" → simple rules UI (see `channel-connection.md`)

### Validation
- At least web dashboard must be available (it's automatic)
- Channel connection verified by test message roundtrip

### Error States
- BotFather token invalid → "That token didn't work. Let's try again."
- QR code expired → "QR code expired. [Generate new one]"
- Connection timeout → "[Retry] or [Skip for now]"

### Skip
- `[Just the web dashboard for now]` — always available
- "You can connect channels anytime in Settings"

---

## Step 6: Import Context (Optional) (~30s)

### Screen

**Headline:** "Give [Agent Name] a Head Start"
**Subheadline:** "Upload existing notes, docs, or goals. Your agent will read them and build initial context."

**Drop zone:** Large dashed-border area
- "Drag files here or click to browse"
- Accepted: `.txt`, `.md`, `.pdf`, `.docx`, `.csv`, `.json`
- Max: 10 files, 10MB each
- Shows upload progress per file

**Suggested sources (clickable):**
- 📋 "Paste text" → opens text area for copy-paste
- 📁 "Connect Google Drive" (future, greyed out)
- 📝 "Connect Notion" (future, greyed out)

### Processing
After upload:
1. "Reading your files..." (progress bar)
2. Agent processes each file, extracts key info
3. Shows summary: "I found: 12 tasks, 3 projects, 8 key topics. [View summary]"
4. User confirms: `[Looks good!]` or `[Remove some files]`

### What the Agent Does
- Creates `memory/imported/` with processed summaries
- Extracts entities (people, projects, dates, goals)
- Populates initial memory graph
- Does NOT store raw files long-term — extracts knowledge, then offers to delete originals

### Skip
- `[Skip — I'll start fresh]` (prominent, no guilt)
- Most users will skip this. That's fine.

---

## Step 7: Set Goals (~60s)

### Screen

**Headline:** "What Are You Working On?"
**Subheadline:** "A quick chat so [Agent Name] knows how to help."

### Format: Mini Chat Interface

The agent conducts a brief interview in a chat-style UI:

```
Agent: "Hey! I'm excited to help. Let me ask you a few quick questions.
        What are you working on right now? Could be a project, a goal, 
        or just 'surviving Monday.' 😄"

User: [text input]

Agent: "Cool! And what matters most to you right now? 
        What would make the biggest difference?"

User: [text input]

Agent: "Last one — is there anything you keep forgetting to do 
        or wish someone would just handle for you?"

User: [text input]

Agent: "Got it! Here's what I'm taking away:
        🎯 Main focus: [extracted goal]
        📋 Key tasks: [extracted tasks]
        🔄 Recurring: [extracted patterns]
        
        Does this look right?"
```

### Processing
- Agent creates initial `GOALS.md` or task structure
- Extracts actionable items
- Sets up initial daily/weekly review schedule

### Validation
- Minimum: 1 response (can be "nothing specific")
- Agent handles vague answers gracefully: "No worries! We'll figure it out as we go."

### Skip
- `[Skip — I'll figure it out as I go]`
- Agent will learn goals organically from conversations

---

## Step 8: Tour (~30s)

### Screen

Overlay tour on the main dashboard. Spotlight-style highlighting.

**5 tour stops (auto-advance every 5s, or click to advance):**

1. **Chat panel** — "This is where you talk to [Agent Name]. Just like texting a friend."
2. **Memory sidebar** — "Your agent remembers everything here. It gets smarter over time."
3. **Tasks/Goals** — "Track what matters. Your agent will remind you."
4. **Settings** — "API keys, channels, personality — all here."
5. **Status bar** — "See what your agent is doing right now."

### Format
- Tooltip-style popover with arrow pointing to feature
- `[Next]` `[Skip tour]` buttons
- Progress dots: ● ● ○ ○ ○

### Skip
- `[Skip tour]` — available on every step
- Tour can be replayed from Settings > Help

---

## Step 9: First Conversation

### Screen

Full chat interface opens. Agent sends first message automatically:

```
Agent: "Hey [User Name]! 👋 I'm [Agent Name], and I'm ready to go.

Based on what you told me during setup:
- I know you're working on [goal from Step 7]
- [If files imported: I've read through your docs and have context on X, Y, Z]
- [If channel connected: I'm also available on Telegram — try messaging me there!]

Here are some things I can help with right now:
1. 📋 Create a task list for [goal]
2. 📅 Set up a daily check-in routine
3. 🔍 Research something for [project]
4. 💬 Or just chat — I'm here.

What would you like to start with?"
```

### If Setup Was Minimal (lots of skips):
```
Agent: "Hey! 👋 I'm [Agent Name]. We kept setup quick, so I don't know 
much about you yet — but I'm a fast learner.

Try telling me what you're working on, or ask me to do something. 
The more we talk, the better I get at helping you.

What's on your mind?"
```

### No Skip
- This is the destination. Setup is complete.
- Dashboard is fully functional from this point.

---

## Progress Indicator

Top of screen throughout wizard:
```
[1]——[2]——[3]——[4]——[5]——[6]——[7]——[8]——[9]
 ●    ●    ○    ○    ○    ○    ○    ○    ○
```

- Completed steps: filled circle, green
- Current step: filled circle, blue, pulsing
- Future steps: empty circle, grey
- Optional steps: dashed circle
- Clicking completed steps: goes back (state preserved)

## Persistence

- All wizard state saved to `localStorage` + server after each step
- If user closes browser mid-setup, they resume where they left off
- If user clears browser, server-side state restores on next login
- Setup can be "restarted" from Settings > Setup Wizard

## Responsive Design

- **Mobile (< 768px):** Single column, full-width cards, larger touch targets
- **Tablet (768-1024px):** Two-column where appropriate
- **Desktop (> 1024px):** Centered card (max-width 640px), background art

## Accessibility

- All steps keyboard-navigable (Tab, Enter, Escape)
- Screen reader labels on all interactive elements
- High contrast mode support
- Reduced motion: disable animations
- Focus trapping within modal steps

## Analytics Events

Track (anonymized):
- `setup_started` — user hits Step 1
- `setup_step_completed {step, duration_seconds}`
- `setup_step_skipped {step}`
- `setup_completed {total_duration, steps_skipped[]}`
- `setup_abandoned {last_step, duration}`

## Technical Implementation

### API Endpoints
- `POST /api/setup/validate-key` — validates AI provider key
- `POST /api/setup/create-agent` — creates agent with personality
- `POST /api/setup/connect-channel` — initiates channel connection
- `POST /api/setup/import` — uploads context files
- `POST /api/setup/goals` — saves goal interview results
- `POST /api/setup/complete` — marks setup done, triggers first message

### State Machine
```
WELCOME → AI_CONNECT → OPENROUTER → AGENT_CREATE → CHANNELS → IMPORT → GOALS → TOUR → CONVERSATION → COMPLETE
```
Each state stores: `{completed: bool, data: {}, skipped: bool, timestamp}`
