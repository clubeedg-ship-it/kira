# ZenithCred — Product Design Document

**Version:** 1.2  
**Date:** February 11, 2026  
**Status:** Founder Review / Investor-Ready  

---

## Executive Summary

**ZenithCred** turns physical spaces into interactive wellness zones by combining floor/wall projection hardware, biofeedback sensors, and gamification. Schools improve student health scores; corporations reduce burnout and healthcare costs.

**Market:** Corporate wellness ($16B+, 9.4% CAGR). Mental health and preventive care are top employer priorities post-COVID.

**How it works:** Participants interact with projected wellness activities → biofeedback sensors measure real-time health metrics → gamification engine awards credits and ranks institutions → dashboards show ROI.

**Differentiation:** No competitor combines interactive projection hardware + biofeedback + institutional gamification. Tovertafel (Dutch, €8K+/unit) proved the hardware-wellness market but is limited to tabletop dementia care. ZenithCred is the full-stack platform across schools and corporate.

**Business model:** Hardware installation (€5K–15K) + SaaS subscription (€8–15/seat/month). Target: 60%+ gross margins at scale on recurring revenue.

**MVP timeline:** 8–12 weeks to demo-ready prototype (simulated biofeedback + real gamification + dashboard).

**Ask:** €1.1M seed round at €2.5–3.5M pre-money valuation. Use of funds: 40% product development, 25% hardware pilots, 20% sales, 15% operations.

> **Biofeedback approach:** ZenithCred leads with clinically proven biometrics — HRV, heart rate, respiratory rate, and movement analysis. These have strong RCT evidence for stress reduction and wellness improvement in workplace settings. EEG-based "brain-sensing meditation" is offered as an optional premium tier for institutions that want cutting-edge cognitive wellness — positioned as exploratory, not diagnostic.

---

## 1. Product Vision

### What Is ZenithCred?

ZenithCred is a **wellness gamification platform** that transforms physical spaces — school gyms, corporate lobbies, break rooms — into interactive wellness zones. By combining Interactive Move's floor/wall projection hardware with wearable biofeedback sensors and a robust gamification engine, ZenithCred turns health improvement into a measurable, competitive, and rewarding institutional activity.

Participants step onto a projected interactive surface, perform guided wellness activities (movement games, breathing exercises, cognitive training), and receive real-time biofeedback scores based on clinically proven metrics — heart rate variability (HRV), respiratory rate, and movement quality. Their individual improvements aggregate into institutional "wellness credits" — a currency that unlocks rewards, fuels leaderboards, and creates a visible culture of health.

### Who Is It For?

| Segment | Why They Care |
|---|---|
| **K-12 Schools & Universities** | Measurable student wellness outcomes, stress/fitness benchmarks, differentiation for enrollment |
| **Corporate HR / People Ops** | Reduced healthcare costs, engagement metrics, retention tool, ESG/wellness reporting |
| **Wellness Program Providers** | Turnkey hardware+software solution to offer clients |
| **Insurance Partners** (Phase 3) | Actuarial data on institutional wellness trends |

### Why Now?

1. **Post-pandemic wellness priority** — Corporate wellness budgets have doubled since 2020. Schools are mandated to address student mental health.
2. **Hardware maturity** — Interactive Move projectors are commercially proven. Consumer HRV sensors (Polar H10, Apple Watch) are clinically validated and affordable. Existing devices people already own can participate.
3. **Gamification literacy** — A generation raised on Duolingo, Peloton, and Ring Fit understands gamified health.
4. **ESG & social credit momentum** — Institutions want visible, quantifiable wellness metrics for stakeholders and regulators.

### One-Line Pitch

> **"Peloton meets Duolingo for institutional wellness — powered by interactive projectors and biofeedback sensors."**

---

## 2. User Personas

### Persona 1: Sarah Chen — School Administrator

- **Role:** Vice Principal, K-8 public school
- **Age:** 44
- **Goals:** Improve measurable student wellness outcomes, justify wellness budget to school board, reduce behavioral incidents
- **Frustrations:** Current PE programs have no measurable outcomes; wellness initiatives feel fluffy; no data to show the board
- **ZenithCred value:** Aggregate wellness score dashboards (HRV improvement, activity levels, stress indicators) she can present at board meetings. Visible leaderboard in the school lobby showing the school's wellness ranking vs. district peers.
- **Tech comfort:** Moderate. Uses Google Workspace daily. Needs clean dashboards, not raw data.

### Persona 2: Marcus Thompson — Corporate HR Manager

- **Role:** Director of People & Culture, 500-person tech company
- **Age:** 38
- **Goals:** Reduce healthcare claim costs, boost employee engagement survey scores, create visible wellness culture for recruiting
- **Frustrations:** Gym subsidies have 12% utilization. Nobody uses the meditation app. Wellness stipends feel like wasted budget.
- **ZenithCred value:** Department-vs-department leaderboards drive organic competition. Weekly wellness reports auto-feed into his HR dashboard. The interactive zone in the office lobby becomes a conversation piece for recruits.
- **Tech comfort:** High. Wants API integrations with existing HRIS.

### Persona 3: Priya Patel — Individual Participant (Employee/Student)

- **Role:** Marketing associate or 7th-grade student
- **Age:** 14–35
- **Goals:** Have fun, earn rewards, see personal progress, compete with peers
- **Frustrations:** Corporate wellness feels like homework. School PE is boring.
- **ZenithCred value:** 3-minute interactive games that feel like play, not exercise. Personal streaks and levels. Tangible rewards (gift cards, extra break time, school store credits). Seeing her name on the team leaderboard.
- **Tech comfort:** High. Native mobile user. Expects instant feedback.

### Persona 4: David Okafor — ZenithCred Platform Admin

- **Role:** ZenithCred customer success / deployment engineer
- **Age:** 30
- **Goals:** Onboard institutions quickly, monitor hardware health remotely, ensure data quality, handle escalations
- **Frustrations:** Hardware calibration issues in the field. Institutions that don't follow setup guides. Sensor connectivity drops.
- **ZenithCred value:** Centralized admin portal with remote hardware diagnostics, automated calibration checks, and institution health scores.
- **Tech comfort:** Expert. Needs CLI-level access alongside the GUI.

---

## 3. Core Features

### 3.1 Hardware Integration Module

**Projector Management**
- Auto-discovery of Interactive Move projectors on local network
- Remote configuration: projection area, brightness, content mapping
- Multi-projector sync for larger spaces (gym floors, hallways)
- Health monitoring: lamp hours, temperature, connectivity status
- Content push: deploy new activity visuals OTA

**Sensor Management**
- Supported sensors (Core Tier — clinically validated):
  - **Heart rate + HRV:** Chest strap (Polar H10 compatible) or wrist-worn (BLE). HRV is the gold standard for stress/recovery measurement with strong RCT evidence.
  - **Respiratory rate:** Derived from chest strap or dedicated breathing sensor (BLE)
  - **Movement:** Projector-integrated motion tracking (camera-based, no wearable needed)
- Supported sensors (Premium Tier — exploratory):
  - **EEG meditation:** EEG headband (Muse 2 compatible) for guided "brain-sensing meditation" sessions. Positioned as mindfulness enhancement, NOT diagnostic brain assessment.
  - **Lung capacity:** Portable spirometer (BLE-connected)
- BYOD support: participants can use their own Apple Watch, Garmin, or Polar device via BLE
- Sensor pairing: NFC tap or QR scan to link sensor → participant profile
- Real-time signal quality indicator (green/yellow/red)
- Automatic sensor pool management (shared devices for walk-up sessions)

**Calibration**
- Guided setup wizard: "Stand here, look at the dot, breathe normally"
- Projector alignment tool: keystone correction, edge blending
- Sensor baseline capture per participant (first-session calibration)
- Scheduled recalibration reminders

### 3.2 Biofeedback Engine

**Metrics Captured**

| Metric | Source | Sampling Rate | What It Measures |
|---|---|---|---|
| Heart Rate (HR) | Chest/wrist strap | 1 Hz | Cardiovascular effort |
| **Heart Rate Variability (HRV)** | **Chest strap** | **Per-session** | **Stress recovery, autonomic balance (PRIMARY METRIC)** |
| Respiratory Rate | Chest strap derived | 0.5 Hz | Breathing quality, relaxation response |
| Movement Quality | Projector camera | 30 fps | Physical activity intensity, accuracy |
| Lung Capacity (FEV1) | Spirometer (Premium) | Per-session | Respiratory health |
| EEG Meditation Score | EEG headband (Premium) | 256 Hz → 1 Hz | Mindfulness depth, focus (exploratory — not diagnostic) |

**Processing Pipeline**
1. **Raw capture** — Sensor data streams via BLE to local edge device (Raspberry Pi or mini-PC at installation site)
2. **Edge processing** — Noise filtering, R-peak detection (HR), HRV computation (RMSSD, SDNN). Real-time scores computed locally for <100ms feedback latency. EEG artifact rejection only for Premium tier sessions.
3. **Session scoring** — At session end, composite "Wellness Score" (0-100) calculated from weighted metrics. Weights configurable per activity type.
4. **Cloud sync** — Session summaries (not raw data) uploaded to ZenithCred cloud. Raw data optionally retained locally for privacy compliance.
5. **Trend analysis** — Cloud computes 7-day, 30-day, 90-day trends. Improvement deltas drive credit generation.

**Privacy by Design**
- Biometric data classified as PII; encrypted at rest and in transit
- Individual data visible only to the participant (and optionally their guardian for minors)
- Institutional dashboards show only aggregates (minimum cohort size: 5)
- FERPA-compliant for schools, HIPAA-aware for corporate (BAA available)
- Data retention configurable per institution (default: 12 months)

### 3.3 Gamification System

**Wellness Credits (WC)**
- The platform's primary currency
- Earned by participants for completing activities and showing improvement
- Aggregated at institutional level for inter-institution rankings
- Credit formula: `WC = base_activity_credits × improvement_multiplier × streak_bonus`

**Tokens (ZT — Zenith Tokens)**
- Individual reward currency, redeemable for tangible rewards
- Earned alongside WC but kept in personal wallet
- Cannot be transferred between users (anti-gaming)
- Expire after 6 months if unredeemed (creates urgency)

**Leaderboards**
- **Individual:** Top participants this week/month (opt-in, anonymizable)
- **Team/Department:** Aggregate scores for internal competition
- **Institutional:** School-vs-school or company-vs-company (same tier/size bracket)
- **Activity-specific:** Best breathing score, highest movement accuracy, etc.
- Leaderboard visibility configurable by institution admin

**Rewards Catalog**
- Institution-funded: extra PTO hours, school store credit, preferred parking
- ZenithCred-funded: branded merch, wellness product discounts
- Partner-funded: gift cards, experience vouchers (Phase 2)
- Institutions set their own reward catalog and token exchange rates

**Streaks & Achievements**
- Daily streak: participate N days in a row
- Consistency badge: 3+ sessions/week for 4 weeks
- Improvement milestone: 10% HRV improvement over baseline
- Explorer: try all activity types
- Team player: complete 5 team challenges

### 3.4 Analytics Dashboard

**Institutional View (for Sarah & Marcus)**
- Aggregate wellness score trend (line chart, filterable by time range)
- Participation rate: % of eligible people who participated this period
- Top-improving departments/classes
- Benchmark comparison: this institution vs. anonymized peer average
- HRV trend distribution (stress resilience benchmarks): histogram with percentile markers
- ROI estimator: projected healthcare savings based on improvement trends
- Exportable PDF reports for board/stakeholder presentations

**Individual View (for Priya)**
- Personal wellness score trend
- Metric breakdown: HR, HRV, breathing, movement (sparklines). EEG meditation score shown only if Premium tier active.
- Session history: date, activity, duration, score
- Achievements and streak tracker
- Token balance and redemption history
- "Your best session" highlight

**ZenithCred Admin View (for David)**
- All institutions: health status, participation rates, hardware alerts
- Hardware fleet: projector and sensor status across all sites
- Data quality metrics: session completion rate, sensor dropout rate
- Support ticket integration
- Billing and license status per institution

### 3.5 Admin Portal

**Institution Setup**
- Organization profile: name, type (school/corporate), size, location
- User provisioning: CSV upload, SSO integration (Google, Azure AD, Clever for schools)
- Space configuration: map of installation locations, projector/sensor assignments
- Activity library selection: choose which activities are available
- Reward catalog configuration

**Ongoing Configuration**
- Schedule management: when is the wellness zone active?
- Notification settings: reminders, weekly digests, achievement alerts
- Privacy controls: data retention, anonymization, consent management
- Role-based access: admin, manager, viewer

**Reporting**
- Scheduled reports: weekly/monthly auto-generated and emailed
- Custom report builder: pick metrics, time range, cohort filters
- Compliance exports: FERPA/HIPAA-ready data packages

---

## 4. Main Workflows

### 4.1 Onboarding a New Institution

1. **Sales handoff** → ZenithCred admin receives signed contract with institution details
2. **Platform setup** → Admin creates institution in portal, configures org structure (departments/classes)
3. **Hardware shipment** → Projectors + sensors + edge device shipped to site
4. **On-site installation** (Day 1)
   - Mount projectors, connect to network
   - Run calibration wizard (projector alignment, zone mapping)
   - Pair sensor pool (assign device IDs)
   - Edge device connects to ZenithCred cloud, pulls activity content
5. **User provisioning** (Day 2)
   - Institution admin uploads user roster (CSV or SSO sync)
   - Welcome emails sent with mobile app download link
   - Optional: on-site orientation session (ZenithCred provides slide deck + video)
6. **Baseline week** (Days 3-7)
   - First sessions capture individual baselines (no scoring, just calibration)
   - System establishes per-person norms for all biofeedback metrics
7. **Go-live** (Day 8)
   - Scoring activates, credits begin accruing
   - Leaderboards go live (pre-populated with baseline data)
   - Institution admin receives first automated report at end of Week 2

### 4.2 Daily Wellness Session

1. **Approach** — Participant walks up to the wellness zone. Projector displays ambient "Step on to start" animation.
2. **Identify** — Participant taps badge/phone to NFC reader OR scans QR code. System loads their profile.
3. **Sensor connect** — If using wearables: grab a sensor from the charging dock, tap to pair. If camera-only activity: skip.
4. **Activity selection** — Projected menu shows 3-4 recommended activities based on participant's history and goals. Participant selects by stepping on the projected option (or via phone).
5. **Activity begins** — 2-5 minute guided activity. Projector displays interactive visuals (targets to step on, breathing guide circles, cognitive puzzles). Real-time biofeedback shown as ambient color/score overlay.
6. **Session complete** — Score screen: overall score, metric breakdown, comparison to personal best. Credits and tokens awarded with satisfying animation.
7. **Sensor return** — Participant docks the sensor. System logs session, syncs to cloud.
8. **Social moment** — If participant earned an achievement or hit a new high, projector briefly shows celebration. Optionally shares to team channel (Slack/Teams integration).

**Total time: 3-7 minutes including setup.**

### 4.3 Weekly/Monthly Reporting Cycle

1. **Automated data aggregation** — Sunday night (configurable), system compiles the week's data
2. **Report generation** — Templated report created: participation rates, score trends, top performers, hardware health
3. **Distribution** — Report emailed to institution admins and managers; also available in dashboard
4. **Monthly deep-dive** — End of month: extended report with trend analysis, peer benchmarking, ROI estimates
5. **Quarterly review** — ZenithCred customer success schedules a review call with institution, walks through insights and recommendations

### 4.4 Gamification Reward Redemption

1. **Browse catalog** — Participant opens mobile app → Rewards tab → sees available rewards with token costs
2. **Select reward** — Taps desired reward, sees token balance vs. cost
3. **Confirm** — "Redeem 500 ZT for $10 Amazon Gift Card?" → Confirm
4. **Fulfillment** — Digital rewards: instant delivery (email/in-app). Physical rewards: shipping triggered. Institution-specific rewards (PTO, parking): notification sent to HR admin for approval.
5. **Receipt** — Token balance updated, redemption logged in history

### 4.5 Hardware Setup and Calibration

1. **Unbox** — Follow printed quick-start guide (also available in-app)
2. **Mount projector** — Ceiling or wall mount. Connect power and ethernet.
3. **Network discovery** — Edge device auto-discovers projector. Admin portal shows "New projector found."
4. **Alignment** — Admin launches calibration mode from portal. Projector displays test pattern. Admin adjusts until pattern aligns with physical space boundaries.
5. **Zone mapping** — Admin defines active zones within the projection area (where people stand, where UI elements display)
6. **Sensor pairing** — Power on each sensor. Edge device discovers via BLE. Admin assigns to sensor pool in portal.
7. **Smoke test** — Admin runs a test activity. Verifies: projection quality, sensor connectivity, score calculation, cloud sync.
8. **Ongoing** — Weekly automated health check. Monthly recalibration reminder. Remote diagnostics available to ZenithCred support.

---

## 5. UX Screen Map

### 5.1 Participant Mobile App

**S1: Home / Dashboard**
- Shows: Today's wellness score, streak counter, next recommended activity, token balance, team standing
- Interactions: Tap activity card to see details; pull to refresh; tap tokens to open wallet
- Nav: Bottom tabs → Home, Activities, Leaderboard, Rewards, Profile

**S2: Activity Library**
- Shows: Grid of available activities, categorized (Movement, Breathing, Cognitive). Each card: name, duration, difficulty, avg score
- Interactions: Tap to view detail; filter by category/duration; search
- Nav: From Home tab or bottom nav

**S3: Activity Detail**
- Shows: Activity description, how-to video, required sensors, personal best score, friends' scores
- Interactions: "Start Session" button (initiates sensor pairing if needed); "Add to Favorites"
- Nav: From Activity Library; goes to Session Flow (on projector, app becomes companion)

**S4: Live Session Companion**
- Shows: Real-time biofeedback readout (HR, breathing rate), timer, current score. Mirrors some projector content.
- Interactions: Pause/end session; view detailed metric graphs
- Nav: Active during session only; auto-transitions to Session Summary

**S5: Session Summary**
- Shows: Final score, metric breakdown (each metric vs personal best), credits earned, tokens earned, achievements unlocked
- Interactions: Share to team; view detailed metrics; "Do Another" button
- Nav: From Live Session; back to Home

**S6: Leaderboard**
- Shows: Tabs for Individual / Team / Institution. Ranked list with scores, trends (up/down arrows), participant avatars
- Interactions: Toggle time range (week/month/all-time); tap user to see their public profile; filter by activity type
- Nav: Bottom nav tab

**S7: Rewards Catalog**
- Shows: Available rewards as cards (image, name, token cost). Token balance prominently displayed. Categories: Digital, Physical, Institutional
- Interactions: Tap to view detail; redeem; filter by category/cost
- Nav: Bottom nav tab

**S8: Reward Detail**
- Shows: Reward description, cost, availability, redemption instructions
- Interactions: "Redeem" button with confirmation dialog
- Nav: From Rewards Catalog

**S9: Profile & Settings**
- Shows: Avatar, name, institution, level/XP bar, lifetime stats, achievements gallery, privacy settings, notification preferences
- Interactions: Edit profile; manage connected sensors; toggle data sharing; logout
- Nav: Bottom nav tab

**S10: Token Wallet**
- Shows: Current balance, transaction history (earned/redeemed), expiring tokens warning
- Interactions: Tap transaction for details; link to rewards catalog
- Nav: From Home (token balance tap) or Profile

### 5.2 Institution Admin Web Dashboard

**S11: Admin Home**
- Shows: KPI cards (participation rate, avg wellness score, active users, hardware status), trend sparklines, alerts/notifications
- Interactions: Click any KPI to drill down; dismiss alerts
- Nav: Side nav → Home, Users, Analytics, Hardware, Rewards, Settings

**S12: User Management**
- Shows: User table (name, department, last active, wellness score, role). Bulk actions toolbar.
- Interactions: Search/filter; add user; import CSV; edit roles; deactivate
- Nav: Side nav

**S13: Analytics**
- Shows: Full-width charts — participation over time, score distributions, department comparisons, benchmark overlay. Date range picker.
- Interactions: Filter by department/time/activity; export PDF; schedule report
- Nav: Side nav

**S14: Hardware Management**
- Shows: Map/list of installed devices (projectors, sensors, edge devices). Status indicators (online/offline/warning). Last calibration date.
- Interactions: Click device for details; trigger remote diagnostic; schedule calibration
- Nav: Side nav

**S15: Rewards Configuration**
- Shows: Reward catalog editor. List of active rewards with costs, redemption counts, budget remaining.
- Interactions: Add/edit/remove rewards; set token exchange rates; approve pending redemptions
- Nav: Side nav

**S16: Reports**
- Shows: Report library (past generated reports) + report builder
- Interactions: Download PDF; configure scheduled reports; build custom report
- Nav: Side nav or from Analytics

**S17: Settings**
- Shows: Organization profile, SSO config, privacy/consent settings, notification rules, billing info
- Interactions: Edit all fields; test SSO connection; manage admin roles
- Nav: Side nav

### 5.3 Projector / Kiosk UI

**S18: Ambient / Attract Mode**
- Shows: Animated ZenithCred branding, "Step on to begin" prompt, current leaderboard ticker
- Interactions: Motion detection triggers transition to Identify screen
- Nav: Idle state → S19 on approach

**S19: Identify**
- Shows: "Tap your badge or scan QR" with large visual prompt
- Interactions: NFC tap or QR scan; "Guest Mode" option for first-timers
- Nav: From S18; goes to S20

**S20: Activity Selector (Projected)**
- Shows: 3-4 activity options as large projected tiles. Personal greeting ("Hi Priya!"), today's streak count.
- Interactions: Step on a tile to select
- Nav: From S19; goes to S21

**S21: Active Session (Projected)**
- Shows: Full interactive activity — targets, guides, visual feedback, real-time score, timer
- Interactions: Body movement tracked by camera; breathing guided by visual expand/contract
- Nav: From S20; auto-transitions to S22 at session end

**S22: Results (Projected)**
- Shows: Score reveal animation, metric highlights, credits/tokens earned, achievement unlocked (if any), "Great job!" message
- Interactions: Auto-dismisses after 10 seconds; or step off to end
- Nav: Returns to S18

### 5.4 ZenithCred Super-Admin Portal

**S23: Fleet Overview**
- Shows: All institutions on a map. Health scores, participation heat map, alerts.
- Interactions: Click institution to drill in; filter by status/region; bulk actions

**S24: Institution Detail**
- Shows: Deep view of one institution — users, hardware, metrics, support tickets, billing
- Interactions: All admin actions; impersonate institution admin for troubleshooting

**S25: Hardware Fleet**
- Shows: All devices across all institutions. Firmware versions, connectivity, errors.
- Interactions: Push firmware updates; remote restart; generate diagnostic report

---

## 6. Gamification Deep-Dive

### 6.1 Credit & Token Economy

**Wellness Credits (WC) — Institutional Currency**

| Action | WC Earned |
|---|---|
| Complete any activity | 10 WC |
| Score above personal average | +5 WC bonus |
| Show 5%+ improvement (any metric, 30-day window) | +20 WC bonus |
| Maintain 7-day streak | +15 WC bonus |
| Team completes weekly challenge | +50 WC (split across team) |

WC aggregate at the institutional level. They cannot be spent — they are a **reputation score**. Institutions are ranked by WC-per-capita to normalize for size.

**Zenith Tokens (ZT) — Individual Reward Currency**

ZT are earned at roughly 1:1 with WC but belong to the individual. Exchange rates for rewards are set by the institution (e.g., 500 ZT = $10 gift card). This lets budget-conscious schools set higher rates and well-funded corporates set generous rates.

**Inflation Control:**
- Token earn rates reviewed quarterly
- Expiry: unused tokens expire after 6 months
- New reward tiers introduced to create token sinks
- Earn rates decrease slightly at higher levels (diminishing returns curve)

### 6.2 Leveling System

**Individual Levels (1-50)**

| Level Range | Title | XP Required (cumulative) |
|---|---|---|
| 1-5 | Newcomer | 0 – 500 |
| 6-15 | Active | 500 – 3,000 |
| 16-25 | Committed | 3,000 – 10,000 |
| 26-35 | Champion | 10,000 – 25,000 |
| 36-45 | Elite | 25,000 – 60,000 |
| 46-50 | Zenith | 60,000 – 100,000 |

XP earned = WC earned (1:1). Level unlocks: new activity types, cosmetic profile items, access to exclusive challenges.

**Institutional Tiers**
- Bronze, Silver, Gold, Platinum, Zenith
- Based on WC-per-capita over rolling 90 days
- Tier badges displayed on public profiles and lobby screens
- Higher tiers unlock: priority support, beta features, conference speaking invitations

### 6.3 Institutional vs. Individual Rewards

**Individual:** Tokens → catalog redemption (tangible goods, experiences). Achievements → profile badges and bragging rights. Levels → unlocks and status.

**Institutional:** WC accumulation → tier progression → public recognition. Specific institutional rewards:
- Zenith Tier schools get a physical trophy + press release template
- Gold+ corporates get featured in ZenithCred's annual wellness report
- All institutions get a "Wellness Score" badge for their website

### 6.4 Social & Competitive Mechanics

- **Team Challenges:** Weekly opt-in challenges (e.g., "Department with highest average breathing score wins"). Creates organic social pressure.
- **Buddy System:** Pair up with a colleague/classmate. Both earn bonus tokens when both complete sessions in the same week.
- **Institutional Rivalries:** Opt-in head-to-head matchups between similar institutions. Displayed on lobby projector.
- **Social Feed:** In-app feed showing anonymized achievements ("Someone in Marketing just hit Level 20!"). Opt-in name reveals.
- **Seasons:** 12-week competitive seasons with fresh leaderboards. End-of-season rewards for top performers. Prevents permanent leader lock-in.

### 6.5 Anti-Gaming Measures

- **Biometric verification:** Scores require valid sensor data. No sensor = no credits (movement-only activities excepted but capped).
- **Anomaly detection:** Sudden score spikes flagged for review. ML model trained on population norms.
- **Session caps:** Maximum 3 credited sessions per day (additional sessions are "practice" — no tokens).
- **Improvement-weighted scoring:** Raw performance matters less than personal improvement. A fit athlete and a beginner both earn fairly.
- **Cooldown:** Minimum 2 hours between credited sessions.
- **Human review:** Institutional admins can flag/review suspicious accounts. ZenithCred support can audit.

---

## 7. Branding Direction

### 7.1 Name Rationale

**Zenith** (noun): the highest point, the peak, the culmination. Evokes aspiration, upward trajectory, reaching one's best self.

**Cred** (noun, informal): credibility, reputation. Also a direct reference to "credits" — the platform's currency.

Together: **ZenithCred** = "Peak credibility through wellness" / "Credits for reaching your zenith."

The name works across markets: professional enough for corporate HR, aspirational enough for students, memorable enough for investors.

### 7.2 Color Palette

| Role | Color | Hex | Rationale |
|---|---|---|---|
| Primary | Deep Teal | #0A7E8C | Trust, health, calm — medical-grade credibility |
| Secondary | Electric Violet | #7C3AED | Energy, gamification, modernity — the "fun" accent |
| Accent | Solar Gold | #F59E0B | Achievement, warmth, reward — used for tokens, badges |
| Background | Cool White | #F8FAFC | Clean, clinical, breathable |
| Dark | Charcoal | #1E293B | Text, contrast, professionalism |
| Success | Mint Green | #10B981 | Positive metrics, improvements |
| Alert | Coral Red | #EF4444 | Warnings, declines |

The teal-to-violet gradient is the hero visual — it represents the journey from calm health to energized achievement.

### 7.3 Tone of Voice

- **Encouraging, not preachy.** "Great session!" not "You need to exercise more."
- **Data-literate, not clinical.** "Your HRV improved 12% this month" not "Your parasympathetic tone shows increased vagal modulation."
- **Playful, not childish.** Works for a 14-year-old and a 50-year-old VP.
- **Confident, not boastful.** Let the data speak. Avoid superlatives.
- **Inclusive.** "Wellness is personal — your score is your own journey, not a comparison."

### 7.4 Visual Style

- **Clean geometry** — rounded rectangles, smooth gradients, generous whitespace
- **Medical trust meets game energy** — think Apple Health crossed with Duolingo
- **Data visualization** — beautiful charts that feel informative, not overwhelming. Inspired by Linear and Stripe dashboards.
- **Motion** — smooth, purposeful animations. Score reveals, level-ups, and streak celebrations should feel satisfying (dopamine design).
- **Iconography** — custom icon set: outlined, 2px stroke, rounded caps. Consistent across platforms.
- **Typography** — Inter or similar geometric sans-serif for UI. Semi-bold headers, regular body.

---

## 8. Technical Architecture Overview

### 8.1 Frontend Platforms

| Platform | Technology | Purpose |
|---|---|---|
| **Participant Mobile App** | React Native (iOS + Android) | Personal dashboard, session companion, rewards, social |
| **Institution Admin Dashboard** | Web app (React) | Analytics, user management, configuration |
| **Projector/Kiosk UI** | Web app (React) on local edge device | Interactive activities, session flow, ambient display |
| **ZenithCred Super-Admin** | Web app (React, shared codebase with institution admin) | Fleet management, support tools |

### 8.2 Backend Services

- **API Gateway** — Single entry point, auth, rate limiting, routing
- **Auth Service** — JWT-based. SSO integration (SAML/OIDC) for institutions. Magic link for individual participants.
- **User Service** — Profiles, roles, institution membership
- **Session Service** — Activity sessions: create, score, store. Core business logic.
- **Biofeedback Processing Service** — Receives raw sensor data from edge, computes scores, detects anomalies
- **Gamification Engine** — Credits, tokens, levels, achievements, leaderboards. Event-driven (reacts to session completions).
- **Rewards Service** — Catalog management, redemption processing, fulfillment triggers
- **Analytics Service** — Aggregation, trend computation, report generation. Read-heavy, eventually consistent.
- **Notification Service** — Push notifications, email digests, in-app alerts
- **Hardware Management Service** — Device registry, health monitoring, firmware updates, remote diagnostics

### 8.3 Data Flow

```
[Sensors] → BLE → [Edge Device] → Local Processing (noise filter, scoring)
                                  ↓
                        [Projector UI] ← Real-time feedback (<100ms)
                                  ↓
                    Session summary → HTTPS → [API Gateway]
                                                ↓
                                    [Session Service] → [Database]
                                                ↓
                                    [Gamification Engine] → Credits/Tokens/Achievements
                                                ↓
                                    [Analytics Service] → Dashboards
                                                ↓
                                    [Notification Service] → Mobile Push / Email
```

**Key design decisions:**
- **Edge-first processing** — Biofeedback scoring happens locally for real-time feedback. Only summaries go to cloud. This solves latency and privacy simultaneously.
- **Event-driven gamification** — Session completion emits an event; gamification engine subscribes and computes consequences asynchronously.
- **Separate read/write paths for analytics** — Write path: session data ingested into time-series store. Read path: pre-aggregated materialized views for dashboard performance.

### 8.4 Integration Points

- **Interactive Move API** — Projector control, content deployment, motion tracking data
- **BLE Sensor SDKs** — Polar (HR/HRV, primary), Apple HealthKit, Garmin Connect IQ, Muse (Premium EEG tier), spirometer protocols
- **SSO Providers** — Google Workspace, Microsoft Azure AD, Clever (K-12)
- **HRIS** — BambooHR, Workday (Phase 2) — for auto-provisioning users
- **Communication** — Slack, Microsoft Teams (achievement notifications, weekly digests)
- **Rewards Fulfillment** — Tango Card API (digital gift cards), Shopify (merch store)

---

## 9. MVP Scope

### Phase 1 — Investor Demo (8-12 weeks)

**Must work (live):**
- Single-site installation: 1 projector + motion tracking (camera) + 1 HR sensor type
- 3 interactive activities (1 movement, 1 breathing, 1 cognitive)
- Participant identification (QR code)
- Real-time biofeedback display on projector (heart rate overlay)
- Session scoring and summary (on projector + mobile web)
- Basic individual dashboard (mobile web, not native app)
- Simple leaderboard (top 10, this week)
- Token earning (no redemption yet — just accumulation)

**Can be mocked / simulated:**
- EEG meditation tier (show UI but use simulated calm/focus scores for demo)
- Institutional analytics dashboard (pre-built with demo data, live data feeding in)
- Multi-institution view (seed 3-4 fake institutions alongside the real demo site)
- Reward catalog (show it, but redemption is manual/email-based)
- SSO integration (use email/password for demo)

**Explicitly out of scope:**
- Native mobile apps (use mobile web)
- Multi-projector sync
- Lung capacity (spirometer) integration
- Automated reporting
- Hardware remote management

### Phase 2 — Pilot Launch (Months 4-8)

- Native mobile app (iOS + Android)
- Full Core sensor suite (HR + HRV + respiratory) + Premium EEG meditation tier
- 10+ activities across all categories
- Institution admin dashboard (full analytics)
- SSO integration (Google + Azure AD)
- Automated weekly reports
- Reward redemption (digital gift cards)
- Team challenges
- Multi-site support (one institution, multiple locations)
- Streak and achievement system
- Edge device remote monitoring

### Phase 3 — Scale (Months 9-18)

- Multi-projector room setups
- HRIS integrations (BambooHR, Workday)
- Slack/Teams integration
- Institutional rivalries and seasons
- Advanced analytics (predictive trends, ROI modeling)
- Insurance partner data feeds
- White-label option for wellness providers
- API for third-party integrations
- International localization
- Clever integration for K-12

---

## Appendix: Key Metrics for Success

| Metric | Target (Year 1) |
|---|---|
| Institutions onboarded | 20 |
| Daily active participants (across all sites) | 2,000 |
| Average sessions per participant per week | 2.5 |
| Participant retention (60-day) | 65% |
| Average HRV improvement (90-day) | 8% |
| NPS (institution admins) | 50+ |
| Hardware uptime | 99.5% |

---

*Document prepared for founder review and investor presentation. All features, timelines, and metrics are targets subject to refinement during development.*
