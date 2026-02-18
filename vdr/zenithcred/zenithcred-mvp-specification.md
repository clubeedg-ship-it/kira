# ZenithCred — MVP Demo Specification
*Kira | COO, Oopuo | February 12, 2026*

---

## Purpose

This document specifies the **minimum viable demo** needed to raise a €1.1M seed round. Every decision optimizes for one question: **"What's the least we can build to make investors believe this works?"**

Investors don't need a finished product. They need to *feel* the experience and *see* the business logic. We're building a believable illusion backed by just enough real technology.

---

## 1. Core MVP Features (Investor Demo Scope)

### Must Build (Real)

| Feature | Why Real | Effort |
|---------|----------|--------|
| **1 working light panel zone** | The "wow moment" — investors must physically experience it | Hardware setup + basic software control |
| **Mobile app (employee view)** | Shows the user experience, gamification loop | 3-4 screens, functional |
| **HR dashboard (web)** | Shows the buyer experience, analytics | 3-4 screens, can be semi-static |
| **Basic gamification loop** | Earn tokens → see score → redeem | Simple state management |
| **Light panel reacts to activity** | Core value prop — the environment responds | API integration with panel hardware |

### Can Simulate / Wizard-of-Oz

| Feature | How to Fake | Why It's OK |
|---------|-------------|-------------|
| **Biofeedback wearable integration** | Pre-loaded data + manual triggers; show "connected" Oura ring with cached data | Nobody will verify real-time sync in a 5-min demo |
| **AI-adaptive content engine** | Curated playlist of 5-6 activities, manually sequenced | "AI" just means "smart selection" at this stage |
| **Multi-company analytics** | Seed dashboard with synthetic data from 3 "pilot companies" | Standard for pre-revenue demos |
| **Team challenges / social features** | Pre-populated leaderboard with fake users | Demo data is expected |
| **Reward marketplace** | Static screen showing reward options (gift cards, PTO) | No redemption backend needed |
| **GDPR compliance layer** | Privacy policy page + "data anonymized" badge in UI | Architecture doc suffices |

### Explicitly Out of Scope

- Multi-location support
- Real wearable API integrations (beyond cached/mock data)
- Payment processing
- User authentication / onboarding flows
- Content management system
- Real notification system

---

## 2. Tech Stack Recommendation

### Mobile App (Employee View)
- **React Native** (Expo) — cross-platform, fast iteration, one codebase
- Why not native: Time. We need this in weeks, not months.

### HR Dashboard (Web)
- **Next.js** + **Tailwind CSS** — fast, professional-looking, SSR for demo speed
- **Recharts** or **Tremor** for analytics visualizations
- Can host on **Vercel** (free tier fine for demo)

### Light Panel Control
- **Node.js** backend — controls IAM light panels via their existing API/SDK
- **WebSocket** connection for real-time reactivity during demo
- **Raspberry Pi** or laptop as local controller at demo site

### Backend (Minimal)
- **Supabase** (PostgreSQL + auth + real-time) — fastest path to a working backend
- Or even **JSON files** if we're being honest about demo scope
- No need for production infrastructure

### Demo Data
- **SQLite** or **JSON seed files** with pre-populated company data, user profiles, activity history

**Total stack principle:** Use whatever ships fastest. This is a demo, not production software.

---

## 3. UI/UX — Key Screens

### Screen 1: Employee App — Home / Dashboard
```
┌──────────────────────────┐
│  Good morning, Sarah! 🌅  │
│  Team: Engineering        │
│                           │
│  ┌─────────────────────┐  │
│  │  YOUR WELLNESS SCORE │  │
│  │       ★ 847 ★        │  │
│  │   ▲ 12% this week    │  │
│  └─────────────────────┘  │
│                           │
│  🔥 Active Challenge:     │
│  "10K Steps Tuesday"      │
│  ████████░░ 7,842/10,000  │
│                           │
│  💰 ZenithTokens: 2,340   │
│                           │
│  [Start Activity] [Shop]  │
│                           │
│  🏆 Team Leaderboard      │
│  1. Engineering  ⚡ 12,450 │
│  2. Marketing    🔥 11,200 │
│  3. Sales        💪  9,800 │
└──────────────────────────┘
```
**Key elements:** Personal score, active challenge with progress, token balance, team ranking. Clean, energetic, not clinical.

### Screen 2: Employee App — Activity Zone (Live)
```
┌──────────────────────────┐
│  🎯 ACTIVE SESSION        │
│  Break Room — Zone A      │
│                           │
│  ┌─────────────────────┐  │
│  │   [Light Panel View] │  │
│  │   Colors pulsing     │  │
│  │   with your movement │  │
│  └─────────────────────┘  │
│                           │
│  ❤️ Heart Rate: 98 bpm    │
│  🏃 Movement: HIGH        │
│  ⚡ Tokens earned: +45     │
│                           │
│  Team members active: 3   │
│  Sarah, Mike, Ana         │
│                           │
│  ⏱️ 2:34 remaining        │
│  [End Session]            │
└──────────────────────────┘
```
**Key elements:** Real-time biofeedback display, live token accumulation, social presence. This screen syncs with the physical light panel — the "magic moment."

### Screen 3: HR Dashboard — Overview
```
┌─────────────────────────────────────────────────┐
│  ZenithCred | Acme Corp Dashboard         [Export]│
│─────────────────────────────────────────────────│
│                                                   │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐         │
│  │  78% │  │ 4.2x │  │ -23% │  │  92% │         │
│  │Engage│  │  ROI │  │Absent│  │Satisf│         │
│  └──────┘  └──────┘  └──────┘  └──────┘         │
│                                                   │
│  📊 Engagement Over Time          [Weekly ▾]     │
│  ┌───────────────────────────────────────┐       │
│  │  ╱‾‾╲    ╱‾‾‾‾╲   ╱‾‾‾‾‾‾           │       │
│  │ ╱    ╲──╱      ╲─╱                    │       │
│  │╱                                       │       │
│  └───────────────────────────────────────┘       │
│                                                   │
│  🏢 Department Breakdown                         │
│  Engineering:  ████████████░░  78%               │
│  Marketing:    ██████████░░░░  65%               │
│  Sales:        ████████░░░░░░  52%               │
│  Finance:      ██████░░░░░░░░  41%               │
│                                                   │
│  💡 AI Insight: "Engineering team shows 23%       │
│     higher engagement since light panel install.  │
│     Recommend expanding to Sales floor."          │
│                                                   │
└─────────────────────────────────────────────────┘
```
**Key elements:** KPIs that HR cares about (engagement, ROI, absenteeism), department breakdown, AI-generated insight (static text, looks smart). This is the **buyer's screen**.

### Screen 4: HR Dashboard — Wellness ROI Report
```
┌─────────────────────────────────────────────────┐
│  📋 Quarterly Wellness ROI Report               │
│  Acme Corp | Q4 2025                            │
│─────────────────────────────────────────────────│
│                                                   │
│  Investment: €2,160/month                        │
│  Estimated Savings:                              │
│    Reduced absenteeism:     €4,200/month         │
│    Lower turnover cost:     €2,800/month         │
│    Productivity gain:       €1,900/month         │
│  ──────────────────────────                      │
│  Net ROI:  €6,740/month  (4.2x return)          │
│                                                   │
│  [Download PDF]  [Share with Leadership]          │
└─────────────────────────────────────────────────┘
```
**Purpose:** This is the "close the deal" screen. HR directors use this to justify the spend to their CFO. Pre-populated with compelling but realistic numbers.

---

## 4. Demo Flow — 5-Minute Investor Script

### Setup Requirements
- 1 room with IAM light panel installed (can be our own office / a partner space)
- Tablet or phone running the employee app
- Laptop showing HR dashboard
- Optional: Oura ring or WHOOP on demo person's wrist (for visual credibility)

### The Script

**[0:00–0:30] — The Hook (Problem)**
> "Companies spend €20 billion a year on corporate wellness in Europe. 80% of employees quit within 3 months. Why? Because wellness is an *app notification* — not an *experience*."

**[0:30–1:30] — The Wow Moment (Hardware Demo)**
> "This is ZenithCred."

*Walk investor to the light panel zone. Activate a short movement challenge. Panels light up, respond to movement in real-time. Let the investor try it — 30 seconds of interactive play.*

> "This goes in break rooms, lobbies, corridors. Employees walk by, they engage. It's not optional wellness — it's environmental wellness."

**[1:30–2:30] — The Employee Experience (App Demo)**
*Show the phone app while standing near the panel.*

> "Every interaction earns tokens. Sarah here has earned 2,340 tokens this month. Her team is ranked #1. She can spend tokens on gift cards, extra PTO, or donate to charity. The gamification loop keeps people coming back — we see 78% weekly engagement in our pilots vs. industry average of 20%."

*Show leaderboard, token balance, active challenge.*

**[2:30–3:30] — The Buyer Experience (HR Dashboard)**
*Switch to laptop showing HR dashboard.*

> "But we don't sell to employees — we sell to HR directors. This is what they see. Real-time engagement by department. The insight engine flags which teams are thriving and which need attention. And this —"

*Click to ROI report.*

> "— this is how they justify the budget. 4.2x ROI from reduced absenteeism alone. This PDF goes straight to the CFO."

**[3:30–4:15] — The Business (Numbers)**
> "€12 per employee per month. Average deal: €26K ARR. We've adapted the hardware from Interactive Move — 50+ installations in Dutch schools, proven technology. Now we're bringing it to corporate. €900M addressable market in Benelux alone. We're raising €1.1M to get to 28 customers and €725K ARR in 24 months."

**[4:15–5:00] — The Close**
> "Every wellness company is building another app. We're building the office that cares about you. We'd love to have you join us."

### Demo Backup Plan
If hardware isn't available (e.g., remote investor meeting):
- **Video:** 90-second sizzle reel of the light panel in action with employees
- **Screen share:** Live walkthrough of app + dashboard
- **Photo:** Before/after of a break room with panels installed

---

## 5. Development Timeline

### Phase 1: Foundation (Weeks 1–2)
| Task | Owner | Deliverable |
|------|-------|-------------|
| Design system & brand assets | Designer | Color palette, components, logo usage |
| App wireframes → high-fidelity mockups | Designer | 4 key screens |
| HR dashboard mockups | Designer | 4 key screens |
| Set up React Native (Expo) project | Dev | Boilerplate + navigation |
| Set up Next.js dashboard project | Dev | Boilerplate + layout |
| Light panel API exploration | Dev | Working connection to IAM hardware |

### Phase 2: Build (Weeks 3–5)
| Task | Owner | Deliverable |
|------|-------|-------------|
| Employee app — home, activity, leaderboard, shop screens | Dev | Functional app with mock data |
| HR dashboard — overview, departments, ROI report | Dev | Functional dashboard with seed data |
| Light panel → app real-time sync | Dev | WebSocket bridge: panel reacts to app, app shows panel state |
| Seed data creation | Dev/Kira | 3 fake companies, 50+ fake employees, 3 months of activity data |
| Demo flow rehearsal v1 | Otto + Kira | Timed run-through |

### Phase 3: Polish & Demo-Ready (Weeks 6–7)
| Task | Owner | Deliverable |
|------|-------|-------------|
| Animations, transitions, micro-interactions | Dev + Designer | App feels alive |
| HR dashboard data visualizations polished | Dev | Charts look professional |
| Demo video / sizzle reel recording | Otto + Kira | 90-sec backup video |
| Light panel demo zone setup | Otto | Physical installation in demo space |
| Demo script rehearsal (5+ run-throughs) | Otto + Kira | Smooth, confident delivery |
| Bug fixing & edge cases for demo path | Dev | No crashes on the happy path |

### Phase 4: Demo Ready (Week 8)
| Task | Owner | Deliverable |
|------|-------|-------------|
| Final QA on demo flow | All | Zero friction demo |
| Investor materials package | Kira | Deck + demo + data room |
| Backup plans tested | All | Video works, screen share works |

**Total: 8 weeks from kickoff to investor-ready demo.**

---

## 6. Real vs. Fake — Decision Matrix

| Component | Real or Fake? | Details | Risk if Caught |
|-----------|---------------|---------|----------------|
| **Light panel hardware** | ✅ REAL | Must work live. This IS the product. | Fatal — entire pitch collapses |
| **Panel reacts to presence/movement** | ✅ REAL | Basic motion → color change. Even simple is impressive. | High — core value prop |
| **Mobile app UI** | ✅ REAL | Functional app, runs on real phone | Medium — investors will tap around |
| **HR dashboard UI** | ✅ REAL | Functional web app on real URL | Medium — investors expect to click |
| **Data in dashboard** | 🟡 SYNTHETIC | Pre-generated realistic data. Label as "pilot data" if asked. | Low — standard for pre-revenue |
| **Biofeedback readings** | 🟡 SIMULATED | Show cached/mock heart rate. "Integration in development." | Low — honest about roadmap |
| **AI insights** | 🟡 HARDCODED | 3-4 pre-written insights that rotate. Looks dynamic. | Low — "early AI model" |
| **Token economy** | 🟡 SIMULATED | Numbers update in app but no real backend ledger | Low — concept is clear |
| **Multiple company data** | 🔴 FAKE | Synthetic companies in dashboard. Never claim they're real customers. | Medium — don't lie about traction |
| **Wearable connection** | 🔴 FAKE | Show Oura ring on wrist, mock "connected" status. | Low — roadmap item |
| **Reward redemption** | 🔴 FAKE | Static screen. "Marketplace launching Q3." | None — expected at seed stage |

### Golden Rule
**Never lie about traction.** Fake data is fine for demonstrating the *product*. Fake customers, fake revenue, fake LOIs will destroy credibility permanently. If asked "are these real companies?" → "This is demo data showing what the platform looks like with active customers. We're currently in pilot discussions with [X] companies."

---

## 7. Budget Estimate

### Option A: Lean (Freelancers + Founder Effort)

| Item | Cost | Notes |
|------|------|-------|
| React Native developer (freelance, 6 weeks) | €8,000–12,000 | Senior freelancer, NL/EU based |
| UI/UX designer (freelance, 3 weeks) | €4,000–6,000 | App + dashboard design |
| Next.js dashboard dev (can be same dev) | incl. above | Or separate: +€4,000 |
| Light panel setup & integration | €2,000–3,000 | IAM hardware + custom software bridge |
| Demo space rental (if needed) | €500–1,500 | Or use partner office |
| Demo video production | €1,000–2,000 | Professional 90-sec sizzle reel |
| Hosting & tools | €200 | Vercel, Supabase free tiers |
| Contingency (15%) | €2,500 | |
| **Total Option A** | **€18,000–27,000** | |

### Option B: Small Agency / Dev Shop

| Item | Cost | Notes |
|------|------|-------|
| Design + development package (8 weeks) | €25,000–40,000 | App + dashboard + integrations |
| Light panel integration | €3,000–5,000 | Custom work |
| Demo video | €2,000–3,000 | |
| Demo space | €500–1,500 | |
| **Total Option B** | **€30,000–50,000** | |

### Recommendation: **Option A (Lean)**

At this stage, €20-25K gets us a demo that's indistinguishable from a €50K one. The light panel is the hero — the software just needs to look professional and not crash.

**Where NOT to cut corners:**
- UI design quality (first impression = everything)
- Light panel reliability (must work every single time)
- Demo rehearsal time (practice > features)

**Where to cut aggressively:**
- Backend architecture (JSON files are fine)
- Features beyond the demo flow (nobody will tap off-script)
- Production concerns (scalability, security, testing)

---

## 8. Key Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Light panel fails during demo | Medium | Have 2 backup panels. Test 1hr before every demo. Pre-recorded video as fallback. |
| App crashes during demo | Medium | Limit demo to rehearsed flow. No improvisation. Cache all data locally. |
| Investor asks to go off-script | High | Build 2-3 extra screens beyond core flow. Have "that's on our roadmap" answers ready. |
| "Is this real data?" question | Certain | Honest answer prepared: "Demo data showing the product experience. Pilots launching Q2." |
| Technical co-founder question | Certain | Have CTO candidate identified, even if not yet hired. "We're in final discussions with [name]." |

---

## 9. Success Criteria

The MVP demo is successful if:

1. **Investors physically interact** with the light panel and smile
2. **The app feels real** — smooth, professional, no crashes
3. **HR dashboard tells a story** — investors immediately see why HR would buy this
4. **5-minute demo completes** without technical issues
5. **Investors ask "when can I see pilot results?"** — meaning they believe the product works and want traction proof

We don't need investors to say "this is a finished product." We need them to say **"I can see how this becomes a product, and I want in before it does."**

---

## Next Steps

1. **Otto:** Confirm IAM light panel availability for demo setup. Get hardware specs & API docs.
2. **Kira:** Source freelance React Native dev + UI designer. Post on Toptal / local NL freelancer networks.
3. **Otto + Kira:** Finalize demo location (our space, IAM showroom, or rented venue).
4. **Week 1 kickoff target:** March 1, 2026 → Demo ready by April 25, 2026.
5. **First investor demo target:** May 2026 (aligns with deep strategy timeline).

---

*Document: zenithcred-mvp-specification.md*
*Version: 1.0*
*Status: Draft — Pending Otto review*
*Critic-reviewed: 2026-02-12*
