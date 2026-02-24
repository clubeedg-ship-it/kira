# TASK 019 — Onboarding Wizard

## Agent Instructions

You are building the **first-time user experience** — an onboarding wizard that takes a new user from signup to their first conversation with their personalized Kira agent in under 5 minutes.

**Read these files first (in order):**
1. `AGENTS.md` — project conventions
2. `design/onboarding/setup-wizard.md` — full 9-step wizard spec
3. `design/onboarding/personality-creation.md` — personality templates and slider system
4. `design/onboarding/channel-connection.md` — channel integration (defer most to post-MVP)
5. `src/server/auth.ts` — auth system
6. `src/client/pages/Chat.tsx` — chat page (built in TASK 016)
7. `src/db/schema.ts` — schema

**What you're building:**

### Database

Add to `src/db/schema.ts`:
```
user_settings table:
  id: uuid (PK)
  user_id: uuid (FK → users, UNIQUE, NOT NULL)
  onboarding_completed: boolean (default false)
  onboarding_step: integer (default 0)
  ai_provider: text ('anthropic')
  ai_api_key: text (encrypted — use a simple AES-256 encryption with env var key)
  ai_model: text (default 'claude-sonnet-4-20250514')
  personality_template: text ('professional' | 'creative' | 'technical' | 'friend' | 'executive' | 'custom')
  personality_config: jsonb (formality, humor, verbosity, proactivity sliders: 0-100)
  soul_md: text (generated SOUL.md content for the agent)
  timezone: text (default 'UTC')
  day_start_hour: integer (default 4)
  created_at: timestamptz
  updated_at: timestamptz
```

### Backend Routes (`src/server/routes/onboarding.ts`)

- `GET /api/v1/onboarding/status` — returns `{ completed, currentStep }`
- `POST /api/v1/onboarding/step/:step` — saves data for that step, advances currentStep
- `POST /api/v1/onboarding/complete` — marks completed, redirects to dashboard
- `POST /api/v1/onboarding/validate-key` — tests API key against Anthropic (make a simple `GET /v1/models` call), returns `{ valid: boolean, models: string[] }`
- `POST /api/v1/onboarding/generate-soul` — takes personality config → generates SOUL.md text (can be a template string, no AI needed here)

### Frontend (`src/client/pages/Onboarding.tsx`)

Multi-step wizard with shared state. Progress dots at top.

**Step 1: Welcome** (~3s)
- Full-screen hero. "Meet Kira" headline. 3 bullet points (remembers, takes action, lives where you do). Single `[Get Started →]` button.
- Subtle background animation (CSS gradient shift — no heavy assets)

**Step 2: Connect AI** (~60s)
- "Connect Your AI Brain" headline
- Single card (Anthropic): text input for API key, "Get a key →" link to console.anthropic.com
- On paste/input: call `/api/v1/onboarding/validate-key` → show ✅ or ❌ with message
- "Skip for now" link (allows exploring UI without AI — chat will show "Connect AI in Settings" message)

**Step 3: Choose Model** (if key valid)
- Dropdown: Claude Sonnet 4 (recommended), Claude Opus 4
- Brief description of each: "Fast & smart" vs "Maximum intelligence, higher cost"

**Step 4: Personality** (~30s)
- "Who should Kira be?" headline
- 5 personality cards in a grid (2×3 on desktop, scrollable on mobile):
  - Professional 💼, Creative 🎨, Technical ⚙️, Friend 😊, Executive 🎯
  - Each card shows: name, emoji, 2-line description, sample message preview
  - Click to select (highlight with primary border)
- "Customize" link at bottom → expands 4 sliders: Formality (0-100), Humor (0-100), Verbosity (0-100), Proactivity (0-100)
- Live preview: as sliders move, sample message updates to reflect the personality

**Step 5: Set First Goal** (~60s)
- "What's one thing you want to accomplish?" headline
- Single text input, placeholder: "Launch my product by April..."
- Optional: deadline date picker
- On submit: store as the user's first Vision or Objective in the SOP hierarchy

**Step 6: Quick Tour** (~30s)
- Tooltip-style overlay highlighting 5 key areas: Sidebar nav, Command Center, Chat, Today view, Quick Add (Cmd+K)
- "Next" / "Skip Tour" buttons
- Use a lightweight tour library or custom positioned tooltips

**Step 7: First Conversation**
- Auto-navigate to `/chat`
- If AI key is configured: agent sends a first message matching the chosen personality. Example for Friend: "Hey! 👋 I'm Kira, nice to meet you! I saw you want to [goal]. That's exciting — want to break it down together?"
- If no AI key: show a card explaining how to connect later

### Auth Guard Update

In `src/client/components/AuthGuard.tsx`:
- After auth check, also check `/api/v1/onboarding/status`
- If `completed === false` → redirect to `/onboarding` instead of dashboard
- Add `/onboarding` route (no sidebar, no topbar — full-screen wizard)

## Commit Format
```
build(TASK-019): Onboarding wizard with personality creation
```

## Acceptance Test
```bash
# 1. New user flow
# Sign up → redirected to /onboarding (not dashboard)
# Complete all steps → land on /chat with Kira's first message

# 2. Skip API key
# Click "Skip for now" → continue wizard → chat shows setup prompt

# 3. Personality preview
# Select "Creative" → sample message is playful
# Select "Executive" → sample message is ultra-concise

# 4. Returning user
# Login as existing user with completed onboarding → goes straight to dashboard

# 5. Resume wizard
# Close browser at step 3 → reopen → wizard resumes at step 3

# 6. Settings access
# After onboarding, personality config accessible in Settings
```
