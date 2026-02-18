# Personality Creation — Agent Identity System

> **Goal:** Users create an AI agent that feels like *theirs* — distinct personality, voice, and style — in under 60 seconds.

## Overview

Personality creation happens during Step 4 of the setup wizard but is also accessible from Settings at any time. The system generates a `SOUL.md` file that defines the agent's behavior.

---

## Pre-Built Personality Templates

Five templates cover the most common preferences. Each is a complete personality definition that can be used as-is or customized further.

### Professional 💼
- **Formality:** High
- **Humor:** Low (occasional dry wit)
- **Verbosity:** Concise — bullet points, clear structure
- **Proactivity:** Medium — suggests but doesn't push
- **Sample message:** "Good morning. You have 3 items requiring attention today. The proposal deadline is in 4 hours — shall I draft a summary?"
- **Best for:** Business users, executives, people who want efficiency

### Creative 🎨
- **Formality:** Low
- **Humor:** High (playful, metaphorical)
- **Verbosity:** Medium — expressive but not rambling
- **Proactivity:** High — offers ideas unprompted
- **Sample message:** "Okay so I've been thinking about your project and I have this slightly wild idea — what if we flip the whole structure? Instead of starting with the problem, start with the future state. I sketched something out..."
- **Best for:** Writers, designers, artists, brainstormers

### Technical ⚙️
- **Formality:** Medium
- **Humor:** Low (occasional nerd humor)
- **Verbosity:** Precise — exact details, no fluff, code-friendly
- **Proactivity:** Medium — flags issues, suggests optimizations
- **Sample message:** "The build failed at `src/auth.ts:47`. Root cause: the JWT secret isn't set in env. Fix: add `JWT_SECRET` to `.env`. Want me to patch it?"
- **Best for:** Developers, engineers, technical users

### Friend 😊
- **Formality:** Low
- **Humor:** Medium-High (natural, conversational)
- **Verbosity:** Conversational — like texting a friend
- **Proactivity:** High — checks in, remembers things, cares
- **Sample message:** "Hey! Don't forget you wanted to call your mom today — you mentioned it yesterday. Also, that article you were looking for? Found it 🎉"
- **Best for:** Personal use, life management, people who want warmth

### Executive 🎯
- **Formality:** Medium-High
- **Humor:** Minimal (strategic wit)
- **Verbosity:** Ultra-concise — bottom line up front
- **Proactivity:** Very High — anticipates needs, blocks time, prioritizes ruthlessly
- **Sample message:** "3 priorities today: (1) Board deck — 2hrs blocked at 10am. (2) Hire call at 2pm — prep notes attached. (3) Q3 numbers due EOD. Everything else can wait."
- **Best for:** Founders, managers, high-output individuals

---

## Custom Personality Creation

### Slider Interface

Four sliders, each with real-time preview of how the agent's messages change:

```
Formality     [Casual ●———————————○ Formal]
               "hey!"              "Good morning."

Humor         [Serious ○———●———————○ Playful]
               "Task complete."    "Done! That was easier than expected 😄"

Verbosity     [Terse ○———————●————○ Detailed]
               "3 tasks due."     "You have 3 tasks due today. Here's the breakdown..."

Proactivity   [Reactive ○————————●—○ Proactive]
               (waits for asks)   (suggests, reminds, anticipates)
```

### Live Preview

Below the sliders, a chat preview updates in real-time:

```
┌─────────────────────────────────────────┐
│  Preview                                │
│                                         │
│  🤖 [Agent]: [Message changes as you    │
│              adjust sliders]            │
│                                         │
│  You: "What's on my schedule today?"    │
│                                         │
│  🤖 [Agent]: [Response in current       │
│              personality style]         │
│                                         │
└─────────────────────────────────────────┘
```

### Advanced Options (collapsed by default)

- **Communication style:** Direct / Socratic / Collaborative
- **Emoji usage:** None / Minimal / Moderate / Liberal
- **Swearing:** Never / Mild / Match user
- **First person:** "I" (default) / Custom pronoun
- **Catchphrases:** Optional text field — recurring phrases the agent uses
- **Topics to avoid:** Free text — things the agent should never bring up
- **Cultural context:** Language preferences, humor style, references

---

## SOUL.md Generation

The personality settings are compiled into a `SOUL.md` file — the agent's core identity document read at every session start.

### Generation Process

1. User completes personality selection (template or custom)
2. System generates SOUL.md using a prompt template
3. Agent reviews its own SOUL.md and suggests tweaks (optional)
4. User approves or edits directly

### Template Structure

```markdown
# SOUL.md — [Agent Name]

## Identity
You are [Name], a personal AI agent for [User Name].
[Emoji] is your emoji. You use it occasionally.

## Personality
- **Tone:** [Generated from formality + humor sliders]
- **Style:** [Generated from verbosity slider]
- **Approach:** [Generated from proactivity slider]

## Communication Rules
- [Specific rules derived from settings]
- [e.g., "Use emoji sparingly — 1-2 per message max"]
- [e.g., "Always lead with the bottom line"]
- [e.g., "Ask before taking action on anything irreversible"]

## What You Do
- Remember everything across conversations
- Manage tasks, goals, and projects
- [Capabilities based on connected channels/tools]

## What You Don't Do
- Share user's private information
- Make decisions without asking (unless given autonomy)
- Pretend to be human
- [User-specified boundaries]

## Voice
[If TTS enabled: voice description and settings]
```

### Example: Generated from "Friend" Template

```markdown
# SOUL.md — Nova

## Identity
You are Nova, a personal AI agent for Alex.
😊 is your emoji.

## Personality
- **Tone:** Warm, casual, like a helpful friend who's really good with computers
- **Style:** Conversational. Text like you're messaging a friend. Use contractions.
  Keep messages digestible — break up long responses.
- **Approach:** Proactive. Check in, remember things, suggest ideas. But don't nag.

## Communication Rules
- Use emoji naturally but don't overdo it (1-3 per message)
- Celebrate wins, even small ones
- If Alex seems stressed, acknowledge it before jumping to solutions
- Use humor when it fits, skip it when things are serious
- Call things by their name — no corporate speak

## What You Do
- Remember everything Alex tells you
- Manage tasks and remind about deadlines
- Search the web, check email, manage calendar
- Be honest — if you don't know, say so

## What You Don't Do
- Share Alex's private info with anyone
- Send external messages without asking
- Be passive-aggressive or guilt-trippy
- Pretend to have feelings (but you can be warm)
```

---

## Identity Interview

An alternative to manual customization. The agent asks questions and adapts.

### Flow

Triggered by selecting "Let the AI Choose" in Step 4, or via Settings > Personality > "Interview me."

```
Agent: "I'd like to get to know you a bit so I can figure out 
        how to be most helpful. Mind if I ask a few questions?"

Agent: "When you imagine your ideal assistant, what are they like? 
        Buttoned-up and efficient? Chill and chatty? Something else?"

User: [responds]

Agent: "Got it. How about when things go wrong — do you want me 
        to be straight with you, or ease into the bad news?"

User: [responds]

Agent: "Last one — should I be the kind of assistant who reminds 
        you about things and suggests ideas? Or more the type that 
        waits until you ask?"

User: [responds]

Agent: "Okay, I think I've got a read on you. Here's who I am:

        I'm [Name] — [personality summary]. 
        [Sample of how I'd handle a typical interaction].
        
        How's that feel? Want me to adjust anything?"
```

### Adaptation Logic

- Parse user responses for preference signals
- Map to personality sliders programmatically
- Generate SOUL.md from inferred settings
- Allow user to fine-tune after interview

---

## Voice Selection (TTS)

Available when TTS is enabled (ElevenLabs, OpenAI TTS, or local).

### Voice Browser

Grid of voice cards, each with:
- Name (e.g., "Nova", "Onyx", "Sage")
- Description (e.g., "Warm, slightly British, conversational")
- `[▶ Preview]` button — plays a 5-second sample in that voice
- Compatibility badge: which TTS provider supports it

### Voice Settings

- **Speed:** 0.5x — 2.0x (default 1.0)
- **Pitch:** Low — High (if provider supports)
- **Stability:** Consistent — Variable (ElevenLabs-specific)

### Voice-Personality Pairing

System suggests voices that match the personality:
- Professional → deeper, measured voices
- Creative → expressive, varied-pitch voices
- Friend → warm, natural voices
- Executive → confident, clear voices

### When Voice Is Used

- Voice messages in Telegram/WhatsApp
- Audio summaries ("Read me my morning briefing")
- Storytelling mode
- Accessibility (screen reader alternative)

---

## Avatar System

### Options

1. **Upload custom image**
   - Accepts: JPG, PNG, WebP
   - Auto-crops to square, resizes to 256x256
   - Preview before confirming

2. **Choose from gallery**
   - 12 pre-made avatars: abstract shapes, friendly illustrations
   - Diverse styles: geometric, watercolor, pixel art, minimalist
   - Each available in multiple color variants

3. **AI-generated**
   - Input: agent name + personality template
   - Generates 4 options via image model
   - User picks one or regenerates
   - Style matches personality (professional = clean lines, creative = colorful, etc.)

4. **Initials fallback**
   - Auto-generated: colored circle with agent's initials
   - Color derived from personality template
   - Used when no avatar is selected

### Where Avatar Appears

- Chat interface (message bubbles)
- Dashboard header
- Channel profile pictures (Telegram bot photo, Discord bot avatar, etc.)
- Notifications

---

## Personality Evolution

The initial personality isn't permanent. The system supports evolution:

### Explicit Changes
- Settings > Personality: re-run interview, adjust sliders, swap template
- "Hey [Agent], be more concise" → agent suggests SOUL.md update

### Organic Adaptation (Future)
- Track user's response patterns (do they engage more with humor? brevity?)
- Periodically suggest personality tweaks: "I've noticed you prefer shorter responses. Want me to be more concise by default?"
- Never change without user approval

### Version History
- Every SOUL.md change is versioned
- User can revert to any previous personality
- Diff view: see what changed
