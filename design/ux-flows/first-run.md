# First-Run Experience

> From install to first productive conversation in under 5 minutes. Every screen earns the next click.

---

## Overview

```
Install → Welcome → Name & Timezone → Connect Channels → First Goal → Agent Intro → Dashboard
         (30s)      (30s)              (60s)              (90s)        (60s)         Done!
                                                                          Total: ~4 minutes
```

---

## Screen 1: Welcome

**Time: 30 seconds**

```
┌─────────────────────────────────────┐
│                                     │
│            ✨ Kira                   │
│                                     │
│   Your AI-powered second brain      │
│   and productivity copilot.         │
│                                     │
│   I'll help you:                    │
│   • Track tasks and goals           │
│   • Research and work in background │
│   • Remember everything important   │
│   • Stay focused on what matters    │
│                                     │
│        [ Get Started →]             │
│                                     │
│   Already have an account? Sign in  │
└─────────────────────────────────────┘
```

**Decisions:** None. Single CTA.  
**Skip:** N/A  
**Error states:** None  

---

## Screen 2: Identity Setup

**Time: 30 seconds**

```
┌─────────────────────────────────────┐
│                                     │
│   What should I call you?           │
│                                     │
│   [_________________________]       │
│                                     │
│   Your timezone:                    │
│   [Auto-detected: UTC+1 Berlin ▾]  │
│                                     │
│   When does your day start?         │
│   ○ Early bird (6am)               │
│   ● Normal (8am)  ← default        │
│   ○ Night owl (10am)               │
│                                     │
│        [ Continue →]                │
│                                     │
└─────────────────────────────────────┘
```

**Defaults:** Timezone auto-detected from browser/device. Day start = 8am.  
**Skip:** Can't skip name (needed for personalization). Timezone/day-start have sensible defaults.  
**Error:** Invalid timezone → show picker. Empty name → "Just type a name or nickname."  

---

## Screen 3: Connect Your World

**Time: 60 seconds (optional steps)**

```
┌─────────────────────────────────────┐
│                                     │
│   Where do you want Kira?          │
│                                     │
│   ┌──────────────────────┐          │
│   │ 💬 Telegram     [Connect] │     │
│   │ 🎮 Discord      [Connect] │     │
│   │ 📧 Email        [Connect] │     │
│   │ 📅 Calendar     [Connect] │     │
│   └──────────────────────┘          │
│                                     │
│   Connect at least one to start.    │
│   You can add more later.           │
│                                     │
│   [ Skip — I'll use the web app → ] │
│                                     │
└─────────────────────────────────────┘
```

**Minimum:** 0 integrations (web app is always available)  
**Skip:** "Skip" uses web-only mode. Agent mentions integrations again after day 3 if none connected.  
**Error:** OAuth failure → "Connection failed. Try again or skip for now."  
**Each connection:** Opens OAuth flow in new tab/popup, returns to this screen on success with ✅  

---

## Screen 4: Your First Goal

**Time: 90 seconds**

This is where Kira differentiates from every other tool. Instead of showing an empty dashboard, the agent starts a conversation.

```
┌─────────────────────────────────────┐
│                                     │
│   Let's set your first goal.        │
│                                     │
│   Kira: "Hey [Name]! What's the    │
│   most important thing you're       │
│   working on right now? Could be    │
│   a project, a habit, or just       │
│   something you want to get done."  │
│                                     │
│   [_________________________________│
│   _________________________________ │
│   _________________________________]│
│                                     │
│   [ Tell Kira →]                    │
│                                     │
│   Not sure yet? [ Start exploring → ]│
│                                     │
└─────────────────────────────────────┘
```

**If user types a goal:**
```
Agent: "Great — 'Launch my portfolio website.' Let me break that down:

        🎯 Goal: Launch portfolio website
        
        Suggested tasks:
        1. Choose hosting platform
        2. Design layout / pick template
        3. Write content (bio, projects)
        4. Build and test
        5. Deploy and share
        
        These look right? I'll create them and track your progress."
        
        [✅ Looks good]  [✏️ Adjust]  [🔄 Different goal]
```

**If user skips:** Agent creates a "Getting Started" goal with tasks like "Explore Kira's features" and "Set your first real goal." Completed when user sets an actual goal.

**Error:** Empty submission → "Just type anything — even 'get organized' works. I'll help you refine it."

---

## Screen 5: Meet Your Agent

**Time: 60 seconds**

```
┌─────────────────────────────────────┐
│                                     │
│   One more thing — how should I     │
│   work with you?                    │
│                                     │
│   Notification style:               │
│   ○ Proactive (I'll suggest things) │  ← default
│   ○ On-demand (I wait for you)      │
│   ○ Minimal (essentials only)       │
│                                     │
│   Communication tone:               │
│   ○ Professional                    │
│   ○ Friendly  ← default            │
│   ○ Minimal                         │
│                                     │
│        [ Let's go! →]               │
│                                     │
└─────────────────────────────────────┘
```

**Defaults:** Proactive + Friendly (can change anytime from settings)  
**Skip:** Defaults apply automatically  

---

## Screen 6: Dashboard (First View)

**Time: Ongoing**

```
┌─────────────────────────────────────────────────┐
│ 🌱 Newcomer (Lv 1)  ░░░░░░░░░░ 0%  [Name] ▾   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Welcome to Kira, [Name]! 🎉                    │
│                                                 │
│  🎯 Your Goal: Launch portfolio website          │
│  ████░░░░░░ 0% (5 tasks)                        │
│                                                 │
│  Today's Focus:                                 │
│  □ Choose hosting platform                       │
│  □ Explore Kira's features ⭐ (tutorial)         │
│                                                 │
│  💬 Chat with Kira                              │
│  ┌─────────────────────────────────────┐        │
│  │ Kira: "All set up! Your first task  │        │
│  │ is 'Choose hosting platform.' Want  │        │
│  │ me to research the top options?"    │        │
│  │                                     │        │
│  │ [__________________________] Send   │        │
│  └─────────────────────────────────────┘        │
│                                                 │
│  ✨ Tip: Complete your first task to earn 25 XP  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### First-Session Guidance

The agent actively helps for the first session:
1. Suggests completing the tutorial task ("Explore Kira's features")
2. Offers to do research for the first real task
3. Celebrates first task completion with XP animation
4. Points out key UI elements naturally: *"See the XP bar up top? That'll fill up as you get things done."*

### Tutorial Task: "Explore Kira's Features"

Interactive checklist the agent walks through:
- [ ] Complete a task (tap the checkbox on any task)
- [ ] Ask Kira a question (type anything in chat)
- [ ] Store a memory ("Remember that I prefer dark mode")
- [ ] Check your progress (tap the goal to see breakdown)

Each completed item: +25 XP, agent celebration, brief explanation of what they just did.

Completing all 4: **"Explorer's Start" achievement (Common, +100 XP)**

---

## Error States & Recovery

| Error | Recovery |
|---|---|
| App crash during onboarding | Resume from last completed screen (state saved per step) |
| Network loss | Offline indicator, queue actions, sync when back |
| OAuth failure | "Try again" button + "Skip for now" option |
| User closes mid-onboarding | Next open resumes where they left off |
| User clears data | Full restart, but agent notices: "Looks like a fresh start. Welcome back!" |

---

## Design Principles

1. **Every screen earns the next click** — no screen is "just collecting info." Each one delivers value or builds anticipation.
2. **Conversation over forms** — the goal-setting screen is a chat, not a form. This is Kira's differentiator.
3. **Immediate value** — by the end of onboarding, the user has a goal, tasks, and an agent ready to help. Not an empty dashboard.
4. **Skip everything** — power users can skip to dashboard in 30 seconds. Nothing is mandatory except a name.
5. **No account creation wall** — start using immediately, create account when they want to sync/persist (or auto-create with connected channel).
