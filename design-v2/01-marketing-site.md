# 01 — Landing / Splash Page

> Single page. Converts visitors to signups. No separate pages — everything on one scroll.

---

## Domain

- **URL:** TBD by Otto (`kira.ai`, `getkira.ai`, `usekira.ai`, or subdomain)
- **Not separate from platform** — same deployment. The splash page IS the `/` route for unauthenticated visitors. Authenticated users go straight to dashboard.

## Single-Page Layout (top to bottom)

```
┌──────────────────────────────────────────────────────────┐
│ [⚡ Kira]                              [Login] [Sign Up] │  ← Sticky nav bar
├──────────────────────────────────────────────────────────┤
│                                                          │
│              Your AI partner that actually                │
│              gets things done.                            │
│                                                          │
│   Remembers everything. Takes real action.               │
│   Lives where you do.                                    │
│                                                          │
│              [Get Started Free →]                         │
│                                                          │
│         ┌─────────────────────────────┐                  │
│         │   ✦ Dashboard screenshot    │                  │
│         │   or animated preview       │                  │
│         └─────────────────────────────┘                  │
│                                                          │
├──── Features ────────────────────────────────────────────┤
│                                                          │
│  🧠 Persistent Memory     ⚡ Takes Action    💬 Your Way │
│  Remembers context         Tasks, web,        Telegram,  │
│  across weeks.             code, calendar.    Discord,   │
│  No repeating yourself.    Not a chatbot.     Web, etc.  │
│                                                          │
├──── How It Works ────────────────────────────────────────┤
│                                                          │
│  1. Sign up (30 seconds)                                 │
│  2. Connect your AI (API key or use ours)                │
│  3. Start talking — Kira gets smarter every day          │
│                                                          │
│              [Get Started Free →]                         │
│                                                          │
├──── Pricing ─────────────────────────────────────────────┤
│                                                          │
│  Free          Pro ($X/mo)        Self-Hosted            │
│  50 msg/day    Unlimited          Your server            │
│  Web only      All channels       Full control           │
│  7-day memory  Unlimited memory   Everything             │
│                                                          │
│  [Start Free]  [Go Pro]           [Self-Host Docs →]     │
│                                                          │
├──── Footer ──────────────────────────────────────────────┤
│  Docs · GitHub · Discord · Privacy · Terms               │
│  Built by Oopuo                                          │
└──────────────────────────────────────────────────────────┘
```

## Auth: Inline Modals (No Separate Pages)

Clicking **[Login]** or **[Sign Up]** opens a modal overlay on the splash page — no navigation away.

### Sign Up Modal
```
┌─────────────────────────────┐
│         ⚡ Kira              │
│      Create your account     │
│                              │
│  [Email                    ] │
│  [Display Name             ] │
│  [Password                 ] │
│                              │
│  [Create Account →]          │
│                              │
│  ── or ──                    │
│  [G] Continue with Google    │
│  [⬡] Continue with GitHub   │
│                              │
│  Already have an account?    │
│  [Log in]                    │
└─────────────────────────────┘
```

### Login Modal
```
┌─────────────────────────────┐
│         ⚡ Kira              │
│       Welcome back           │
│                              │
│  [Email                    ] │
│  [Password                 ] │
│                              │
│  [Sign In →]                 │
│                              │
│  [Forgot password?]          │
│                              │
│  Don't have an account?      │
│  [Sign up]                   │
└─────────────────────────────┘
```

### Flow After Auth
```
Sign up → POST /api/auth/register → email with 6-digit code
  → modal shows "Enter verification code" input
  → POST /api/auth/verify { email, code } → receive JWT
  → close modal → redirect to /dashboard (Overview page)

Login → POST /api/auth/login → receive JWT
  → close modal → redirect to /dashboard
```

Email verification required. After register → 6-digit code sent → verify → JWT issued → enter platform.

## Routing Logic

```typescript
// Single app, single deployment
if (authenticated) {
  // Show dashboard (Overview, Chat, Tasks, etc.)
  <DashboardRoutes />
} else if (path === '/') {
  // Show splash page
  <SplashPage />
} else {
  // Any other path while unauthenticated → splash
  <Navigate to="/" />
}
```

No separate marketing repo. No separate deployment. One app serves everything.

## Design Language

- **Theme:** Dark. `#0F1117` bg, `#7C3AED` accent, `#E4E4E7` text.
- **Font:** Inter (system-ui fallback)
- **Aesthetic:** Linear / Vercel / Raycast — clean, minimal, dark, developer-friendly
- **Animations:** Subtle. Gradient shifts, fade-ins on scroll. No heavy assets.
- **Responsive:** Works on mobile. Single column on small screens.

## What This Is NOT

- Not a multi-page marketing site
- Not a separate repo or deployment
- Not something that needs its own CI/CD
- It's the front door of the same app
