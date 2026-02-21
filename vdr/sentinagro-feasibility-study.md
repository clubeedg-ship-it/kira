# SentinAgro — Feasibility Study
### Drone-Based Cattle Monitoring Platform
**Prepared by:** Kira, COO — Oopuo  
**Date:** 20 February 2026  
**Classification:** Confidential — For Investor Discussion Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Market Analysis](#2-market-analysis)
3. [Technology Assessment](#3-technology-assessment)
4. [Regulatory Landscape](#4-regulatory-landscape)
5. [Business Model](#5-business-model)
6. [Financial Projections](#6-financial-projections)
7. [Competitive Analysis](#7-competitive-analysis)
8. [Risk Assessment](#8-risk-assessment)
9. [Implementation Timeline](#9-implementation-timeline)
10. [Conclusion & Recommendations](#10-conclusion--recommendations)

---

## 1. Executive Summary

**SentinAgro** is a drone-based cattle monitoring platform combining autonomous UAV flights, multi-sensor payloads (thermal + multispectral imaging), and AI/ML analytics to deliver real-time herd health, location tracking, and behavioral insights to livestock operators.

### The Opportunity

The global cattle population stands at approximately **1.57 billion head** (2023, FAO). The precision livestock farming (PLF) market is valued at **USD 5–8 billion (2025)** and growing at **8.7–15.1% CAGR** through 2035, driven by labor shortages, sustainability mandates, and IoT adoption. Yet current solutions are overwhelmingly **tag-based** (ear tags, collars) — requiring physical contact with every animal, ongoing hardware replacement, and significant labor for deployment.

SentinAgro offers a **contactless, scalable alternative**: autonomous drone patrols that monitor entire herds without per-animal hardware. This fundamentally changes the cost curve — shifting from O(n) hardware cost per head to O(1) per flight area.

### Value Proposition

| Metric | Tag-Based (Cowlar/HerdDogg) | SentinAgro |
|--------|----------------------------|------------|
| Per-head hardware | €15–50/tag | €0 (drone-based) |
| Deployment labor | High (tag every animal) | Minimal (launch drone) |
| Coverage | Individual animals only | Herd + pasture + infrastructure |
| Scalability | Linear cost growth | Sublinear (area-based) |
| Data richness | Temperature, activity | Thermal, spatial, behavioral, pasture condition |

### Ask

Seed round of **€2.5M** to fund 18-month development and pilot program across 5–10 farms in the Netherlands, targeting commercial launch in Q3 2027.

---

## 2. Market Analysis

### 2.1 Precision Livestock Farming Market

| Metric | Value | Source |
|--------|-------|--------|
| Global market size (2025) | USD 5.0–7.9 billion | MarketsandMarkets, FMI, PBI |
| Projected CAGR (2025–2035) | 8.7–15.1% | Multiple sources |
| Projected market size (2030) | USD 8.3–12.0 billion | Aggregated estimates |
| Projected market size (2035) | USD 9.6–17.7 billion | MRFR, FMI |
| Dairy segment share | 38–40% | MarketsandMarkets |
| Fastest-growing segment | Animal health monitoring (12.1% CAGR) | FMI |

**Key growth drivers:**
- Labor shortages in agriculture (EU farm workforce declined ~25% over last decade)
- Regulatory pressure on animal welfare and emissions tracking (EU Green Deal, Farm to Fork)
- IoT/connectivity improvements in rural areas (5G, LoRaWAN, satellite IoT)
- Climate adaptation requirements for grazing management

### 2.2 Agricultural Drone Market

| Metric | Value |
|--------|-------|
| Global ag-drone market (2024) | USD 2.0–6.4 billion |
| CAGR (2024–2032) | 20–33% |
| Rotary-wing market share | 62% (2025) |
| Primary current use | Crop spraying/surveillance |
| Livestock monitoring | Emerging niche — largely unaddressed |

**Critical insight:** The ag-drone market is dominated by crop applications. Livestock monitoring via drones is a **white-space opportunity** with minimal direct competition.

### 2.3 Target Market — Netherlands & EU

| Metric | Netherlands | EU-27 |
|--------|------------|-------|
| Total bovine animals | ~5.6 million head | ~70.6 million head |
| Dairy cows | ~1.5 million | ~20 million |
| Livestock density | 3.4 LSU/ha (EU highest) | Varies |
| Key pressure | Nitrogen emission rules, buyout programs | CAP reform, Green Deal |

**Netherlands as beachhead:** High livestock density, advanced digital agriculture adoption, strong regulatory pressure creating urgency for monitoring solutions, and supportive innovation ecosystem (AgriFood Capital, StartLife, WUR).

### 2.4 Addressable Market Sizing

| Segment | Heads | Revenue/head/yr | TAM |
|---------|-------|-----------------|-----|
| Netherlands dairy | 1.5M | €8–12 | €12–18M |
| Netherlands beef | 1.8M | €5–8 | €9–14M |
| EU-27 total cattle | 70.6M | €6–10 | €424–706M |
| Global (top 10 markets) | ~500M addressable | €4–8 | €2–4B |

**SentinAgro SAM (5-year):** EU-27 = **€424–706M/year**  
**SentinAgro SOM (Year 3):** Netherlands + DACH + Nordics = **€15–30M ARR target**

---

## 3. Technology Assessment

### 3.1 Drone Platform Requirements

| Requirement | Specification | Rationale |
|-------------|--------------|-----------|
| Flight time | ≥45 minutes | Cover 200+ ha per flight |
| Range | 5–15 km BVLOS | Large pasture coverage |
| Payload capacity | 1–3 kg | Multi-sensor pod |
| Wind resistance | ≥12 m/s | Northern European conditions |
| IP rating | IP54+ | Rain/dust tolerance |
| Autonomy | Waypoint + RTK GPS | Repeatable flight paths |
| Operating temp | -10°C to +45°C | Year-round NL operations |

**Recommended platform classes:**
- **DJI Matrice 350 RTK** — Proven enterprise platform, 55 min flight, 2.7 kg payload, IP55
- **Freefly Astro** — Mapping-optimized, 30 min flight, modular payloads
- **senseFly eBee X** — Fixed-wing, 90 min flight, ideal for large area surveys
- **Custom VTOL hybrid** — Long-term development for BVLOS regulatory compliance

### 3.2 Sensor Suite

| Sensor Type | Application | Key Specs | Example |
|-------------|------------|-----------|---------|
| **Thermal (LWIR)** | Body temperature anomaly detection, sick animal identification, nighttime tracking | 640×512, <50mK NETD | FLIR Vue TZ20, DJI Zenmuse H30T |
| **Multispectral** | Pasture health (NDVI), grazing pattern analysis | 5-band, 3.2 MP/band | MicaSense RedEdge-P |
| **RGB High-res** | Individual animal identification, body condition scoring | ≥20 MP, mechanical shutter | Sony Alpha for mapping |
| **LiDAR** (optional) | Terrain modeling, infrastructure mapping | 240k pts/sec | DJI Zenmuse L2 |

**Sensor fusion approach:** Thermal + RGB primary stack. Multispectral for pasture analytics (upsell). LiDAR for premium terrain services.

### 3.3 AI/ML Pipeline

```
┌─────────────┐    ┌──────────────┐    ┌──────────────────┐    ┌─────────────┐
│ Drone Flight │───▶│ Edge Compute │───▶│ Cloud Processing │───▶│  Dashboard  │
│  Raw Data    │    │ (onboard)    │    │   (GPU cluster)  │    │  & Alerts   │
└─────────────┘    └──────────────┘    └──────────────────┘    └─────────────┘
```

**Core ML models:**

| Model | Purpose | Architecture | Training Data |
|-------|---------|-------------|---------------|
| **CattleDetect** | Individual animal detection & counting | YOLOv8/RT-DETR | Aerial cattle datasets + proprietary |
| **ThermoHealth** | Temperature anomaly → illness prediction | CNN + time-series (LSTM) | Thermal sequences + vet records |
| **BCS-Net** | Body condition scoring from aerial RGB | ResNet-50 + regression head | Annotated aerial + ground truth BCS |
| **GrazePlan** | Grazing pattern & pasture utilization | Semantic segmentation (U-Net) | Multispectral time series |
| **HerdTrack** | Multi-object tracking across flights | DeepSORT / ByteTrack | Sequential flight data |

**Key technical challenges:**
- Individual animal re-identification across flights (coat pattern matching)
- Accurate BCS from 50–120m altitude (resolution constraints)
- Edge compute latency for real-time alerts during flight
- Model robustness across weather, lighting, and seasonal conditions

### 3.4 Existing Drone-Based Livestock Solutions

| Solution | Status | Approach |
|----------|--------|----------|
| **CattleEye** | Active (UK) | Camera + AI for lameness/health, ground-based primarily |
| **Livestock Labs** | Research | Drone thermal monitoring prototypes |
| **Various academic** | Papers/pilots | WUR, CSIRO, Texas A&M research projects |

**Assessment:** No commercially mature drone-based cattle monitoring platform exists at scale. The space is pre-competitive.

---

## 4. Regulatory Landscape

### 4.1 EU Drone Regulations (EASA Framework)

The European Union Aviation Safety Agency (EASA) governs all drone operations across EU-27 through Regulation (EU) 2019/947.

**Operational Categories:**

| Category | Risk Level | Requirements | SentinAgro Relevance |
|----------|-----------|-------------|---------------------|
| **Open** | Low | <25 kg, VLOS, <120m AGL, CE marking | Initial pilot flights only |
| **Specific** | Medium | Operational Authorization (OA) or PDRA/STS compliance | **Primary operating category** |
| **Certified** | High | Full type certification | Not required initially |

**Specific Category — Key Requirements for SentinAgro:**

1. **SORA (Specific Operations Risk Assessment):** Required for each operational scenario. Agricultural BVLOS over sparsely populated areas is typically SAIL II–III.
2. **Operational Authorization:** Apply to national CAA (Netherlands: ILT — Inspectie Leefomgeving en Transport)
3. **Remote Pilot License:** A2 certificate minimum; specific category may require additional competency
4. **Remote ID:** Mandatory since January 1, 2024 — all SentinAgro drones must broadcast identification
5. **U-Space:** Active in Netherlands since 2024 — requires U-Space Service Provider (USSP) authorization for controlled airspace operations

### 4.2 Netherlands-Specific

| Requirement | Detail |
|-------------|--------|
| National CAA | ILT (Inspectie Leefomgeving en Transport) |
| BVLOS operations | Specific category OA required; NL has active BVLOS trial programs |
| Max altitude | 120m AGL (standard), sufficient for cattle monitoring |
| Privacy (GDPR) | No facial recognition of people; farm boundary data collection requires farmer consent |
| Nature areas | Restricted operations near Natura 2000 sites; relevant for pastoral farming |

### 4.3 Regulatory Strategy

**Phase 1 (Months 1–6):** Operate under Open category A2/A3 for VLOS pilot flights on partner farms  
**Phase 2 (Months 7–12):** Apply for Specific category OA using PDRA-S01 (VLOS in controlled ground area) and begin SORA for BVLOS  
**Phase 3 (Months 13–18):** Obtain BVLOS authorization for routine operations; engage with NL Drone Innovation Sandbox

**Key regulatory risk:** BVLOS authorization timelines are unpredictable (6–18 months). Mitigated by starting VLOS-capable product.

---

## 5. Business Model

### 5.1 Revenue Model — SaaS + Hardware

```
┌─────────────────────────────────────────────────┐
│              REVENUE STREAMS                     │
├─────────────────────┬───────────────────────────┤
│  Recurring (80%)    │  Non-Recurring (20%)      │
├─────────────────────┼───────────────────────────┤
│ • SaaS subscription │ • Drone hardware lease    │
│   per head/month    │ • Installation & setup    │
│ • Data analytics    │ • Custom integrations     │
│   premium tier      │ • Training services       │
│ • API access        │                           │
└─────────────────────┴───────────────────────────┘
```

### 5.2 Pricing Tiers

| Tier | Per Head/Month | Includes | Target |
|------|---------------|----------|--------|
| **Scout** | €0.50 | Weekly flights, basic counting & location, alerts | Small farms (<200 head) |
| **Sentinel** | €0.80 | Daily flights, health monitoring, BCS, grazing analytics | Mid-size farms (200–1,000 head) |
| **Command** | €1.20 | Continuous monitoring, predictive analytics, pasture management, API | Large operations (1,000+ head) |

**Example economics — 500-head dairy farm on Sentinel tier:**
- Monthly revenue: 500 × €0.80 = **€400/month** = **€4,800/year**
- Farmer ROI: Early illness detection saves €50–200/event; 5–10 events/year = €250–2,000 savings
- Plus: labor reduction (2–4 hours/week at €25/hr = €2,600–5,200/year saved)

### 5.3 Hardware Strategy: Lease vs. Buy

| Model | Farmer Pays | SentinAgro Owns | Pros | Cons |
|-------|------------|----------------|------|------|
| **DaaS (Drone-as-a-Service)** | Nothing upfront; included in SaaS | All hardware | Low barrier, sticky | High CAPEX for SentinAgro |
| **Hardware Lease** | €200–400/month | Hardware (farmer leases) | Shared cost, lower churn | Moderate barrier |
| **Hardware Purchase** | €8,000–15,000 upfront | Software only | Low CAPEX for SentinAgro | High farmer barrier |

**Recommended:** **DaaS model** for first 50 farms (funded by seed capital), transitioning to **lease model** at scale. Hardware purchase as option for large operations.

### 5.4 Unit Economics Target (Per Farm, Year 2)

| Metric | Value |
|--------|-------|
| Average herd size | 500 head |
| ARPU/year | €4,800 |
| Drone hardware cost (amortized 3yr) | €(1,500) |
| Cloud/compute cost | €(600) |
| Field support (allocated) | €(800) |
| **Gross margin per farm** | **€1,900 (40%)** |
| **Target at scale (Year 4)** | **€2,900 (60%)** |

---

## 6. Financial Projections

### 6.1 CAPEX — Initial Investment

| Category | Amount (€) | Notes |
|----------|-----------|-------|
| Drone fleet (10 units) | 150,000 | DJI M350 RTK + sensor payloads |
| Sensor pods (thermal + RGB) | 120,000 | FLIR + custom integration |
| Edge compute modules | 30,000 | NVIDIA Jetson Orin NX per drone |
| Ground infrastructure | 40,000 | Charging stations, base stations |
| Cloud infrastructure (setup) | 50,000 | GPU instances, data pipeline |
| Software development | 600,000 | 18 months, 4-person core team |
| Regulatory & certification | 80,000 | SORA, OA applications, legal |
| Office & equipment | 30,000 | |
| **Total CAPEX** | **€1,100,000** | |

### 6.2 OPEX — Annual Operating Costs (Year 1)

| Category | Annual (€) | Notes |
|----------|-----------|-------|
| Salaries (8 FTE) | 640,000 | CTO, 4 engineers, 2 field ops, 1 sales |
| Cloud & compute | 72,000 | AWS/Azure GPU, storage, bandwidth |
| Drone maintenance | 45,000 | Parts, insurance, replacements |
| Marketing & sales | 80,000 | AgTech events, content, demos |
| Insurance (liability + aviation) | 35,000 | Commercial drone insurance NL |
| Legal & compliance | 30,000 | GDPR, aviation, contracts |
| Travel & field operations | 40,000 | Farm visits, pilot deployments |
| General & admin | 25,000 | Accounting, office, subscriptions |
| **Total OPEX (Year 1)** | **€967,000** | |

### 6.3 Revenue Projections

| Metric | Year 1 | Year 2 | Year 3 | Year 4 | Year 5 |
|--------|--------|--------|--------|--------|--------|
| Partner farms | 5 | 25 | 80 | 200 | 500 |
| Avg. herd size | 400 | 450 | 500 | 500 | 500 |
| Total heads monitored | 2,000 | 11,250 | 40,000 | 100,000 | 250,000 |
| Blended ARPU/head/yr | €6.00 | €7.20 | €8.40 | €9.00 | €9.60 |
| **Annual Revenue** | **€12,000** | **€81,000** | **€336,000** | **€900,000** | **€2,400,000** |
| Revenue growth | — | 575% | 315% | 168% | 167% |

### 6.4 Break-Even Analysis Framework

| Scenario | Break-Even Point |
|----------|-----------------|
| **Conservative** (40% GM) | ~420 farms / 210,000 head → **Year 5** |
| **Base case** (50% GM) | ~280 farms / 140,000 head → **Year 4** |
| **Optimistic** (60% GM) | ~190 farms / 95,000 head → **Year 3–4** |

**Key assumptions:**
- 90% annual retention rate
- Blended ARPU increases through tier upgrades and pasture analytics upsell
- OPEX scales at 60% of revenue growth rate
- Series A (€5–8M) required at Month 18 to fund EU expansion

### 6.5 Funding Requirements

| Round | Amount | Timing | Purpose |
|-------|--------|--------|---------|
| **Pre-seed** (completed, Oopuo) | €300K | Month 0 | Initial R&D, team formation |
| **Seed** | €2.5M | Month 3 | MVP development, pilot program, regulatory |
| **Series A** | €5–8M | Month 18–24 | EU expansion, fleet scaling, sales team |
| **Series B** | €15–25M | Month 36–42 | Global expansion, autonomous BVLOS fleet |

---

## 7. Competitive Analysis

### 7.1 Competitive Landscape Map

```
                    CONTACTLESS
                        ▲
                        │
         SentinAgro ●   │   ● CattleEye
         (drone+AI)     │   (camera+AI, ground)
                        │
   AREA-BASED ──────────┼────────── PER-ANIMAL
                        │
     ● DJI Ag           │   ● Cowlar
     (generic drones)   │   (smart tags)
                        │
     ● AgEagle          │   ● HerdDogg
     (crop focus)       │   (BT ear tags)
                        │
                        │   ● Allflex (Merck)
                    CONTACT │   (RFID + sensors)
                        ▼
```

### 7.2 Detailed Competitor Profiles

| Company | Type | Focus | Strengths | Weaknesses | Threat Level |
|---------|------|-------|-----------|------------|-------------|
| **Cowlar** | Smart ear tags | Dairy health monitoring | Per-animal precision, established in Pakistan/US | Per-head hardware cost, tag replacement, limited to tagged animals | Medium |
| **HerdDogg** | BT ear tags + readers | Health, estrus, traceability | Long-range Bluetooth (100+ yards), 77% sickness detection rate | Requires tagging every animal, reader infrastructure, US-focused | Medium |
| **CattleEye** | AI camera (ground) | Lameness, health scoring | Non-contact, proven AI, UK market | Ground-based cameras (limited coverage), fixed installation | **High** (closest competitor) |
| **Allflex/SenseHD** (Merck) | RFID + activity sensors | Health, reproduction | Massive distribution (Merck), integration ecosystem | Legacy technology, per-head cost, requires handling | Medium |
| **Smartbow** | Ear tags | Rumination, activity, location | Real-time alerts, European presence | Tag-based, dairy-only focus | Low–Medium |
| **AgEagle** | Drone platform | Crop analytics | Established drone brand, mapping expertise | No livestock-specific solutions, crop-focused | Low |
| **PrecisionHawk** (now part of Kespry) | Drone analytics | Mining, construction, agriculture | Enterprise-grade analytics platform | No livestock focus, pivoted away from agriculture | Low |
| **DJI Agriculture** | Drone hardware | Crop spraying, surveying | Market-leading hardware, global distribution | Platform only (no livestock analytics), Chinese regulatory risk | Low (potential partner) |

### 7.3 Competitive Advantages — SentinAgro

1. **Zero per-head hardware cost** — Only contactless aerial solution purpose-built for cattle
2. **Pasture + animal combined analytics** — Competitors do one or the other, never both
3. **Scalability** — One drone covers 200+ ha; tag-based solutions scale linearly with herd size
4. **Data richness** — Thermal + visual + multispectral in single flight vs. single-sensor tags
5. **Lower farmer labor** — No animal handling required for deployment
6. **EU-first regulatory positioning** — Building EASA compliance from day one

---

## 8. Risk Assessment

### 8.1 Risk Matrix

| Risk | Probability | Impact | Severity | Mitigation |
|------|------------|--------|----------|------------|
| **BVLOS regulatory delays** | High | High | 🔴 Critical | Start VLOS-capable; engage ILT early; use Dutch Drone Innovation Sandbox |
| **Weather dependency** | High | Medium | 🟠 High | All-weather drone specs (IP55+); complementary ground sensors; schedule around weather |
| **Farmer adoption resistance** | Medium | High | 🟠 High | Free pilot program; demonstrate ROI within 90 days; partner with farmer cooperatives (FrieslandCampina, Agrifirm) |
| **AI accuracy insufficient** | Medium | High | 🟠 High | Extensive ground-truth validation; hybrid human-AI workflow initially; iterative model improvement |
| **Competitor fast-follow** | Medium | Medium | 🟡 Medium | Build data moat (proprietary training data); patent key innovations; move fast |
| **Hardware failure/loss** | Medium | Low | 🟡 Medium | Redundant fleet; comprehensive insurance; modular repair |
| **Privacy/GDPR complaints** | Low | Medium | 🟡 Medium | Privacy-by-design; no human identification; farmer consent framework; DPO appointment |
| **Regulatory tightening** | Low | High | 🟡 Medium | Active regulatory engagement; EASA working group participation |
| **Key person dependency** | Medium | Medium | 🟡 Medium | Document all systems; cross-train team; advisory board |
| **Funding gap** | Low | High | 🟡 Medium | Conservative cash management; multiple investor pipeline; revenue from pilots |

### 8.2 Key Risk Deep-Dives

**Weather Dependency:**
Netherlands averages 130–140 rain days/year. Mitigation: IP55+ rated drones, thermal imaging works in overcast conditions, schedule flights during optimal windows (dawn/dusk for thermal). Historical weather data shows 60–70% of days have ≥2-hour flyable windows.

**Farmer Adoption:**
Dutch farmers are among Europe's most digitally advanced, but conservative with unproven technology. Strategy: partner with WUR (Wageningen University) for credibility, run controlled trials with measurable outcomes, leverage cooperative networks for peer referrals.

---

## 9. Implementation Timeline

### 18-Month Phased Roadmap

```
Month  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18
       ├──────────────┤├──────────────────┤├──────────────────┤
       PHASE 1: BUILD  PHASE 2: PILOT     PHASE 3: SCALE
```

### Phase 1 — Build (Months 1–6)

| Month | Milestone | Deliverable |
|-------|-----------|-------------|
| 1 | Team formation | CTO + 2 ML engineers + 1 drone engineer hired |
| 1–2 | Drone platform selection & procurement | 3 drones + sensor pods operational |
| 2–3 | Data collection flights | 500+ hours aerial data over 5 partner farms |
| 3–4 | ML model v0.1 | CattleDetect + ThermoHealth initial models |
| 4–5 | Cloud platform MVP | Ingestion pipeline, basic dashboard, alert system |
| 5–6 | Regulatory submission | SORA documentation, ILT engagement initiated |
| 6 | **Gate review:** MVP demo to investors | Working end-to-end demo on 2 farms |

### Phase 2 — Pilot (Months 7–12)

| Month | Milestone | Deliverable |
|-------|-----------|-------------|
| 7 | Pilot program launch | 5 farms onboarded (free tier) |
| 7–8 | Field operations team | 2 drone pilots + 1 field support hired |
| 8–10 | Model iteration | v0.5 models with pilot farm ground-truth |
| 9 | Specific category OA received (target) | Licensed for routine VLOS operations |
| 10–11 | Farmer feedback integration | Dashboard v2, mobile app beta |
| 11 | First paying customer | Scout or Sentinel tier conversion |
| 12 | **Gate review:** Pilot results report | Detection accuracy, farmer satisfaction, unit economics validation |

### Phase 3 — Scale (Months 13–18)

| Month | Milestone | Deliverable |
|-------|-----------|-------------|
| 13 | Series A fundraise initiation | Pitch deck, data room, investor roadshow |
| 13–14 | Fleet expansion | 10 drones operational |
| 14–15 | Sales team buildout | 2 sales + 1 marketing hire |
| 15 | BVLOS authorization (target) | Licensed for beyond-visual-line-of-sight |
| 15–16 | Geographic expansion planning | Germany, Belgium, Denmark scoping |
| 16–17 | 25 paying farms | Sentinel tier primary |
| 17–18 | Pasture analytics module | Multispectral upsell product launched |
| 18 | **Gate review:** Series A close target | €5–8M raised, 25+ farms, clear path to 100 |

### Key Dependencies & Critical Path

```
Regulatory OA ────────▶ Routine operations ────────▶ Scale
       │                                                │
       ▼                                                ▼
ML model accuracy ────▶ Farmer ROI proven ────────▶ Paying customers
       │                                                │
       ▼                                                ▼
Data collection ──────▶ Training datasets ────────▶ Model improvement loop
```

---

## 10. Conclusion & Recommendations

### 10.1 Feasibility Assessment

| Dimension | Assessment | Confidence |
|-----------|-----------|------------|
| **Market opportunity** | Large and growing; drone livestock monitoring is a clear white space | ✅ High |
| **Technical feasibility** | Achievable with current technology; ML accuracy is the key variable | ✅ High |
| **Regulatory pathway** | Viable but timeline-uncertain; BVLOS remains the critical bottleneck | ⚠️ Medium |
| **Business model** | SaaS per-head model is proven in PLF; DaaS reduces adoption friction | ✅ High |
| **Competitive position** | First-mover advantage in drone-specific cattle monitoring | ✅ High |
| **Financial viability** | Break-even achievable by Year 4–5; requires patient capital | ⚠️ Medium |

### 10.2 Go/No-Go Recommendation

**Recommendation: GO — with conditions.**

SentinAgro addresses a genuine market gap with a defensible technical approach. The precision livestock market is large, growing, and underserved by aerial solutions. The Netherlands provides an ideal beachhead with high livestock density, digital farming culture, and supportive innovation infrastructure.

**Conditions for proceeding:**

1. **Secure CTO with dual drone + ML expertise** within 60 days
2. **Formalize 3+ farm partnerships** (LOIs) before seed close — FrieslandCampina cooperative farms preferred
3. **Begin SORA process immediately** — regulatory timeline is the single largest risk
4. **Set ML accuracy gates:** ≥90% detection accuracy and ≥80% health anomaly precision before converting pilots to paid
5. **Maintain 18-month runway** post-seed to absorb regulatory delays

### 10.3 Strategic Recommendations

1. **Partner, don't compete** with tag companies — position as complementary (area monitoring + individual tags for high-value animals)
2. **Build the data moat** — proprietary aerial cattle datasets become the defensible asset
3. **EU-first, global second** — EASA compliance transfers across 27 member states
4. **Engage WUR (Wageningen)** as academic partner for credibility and talent pipeline
5. **Consider ESA BIC NL** (European Space Agency Business Incubation) for satellite + drone synergy funding

### 10.4 Next Steps

| Action | Owner | Deadline |
|--------|-------|----------|
| Finalize seed term sheet | CEO / Oopuo | March 2026 |
| CTO search kickoff | COO (Kira) | March 2026 |
| Farm partnership LOIs (3+) | BD | April 2026 |
| SORA pre-assessment with ILT | External counsel | April 2026 |
| Drone + sensor procurement | CTO (once hired) | May 2026 |
| MVP sprint kickoff | Engineering | May 2026 |

---

*This feasibility study is a living document. Market data sourced from MarketsandMarkets, Future Market Insights, MRFR, Mordor Intelligence, Eurostat, and FAO (2024–2025 reports). All projections are estimates and subject to revision based on pilot program outcomes.*

**Prepared by Kira, COO — Oopuo**  
**For internal and investor use only. Do not distribute without authorization.**
