# IAM Lead Gen Infrastructure — Apollo.io & LinkedIn Setup

**Prepared:** March 15, 2026  
**Purpose:** Infrastructure for systematic outreach to Dutch kindergarten chains.

---

## 1. Targeting Logic

| Segment | Target Organizations | Decision Maker Titles |
|---------|-----------------------|-----------------------|
| **Tier 1: Whales** | Partou (1000+), Humankind (450+), Babilou NL (300+) | *Facilitair Manager, Directeur Innovatie, Hoofd Pedagogiek* |
| **Tier 2: Regionals** | Kindergarden, CompaNanny, Kibeo, gro-up | *Directie, Operationeel Manager* |
| **Tier 3: Independents**| Top 50 premium KDVs in Randstad area | *Eigenaar, Locatiemanager* |

---

## 2. Apollo.io Search & Export Schema

To be used for enriching the `prospects.md` list:

- **Geography:** Netherlands
- **Industry:** Individual & Family Services / Education Management
- **Keywords:** "Kinderopvang", "KDV", "Kindercentrum"
- **Company Headcount:** 
    - Tier 1: 1001+
    - Tier 2: 201 - 1000
    - Tier 3: 11 - 200

---

## 3. Outreach CRM Tracking Fields

Fields to be synced from Apollo/LinkedIn to Notion Sales Quest DB:

1. **Organization Name**
2. **Contact Name**
3. **Title**
4. **Email (Verified status)**
5. **LinkedIn URL**
6. **Total Locations** (Indicator of deal size)
7. **Pedagogy Type** (Reggio Emilia, Montessori, etc. — for personalizing script)
8. **Last Press Date** (Renovations or new openings)

---

## 4. Next Steps for Otto (Validation)

1. **Apollo.io API Key:** Ensure key is stored in `~/.config/apollo/api_key` for autonomous enrichment.
2. **Sales Sequence:** First batch of "Whale" outreach should be manual-heavy; Tier 3 can be automated via the email sequence in `vdr/iam/cold-email-templates.md`.

---
*Kira ⚡*
