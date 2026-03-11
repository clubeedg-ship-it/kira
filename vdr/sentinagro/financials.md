# SentinAgro — Financial Projection

**Drone-Based Cattle Monitoring Service for Brazilian Farms**
*Prepared: February 2026 | Launch Target: May 2026*

---

## 1. EQUIPMENT & CAPACITY

### Recommended Drone: DJI Mavic 3 Thermal (3T)

| Item | Spec |
|---|---|
| Price (EU retail) | €4,200–4,800 |
| Flight time | 45 min max / ~35 min practical |
| Thermal sensor | 640×512 FLIR, -20°C to 150°C |
| Visual camera | 48MP wide + 12MP tele (56× zoom) |
| Range | 15 km (O3 Enterprise) |
| Weight | 920g (sub-1kg, easier regulation) |

**Why this drone:** Thermal imaging detects sick/injured cattle (fever, lameness), counts animals in dense vegetation, and works at dawn/dusk when cattle are active. The Mavic 3T hits the sweet spot: enterprise thermal capability at consumer-adjacent price. The Matrice 350 RTK (€10K+) is overkill for a bootstrapped launch.

### Coverage Capacity (1 operator + 1 drone)

| Metric | Conservative Estimate |
|---|---|
| Flights per day | 4–6 (with battery swaps, 3 batteries) |
| Area per flight (80m altitude, 12 m/s) | 150–250 ha |
| **Daily coverage** | **600–1,200 ha** |
| Cattle per survey | Up to 2,000–5,000 head (depending on density) |
| Practical client visits/day | 1–2 farms (travel time included) |

*Sources: DJI enterprise specs (45 min flight, 21 m/s max speed); field reports from precision livestock companies (Embrapa, CattleEye, OneSoil); standard mapping rates at 80m AGL.*

### Equipment Budget

| Item | BRL | EUR |
|---|---|---|
| DJI Mavic 3T (Fly More Combo) | R$ 32,000 | €5,200 |
| Extra batteries (2×) | R$ 3,500 | €570 |
| DJI RC Pro Enterprise controller | (included in combo) | — |
| iPad/tablet for field display | R$ 3,000 | €490 |
| Carrying case, spare props, filters | R$ 1,500 | €245 |
| Software licenses (DJI FlightHub 2, yr 1) | R$ 2,500 | €410 |
| AI/CV processing (initial setup) | R$ 3,000 | €490 |
| **Total initial investment** | **R$ 45,500** | **~€7,400** |

*Exchange rate used: 1 EUR = R$ 6.15 (Jan 2025 average, BCB)*

---

## 2. BRAZILIAN MARKET

### Target Farms

Brazil has ~215M cattle (IBGE 2023), the world's largest commercial herd. Key regions:

| Region | Avg. Farm Size (cattle ranches) | Head per Farm | Farms >500 ha |
|---|---|---|---|
| Mato Grosso | 1,000–5,000 ha | 1,500–10,000 | ~12,000 |
| Goiás | 500–2,000 ha | 800–5,000 | ~8,000 |
| Minas Gerais | 200–1,000 ha | 500–3,000 | ~15,000 |
| Mato Grosso do Sul | 800–3,000 ha | 1,000–8,000 | ~9,000 |

*Sources: IBGE Agricultural Census 2017 (latest); CNA Brazil cattle statistics 2023; Embrapa Gado de Corte.*

**Total addressable market (farms >500 ha, serious cattle operations):** ~44,000 farms in top 4 states.

### What Farms Currently Pay

| Service | Monthly Cost (BRL) | Notes |
|---|---|---|
| Traditional veterinary visits (2×/month) | R$ 2,000–5,000 | Manual inspection, misses problems |
| Satellite imagery (NDVI/pasture) | R$ 500–2,000 | Low resolution, no animal-level data |
| Ear tag/GPS collar systems | R$ 30–80/head + R$ 1,000/mo platform | Expensive at scale (>1,000 head) |
| Manual herd counting (cowboys) | R$ 3,000–8,000 | Labor-intensive, inaccurate ±10-15% |

*Sources: Interviews with agronomists; pricing from Allflex, Cowmed, Connecterra; CNA Brazil cost surveys.*

### Competitor Landscape (Brazil)

- **Boi na Linha / Connecterra:** GPS collars, expensive per-head, targets dairy
- **Mapbiomas Pastagem:** Satellite, free/low-cost but no animal-level data
- **Horus Aeronaves:** Brazilian drone manufacturer, sells hardware not services
- **DroneVision / Skydrones:** Mapping services, not livestock-specific

**Gap:** No established drone-as-a-service for cattle monitoring in Brazil. Market is wide open.

---

## 3. UNIT ECONOMICS

### Pricing Model

**Monthly subscription per farm:**

| Tier | Coverage | Visits/Month | Price (BRL) | Price (EUR) |
|---|---|---|---|---|
| Basic | Up to 500 ha | 2 | R$ 2,500 | €407 |
| Standard | 500–1,500 ha | 4 | R$ 4,500 | €732 |
| Premium | 1,500–5,000 ha | 8 | R$ 8,000 | €1,300 |

**Value proposition:** Cheaper than GPS collars at scale, more precise than satellite, replaces 50% of manual veterinary inspection costs. A farm with 3,000 head spending R$ 80/head on collars = R$ 240K vs. R$ 4,500/month = R$ 54K/year.

### Monthly Operating Costs (Post-Launch)

| Cost | BRL/month | EUR/month |
|---|---|---|
| Drone operator salary (CLT or PJ) | R$ 4,500 | €732 |
| Vehicle/fuel (farm visits, ~3,000 km/mo) | R$ 2,500 | €407 |
| Drone maintenance/insurance | R$ 800 | €130 |
| Cloud/software (processing, storage) | R$ 600 | €98 |
| Otto's time (remote, 20h/mo) | R$ 0* | €0* |
| Telecom/internet | R$ 200 | €33 |
| Accounting/legal (MEI or LTDA) | R$ 500 | €81 |
| **Total monthly OPEX** | **R$ 9,100** | **~€1,480** |

*Otto's time valued at €0 during bootstrap — true cost ~€2,000/mo but not cash outflow.*

*Sources: Glassdoor/Catho Brazil drone pilot salaries; ANP fuel prices; SUSEP drone insurance.*

### Break-Even Analysis

| Scenario | Clients Needed | Monthly Revenue |
|---|---|---|
| All Basic (R$ 2,500) | 4 clients | R$ 10,000 |
| All Standard (R$ 4,500) | 3 clients | R$ 13,500 |
| Mix (2 Standard + 1 Basic) | 3 clients | R$ 11,500 |

**Break-even: 3–4 paying clients** at R$ 9,100/mo OPEX.

---

## 4. 12-MONTH GROWTH PROJECTION

### Assumptions
- Launch: May 2026
- 1 drone, 1 operator
- Otto manages remotely from EU (visits quarterly)
- Conservative client acquisition: ~1 new client/month after pilot phase
- Churn: 10% quarterly

| Month | Phase | Clients | Revenue (BRL) | OPEX (BRL) | Net (BRL) | Cumulative (BRL) |
|---|---|---|---|---|---|---|
| 1 (May) | Pilot | 0 (2 free trials) | 0 | 9,100 | -9,100 | -54,600* |
| 2 (Jun) | Pilot | 0 (2 free trials) | 0 | 9,100 | -9,100 | -63,700 |
| 3 (Jul) | Pilot → Paid | 1 | 4,500 | 9,100 | -4,600 | -68,300 |
| 4 (Aug) | Growth | 2 | 9,000 | 9,100 | -100 | -68,400 |
| 5 (Sep) | Growth | 3 | 12,000 | 9,500 | 2,500 | -65,900 |
| 6 (Oct) | Growth | 4 | 15,500 | 9,500 | 6,000 | -59,900 |
| 7 (Nov) | Scale | 4 | 15,500 | 9,500 | 6,000 | -53,900 |
| 8 (Dec) | Scale | 5 | 19,500 | 10,000 | 9,500 | -44,400 |
| 9 (Jan) | Scale | 5 | 19,500 | 10,000 | 9,500 | -34,900 |
| 10 (Feb) | Scale | 6 | 23,500 | 10,500 | 13,000 | -21,900 |
| 11 (Mar) | Scale | 7 | 27,500 | 11,000 | 16,500 | -5,400 |
| 12 (Apr) | Scale | 7 | 27,500 | 11,000 | 16,500 | 11,100 |

*\*Month 1 cumulative includes R$ 45,500 equipment investment.*

### Key Metrics at Month 12

| Metric | Value |
|---|---|
| Monthly Revenue | R$ 27,500 (€4,470) |
| Monthly Profit | R$ 16,500 (€2,680) |
| Active Clients | 7 |
| Annual Revenue (run-rate) | R$ 330,000 (€53,660) |
| **Total investment recovery** | **Month 11** |
| ROI (12 months) | ~24% on R$ 45,500 invested |

---

## 5. RISKS & MITIGATIONS

| Risk | Impact | Mitigation |
|---|---|---|
| ANAC/DECEA drone regulations tighten | High | Register as RPAS operator; stay <25kg category; obtain CAVE authorization per flight area |
| Rainy season (Nov–Mar) limits flying days | Medium | Schedule intensive surveying in dry months (May–Sep); offer reduced pricing in wet months |
| Single drone failure | High | Keep R$ 5K reserve for emergency replacement; DJI Care Refresh (R$ 1,800/yr) |
| Client acquisition slower than projected | Medium | Start with free pilots for 2 large farms; leverage word-of-mouth in tight-knit farmer networks |
| Remote management from EU | Medium | Hire reliable local operator; use FlightHub for remote mission planning; quarterly in-person visits |
| BRL/EUR exchange rate volatility | Low | Revenue and costs both in BRL; only initial investment exposed |

---

## 6. SCALING ROADMAP (Year 2+)

- **Month 13–18:** Add 2nd drone + operator → capacity doubles to 12–14 clients
- **Month 18–24:** Develop AI pipeline for automated health scoring from thermal data
- **Year 2 target:** 15 clients, R$ 70K/mo revenue, R$ 40K/mo profit
- **Year 3:** Expand to soy/corn crop monitoring (same drones, different software)
- **Exit/scale options:** License model to agricultural cooperatives; white-label for vet clinics

---

## SUMMARY

| | |
|---|---|
| **Initial Investment** | €7,400 (R$ 45,500) |
| **Monthly Break-Even** | 3–4 clients |
| **Time to Break-Even** | ~11 months |
| **Year 1 Revenue** | ~R$ 174,000 (€28,300) |
| **Year 1 Net** | R$ 11,100 (€1,800) profit after full investment recovery |
| **Competitive Moat** | First-mover in drone-as-a-service for cattle; thermal AI pipeline |

**Bottom line:** SentinAgro is a lean, capital-light entry into Brazil's massive cattle industry. With €7.4K investment and 3–4 clients, the business covers costs. The real upside is building the AI/data layer that makes the service defensible at scale.

---

*Sources: DJI Enterprise specs (enterprise.dji.com); IBGE Agricultural Census 2017; CNA Brazil; Embrapa Gado de Corte; Glassdoor Brazil (salaries); ANP (fuel); ANAC RBAC-E nº 94 (drone regulation); BCB exchange rates.*
*Prepared for internal use. All projections are estimates based on available data and conservative assumptions.*
