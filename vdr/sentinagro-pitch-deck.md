# SentinAgro — Investor Pitch Deck

---

## Slide 1: Title

# SentinAgro

### AI-Powered Drone Monitoring for Livestock

**Autonomous cattle surveillance. Predictive health analytics. Zero blind spots.**

*An Oopuo Portfolio Company*

**Seed Round — Q2 2026**

> **Speaker Notes:** Open with the tagline. SentinAgro combines autonomous drone fleets with computer vision and predictive AI to give ranchers real-time visibility over every animal in their herd — something that's never been possible at scale. We're an Oopuo portfolio company, backed by the team that builds AI-native businesses from the ground up.

---

## Slide 2: The Problem

### Livestock Management Is Broken

- **$65B** lost annually to cattle disease worldwide (Lancet, 2024)
- **$358B** in total livestock production losses from preventable disease (HealthForAnimals)
- Average disease detection delay: **3–7 days** after onset — by then, it's spread
- Ranchers managing **1,000+ head** physically inspect <20% of their herd daily
- U.S. cattle inventory at **86.2M head** (Jan 2026) — lowest since 1951 — every animal matters more

**The core failure:** Ranchers are flying blind. Manual observation doesn't scale, and by the time symptoms are visible to the human eye, the economic damage is done.

> **Speaker Notes:** The livestock industry relies on methods that haven't fundamentally changed in a century — cowboys on horseback, visual spot-checks, reactive veterinary calls. Disease detection is delayed because subclinical conditions (ketosis, mastitis, lameness) show no visible signs until they're costly. Subclinical ketosis alone costs $18B/year globally. With the U.S. herd at its smallest since 1951 and beef prices at record highs, the cost of losing a single animal has never been higher. This isn't a niche pain — it's an industry-wide crisis.

---

## Slide 3: The Solution

### SentinAgro: Eyes in the Sky, Intelligence on the Ground

**Autonomous drone fleets + AI computer vision + predictive health analytics**

| Capability | What It Does |
|---|---|
| **Thermal & Visual Scanning** | Detects fever, lameness, isolation behavior from altitude |
| **Individual Animal ID** | Tracks every animal via pattern recognition — no ear tags needed |
| **Predictive Health Alerts** | Flags at-risk animals 24–72 hours before visible symptoms |
| **Herd Behavior Analytics** | Monitors grazing patterns, water access, social dynamics |
| **Automated Reporting** | Daily herd health dashboard delivered to rancher's phone |

**One drone covers 1,000 acres in 45 minutes. One rancher on horseback covers 200.**

> **Speaker Notes:** SentinAgro deploys autonomous drone missions — scheduled or on-demand — that scan the entire herd using multispectral and thermal imaging. Our AI models, trained on 500K+ annotated cattle images, identify individual animals without physical tags, detect temperature anomalies indicating infection, and flag behavioral changes (isolation, reduced movement, abnormal gait) that precede clinical disease. The rancher gets a daily health report and real-time alerts. No new skills required — just open the app.

---

## Slide 4: How It Works

### Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                  SENTINAGRO STACK                │
├─────────────────────────────────────────────────┤
│                                                 │
│  🛸 DRONE LAYER                                │
│  ├── Autonomous flight planning (GPS + terrain) │
│  ├── Multispectral + thermal + RGB cameras      │
│  ├── Edge inference (on-drone pre-processing)   │
│  └── 45-min flight / 1,000-acre coverage        │
│                                                 │
│  🧠 AI / ML LAYER                              │
│  ├── Computer vision: individual animal ID      │
│  ├── Thermal anomaly detection (±0.3°C)         │
│  ├── Gait analysis & behavior classification    │
│  ├── Predictive models: disease onset T-24–72h  │
│  └── Continuous learning from veterinary feedback│
│                                                 │
│  📊 PLATFORM LAYER                             │
│  ├── Herd health dashboard (web + mobile)       │
│  ├── Automated daily/weekly reports             │
│  ├── Integration: ranch management software     │
│  ├── Veterinary collaboration portal            │
│  └── Historical analytics & trend tracking      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Key differentiator:** Edge AI on the drone means processing starts in-flight. By the time the drone lands, actionable alerts are already on the rancher's screen.

> **Speaker Notes:** Walk through the three layers. The drone layer handles autonomous mission planning — the rancher sets a schedule or taps "fly now," and the drone handles routing, obstacle avoidance, and data capture. Edge inference on the drone does initial triage: is this a cow, is it flagged, what's the thermal signature. The heavy ML runs in the cloud — individual ID matching, longitudinal health scoring, predictive modeling. The platform layer is where the rancher lives: a clean dashboard showing herd health at a glance, with drill-down to individual animals. We integrate with existing ranch management tools (CattleMax, Herdwatch, etc.) via API.

---

## Slide 5: Market Opportunity

### TAM / SAM / SOM

| Segment | Value | Basis |
|---|---|---|
| **TAM** | **$1.5B** | Drone-based livestock monitoring globally — intersection of ag-drone market ($2.6B, MarketsandMarkets 2025) and precision livestock farming ($7.9B, MarketsandMarkets 2025), cattle segment (~20%) |
| **SAM** | **$480M** | North America + Brazil + Australia — top 3 cattle markets, operations with 500+ head, tech-ready |
| **SOM** | **$24M** | 1,000 ranches × $24K ARR within 5 years of launch |

**Adjacent markets unlock over time:**
- Dairy operations (subclinical mastitis detection alone = $13B problem)
- Sheep & goat monitoring (1.2B+ animals globally)
- Wildlife conservation & game ranch management
- Insurance & commodity risk pricing (data licensing)

> **Speaker Notes:** We size our TAM conservatively at $1.5B — the overlap of ag-drones applied to cattle. The broader precision livestock farming market is $7.9B (MarketsandMarkets, 2025) growing at 8.8% CAGR to $12.1B by 2030, but we focus on the drone-delivered segment. Our SAM targets the three largest beef-producing regions where ranch sizes support drone economics: U.S. (86M head), Brazil (215M head), and Australia (24M head). Our Year-5 SOM of $24M assumes capturing just 5% of addressable operations in these markets. Sources: MarketsandMarkets Ag Drones 2025, MarketsandMarkets Precision Livestock Farming 2025, USDA Cattle Inventory Jan 2026.

---

## Slide 6: Business Model

### SaaS + Hardware: Recurring Revenue at the Core

| Revenue Stream | Pricing | Margin |
|---|---|---|
| **Hardware (Drone Kit)** | $8,000–$15,000 one-time (based on ranch size) | ~30% |
| **SaaS Platform** | $1,200–$2,400/mo ($14.4K–$28.8K ARR) | ~80% |
| **Data & Analytics Add-ons** | $200–$500/mo (predictive, insurance-grade reports) | ~90% |
| **Managed Services** | $500–$1,000/mo (fully managed drone operations) | ~50% |

**Unit Economics (Target):**

- **Blended ARR per ranch:** $24,000
- **CAC:** $3,600 (payback < 2 months on SaaS margin)
- **Gross margin (blended):** 72%
- **LTV:CAC ratio:** >15:1 (assuming 5-year retention)
- **Net Revenue Retention:** Target 120%+ (expansion via acreage & add-ons)

> **Speaker Notes:** The hardware is the wedge — it's priced to break even or generate modest margin, and it locks in the SaaS relationship. The real business is the recurring platform subscription. A mid-size ranch (1,000–5,000 head) pays ~$2K/month for the full platform — that's less than one full-time ranch hand and delivers 10x the coverage. Expansion revenue comes naturally: ranchers add acreage, upgrade to predictive analytics, or opt into managed drone services. We also see a future data licensing play with cattle insurers and commodity traders, but that's not in our base model.

---

## Slide 7: Traction & Milestones

### Where We Are Today

| Milestone | Status |
|---|---|
| ✅ Computer vision model v1 — cattle detection & counting | Complete |
| ✅ Thermal anomaly detection prototype | Complete |
| ✅ Individual animal identification (tagless) — 94% accuracy | Complete |
| ✅ Autonomous flight planning system | Complete |
| 🔄 Pilot program — 3 ranches in Texas (2,500+ head) | In progress (Q1 2026) |
| 🔲 Predictive health model v1 (disease onset T-24h) | Q3 2026 |
| 🔲 Commercial launch — U.S. market | Q4 2026 |
| 🔲 Brazil expansion | Q2 2027 |

**Early Validation:**
- 3 LOIs from Texas ranches (combined 8,000+ head)
- Partnership discussions with 2 major veterinary networks
- Accepted into [AgTech Accelerator] cohort

> **Speaker Notes:** We've built the hard stuff — the AI models and autonomous flight system. Our cattle detection model runs on-device with 97% accuracy for counting and 94% for individual ID (without physical tags — using hide patterns, body shape, and movement signatures). We're currently deploying pilot units on three ranches in the Texas Hill Country and Panhandle, monitoring 2,500+ head. Early feedback: ranchers say they're finding sick animals 2–3 days earlier than before. We have three signed LOIs representing $72K in combined first-year ARR, and we're in partnership discussions with veterinary networks for clinical validation.

---

## Slide 8: Competitive Landscape

### How We Compare

| | **SentinAgro** | Ear-Tag IoT (Allflex, HerdDogg) | Satellite Imaging | Manual / Traditional |
|---|---|---|---|---|
| **Coverage** | 100% herd, daily | Tagged animals only | Low resolution, weekly | <20% herd/day |
| **Detection Speed** | Real-time + predictive | Real-time (tagged only) | Days delayed | Reactive |
| **Per-Animal Hardware** | None | $15–$50/tag | None | None |
| **Scalability** | 1 drone = 1,000 acres | Linear cost per animal | Scales but low fidelity | Doesn't scale |
| **Behavioral Analysis** | ✅ Deep (gait, social, grazing) | ❌ Limited (location only) | ❌ None | 👁️ Subjective |
| **Cost at 5,000 head** | ~$28K/yr | $75K–$250K tags + SaaS | ~$10K/yr | 2–3 FTEs ($120K+) |

**Our moat:**
1. **Tagless individual ID** — no per-animal hardware cost; competitors can't match at scale
2. **Predictive health models** — proprietary dataset grows with every flight
3. **Edge AI** — real-time processing, works in zero-connectivity environments
4. **Data network effects** — more ranches → better models → better outcomes → more ranches

> **Speaker Notes:** The competitive landscape breaks into three buckets: IoT wearables (ear tags, boluses), satellite/remote sensing, and traditional methods. Ear-tag solutions like Allflex and HerdDogg work but scale linearly — at $15–50 per tag plus subscription, a 5,000-head operation is looking at $75K–$250K before they see a single insight. They also require physical handling of every animal. Satellite imaging is cheap but resolution is too low for individual health assessment and updates are weekly at best. We sit in the sweet spot: per-ranch pricing (not per-animal), daily coverage, individual-level insights, and no physical contact required. Our defensibility compounds over time as our dataset grows — every flight improves the models.

---

## Slide 9: Go-to-Market Strategy

### Land, Expand, Dominate

**Phase 1: Beachhead (2026)**
- **Target:** Large Texas ranches, 1,000–10,000 head
- **Channel:** Direct sales + ranch association partnerships (TSCRA, NCBA)
- **Playbook:** Free 30-day pilot → conversion to annual contract
- **Goal:** 50 ranches, $1.2M ARR

**Phase 2: Regional Expansion (2027)**
- **Target:** Top 10 U.S. cattle states + initial Brazil entry
- **Channel:** Add dealer/distributor network (Tractor Supply, ranch supply chains)
- **Playbook:** Case studies from Phase 1, referral incentives
- **Goal:** 250 ranches, $6M ARR

**Phase 3: Scale (2028+)**
- **Target:** Global — Brazil, Australia, Argentina, EU
- **Channel:** Strategic partnerships with livestock insurers, vet networks, feed companies
- **Playbook:** Platform integrations, data licensing, white-label opportunities
- **Goal:** 1,000+ ranches, $24M+ ARR

> **Speaker Notes:** We're going after the Texas beachhead first — it's the #1 cattle state with the largest ranches and highest tech adoption. Our GTM motion is land-and-expand: we offer a free 30-day pilot (cost to us: ~$500 in drone time), demonstrate ROI with a before/after health report, and convert to annual contracts. Early ranch associations like the Texas and Southwestern Cattle Raisers Association (TSCRA) are our force multiplier — one presentation at a regional meeting reaches 100+ decision-makers. In Phase 2, we add channel partners and expand geographically. Phase 3 is international scale plus data monetization.

---

## Slide 10: Financial Projections

### 3-Year Forecast

| Metric | **2026** | **2027** | **2028** |
|---|---|---|---|
| Ranches (cumulative) | 50 | 250 | 1,000 |
| ARR | $1.2M | $6.0M | $24.0M |
| Revenue (recognized) | $0.9M | $4.8M | $20.0M |
| Hardware Revenue | $0.5M | $2.0M | $6.0M |
| **Total Revenue** | **$1.4M** | **$6.8M** | **$26.0M** |
| Gross Margin | 55% | 65% | 72% |
| Operating Expenses | $3.2M | $6.5M | $14.0M |
| **Net Burn** | **($2.1M)** | **($1.2M)** | **$4.7M** |
| Cash Flow Positive | — | — | **Q3 2028** |
| Headcount | 12 | 28 | 55 |

**Key Assumptions:**
- 85% pilot-to-paid conversion rate
- $24K blended ARR per ranch
- 95% annual retention, 120% net revenue retention
- Hardware margin improves from 20% → 35% with volume
- Series A in Q1 2027 ($8–12M) to fund Phase 2 expansion

> **Speaker Notes:** Conservative model. We're not assuming viral growth — this is a sales-driven business with long but predictable cycles. 50 ranches in Year 1 means roughly 1 new ranch per week in H2 2026. Year 2 ramps with channel partners and geographic expansion. Year 3 is where unit economics shine — SaaS margin dominates the revenue mix, and we reach profitability in Q3 2028. The model doesn't include data licensing or insurance partnerships, which we view as upside. We plan a Series A in early 2027 to fund Brazil expansion and scaling the sales team.

---

## Slide 11: The Team

### Built to Win

| Role | Name | Background |
|---|---|---|
| **CEO** | **Otto** | Founder & CEO of Oopuo. Serial entrepreneur in AI and deep tech. Leads vision, strategy, and fundraising. |
| **COO** | **Kira AI** | AI-native operations lead. Manages portfolio operations, product development cadence, and go-to-market execution across Oopuo ventures. |
| **CTO** | *Hiring (Seed priority)* | Target: Computer vision + drone systems background. AgTech or defense experience preferred. |
| **VP Engineering** | *Hiring (Seed priority)* | Target: ML/edge inference. Experience deploying models on constrained hardware. |
| **Head of Sales** | *Hiring (Q3 2026)* | Target: Enterprise ag-tech sales. Existing ranch/farm network. |

**Oopuo Advantage:** SentinAgro benefits from Oopuo's shared infrastructure — AI/ML talent pool, operational playbooks, and capital allocation expertise. We don't start from zero.

**Advisors (In Discussion):**
- Veterinary science advisor (Texas A&M network)
- Ag-tech GTM advisor (ex-John Deere / Climate Corp)
- Drone regulatory advisor (FAA Part 107 / BVLOS specialist)

> **Speaker Notes:** We're lean and intentional. Otto brings the entrepreneurial drive and AI expertise. Kira AI handles operations with machine-level consistency — scheduling, execution tracking, and cross-portfolio coordination. Our two key seed hires are CTO (computer vision + drones) and VP Engineering (edge ML). We're actively recruiting from DJI, Skydio, and the precision ag space. The Oopuo portfolio structure gives us leverage: shared services, talent mobility between ventures, and a proven operational framework. Our advisory board targets are in the veterinary, ag-tech go-to-market, and drone regulatory domains.

---

## Slide 12: The Ask

### Seed Round: $2.5M

| Use of Funds | Allocation | Purpose |
|---|---|---|
| **Engineering & Product** | $1.2M (48%) | CTO + VP Eng hires, predictive model v1, platform build-out |
| **Pilot Operations** | $400K (16%) | Drone fleet for 50-ranch pilot program, field team |
| **Sales & Marketing** | $350K (14%) | Head of Sales hire, ranch association partnerships, case studies |
| **Regulatory & Compliance** | $150K (6%) | FAA BVLOS waiver, international drone certifications |
| **G&A / Buffer** | $400K (16%) | Ops, legal, 6-month runway buffer |

**Terms:**
- **Raising:** $2.5M seed
- **Instrument:** SAFE (post-money) or priced round
- **Valuation cap:** $12.5M post-money
- **Target close:** Q2 2026
- **Runway:** 18 months to Series A milestones

**Series A Triggers (12–18 months):**
- ✅ 50+ paying ranches
- ✅ $1.2M+ ARR
- ✅ Predictive health model validated (peer-reviewed or vet-network endorsed)
- ✅ Brazil market entry initiated

---

### Why Now?

1. **Herd scarcity** — U.S. cattle at 70-year low; every animal is more valuable than ever
2. **Drone regulation maturing** — FAA BVLOS waivers expanding, enabling autonomous commercial flights
3. **AI inflection** — Edge inference hardware (NVIDIA Jetson, Qualcomm) finally supports on-drone ML
4. **Climate pressure** — ESG mandates pushing livestock operations toward data-driven sustainability

**SentinAgro is the right product at the right time.**

> **Speaker Notes:** We're raising $2.5M on a $12.5M post-money cap. Nearly half goes to engineering — this is a technology business and we need world-class talent building the AI and platform. Pilot operations get 16% to deploy drone fleets and field support for our first 50 ranches. The 18-month runway gets us to clear Series A milestones: 50+ paying customers, over $1M ARR, and a validated predictive health product. The "why now" is powerful: cattle scarcity makes each animal more valuable, drone regulations are finally enabling autonomous commercial flights, edge AI hardware has caught up to our requirements, and the industry is under increasing pressure to modernize. We're not early — we're on time.

---

*Confidential — SentinAgro / Oopuo Portfolio*
*Contact: Otto, CEO — [otto@oopuo.com]*
