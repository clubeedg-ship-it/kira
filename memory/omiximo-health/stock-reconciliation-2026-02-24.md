# Omiximo Stock Reconciliation — 2026-02-24 (Updated with Purchase Data)

## Summary
- **Period:** Jan 31 → Feb 24, 2026
- **Total orders processed (success=True):** 70 (excl. TEST-001)
- **Orders with component deductions:** ~58-69
- **Failed orders:** ~50+ (stock unavailable or parsing failures)
- **RAM catastrophe impact:** ⚠️ 1 order "succeeded" but NO massive deduction occurred

---

## Verified Purchases Since Jan 31

### Megekko
| Order | Date Delivered | Items | Qty | Unit Price |
|-------|---------------|-------|:---:|-----------|
| ME010226000679 | Feb 2 | MSI RTX 5070 12G VENTUS 2X OC | 1 | €649.00 |
| ME010226000679 | Feb 2 | Seasonic G12 GC-750 PSU | 1 | €74.90 |
| ME050226000787 | Feb 6 | MSI RTX 5060 8G VENTUS 2X OC | 10 | €319.00 |
| ME050226000787 | Feb 6 | INNO3D RTX 5060 Ti TWIN X2 8GB | 3 | €429.00 |
| ME090226000236 | Feb 10 | MSI RTX 5070 12G VENTUS 2X OC | 2 | €639.00 |
| ME090226000236 | Feb 10 | Seasonic G12 GC-750 PSU | 2 | €74.90 |
| ME160226000963 | Feb 17 | Logitech K400 Plus keyboard | 2 | €34.90 |
| ME180226001038 | Feb 19 | ASRock A520M-HVS motherboard | 1 | €52.90 |

### KOSATEC
| Order | Date | Items | Qty | Unit Price |
|-------|------|-------|:---:|-----------|
| S619703 | Feb 5 | AMD Ryzen 7 5700X Tray | 50 | €111.30 |
| S619703 | Feb 5 | Gigabyte A520M K V2 (mobo) | 20 | €38.90 |
| S619703 | Feb 5 | Intenso 512GB M.2 SSD | 50 | €53.25 |
| S621104 | Feb 11 | Gigabyte A520M K V2 (mobo) | 30 | €38.90 |
| S621804 | Feb 13 | Innovation IT 8GB DDR4 2666 RAM | 40* | €47.50 |
| S622582 | Feb 17 | Gigabyte A520M K V2 (mobo) | 35 | €38.90 |

*Nick Wilde confirmed "only had 40x left" of the 55 ordered

### API BV (contents unknown — PDF invoices)
| Invoice | Date | Tracking |
|---------|------|----------|
| R 532604 / B 2621986 | Feb 5 | UPS 1Z8397826872804195 |
| R 532681 / B 2622106 | Feb 6 | UPS 1Z8397826872908127 |
| R 534739 / B 2624419 | Feb 19 | UPS 1Z8397826870806133 |

⚠️ **API BV invoice contents are in PDF attachments — cannot extract automatically. Otto needs to check these manually.**

### SohooPC (FUTURE — not received yet)
- Order 10467-26001: New case production order, deposit paid Feb 10, artwork confirmed Feb 10. Manufacturing in progress.

### ASRock (QUOTE ONLY — not purchased)
- Quote inquiry for 200x A520 motherboards. Call held Feb 13, referred to distributor 2by2. No order placed yet.

---

## Purchase Summary (Verified from emails)

| Component | Qty Purchased | Source |
|-----------|:---:|--------|
| Ryzen 7 5700X | 50 | KOSATEC |
| A520M motherboard | 86 | KOSATEC (20+30+35) + Megekko (1) |
| 512GB SSD (M.2) | 50 | KOSATEC |
| 8GB RAM DDR4 | 40 | KOSATEC |
| RTX 5060 | 10 | Megekko |
| RTX 5060 Ti | 3 | Megekko |
| RTX 5070 | 3 | Megekko |
| Seasonic PSU | 3 | Megekko |
| Logitech K400+ | 2 | Megekko (accessory, not PC component) |
| **API BV orders** | **???** | **3 invoices — PDF only** |

---

## Full Reconciliation (with verified purchases)

| Component | Jan31 | Purchased | Sold | Expected | Actual | Diff | Status |
|-----------|:---:|:---:|:---:|:---:|:---:|:---:|--------|
| RYZEN 3-3200 | 33 | 0 | 4 | 29 | 28 | -1 | ⚠️ Minor (-1) |
| RYZEN 5-3400G | 13 | 0 | 1 | 12 | 12 | ✅ | Match |
| RYZEN 5-4500 | 3 | 0 | 12 | -9 | 5 | **+14** | ❓ 14 unaccounted (API BV?) |
| RYZEN 7-5700G | 10 | 0 | ~2 | ~8 | 8 | ✅ | ~Match |
| RYZEN 7-5700X | 16 | **50** | 38 | 28 | 24 | -4 | ⚠️ 4 missing |
| 8GB RAM | 237 | **40** | 78 | 199 | 182 | **-17** | ⚠️ 17 over-deducted |
| 16GB RAM | 117 | 0 | 36 | 81 | 120 | **+39** | ❓ 39 unaccounted (API BV?) |
| 256GB SSD | 20 | 0 | 1 | 19 | 19 | ✅ | Match |
| 512GB SSD | 43 | **50** | 15 | 78 | 65 | **-13** | ⚠️ 13 missing |
| 1TB SSD | 27 | 0 | 21 | 6 | 46 | **+40** | ❓ 40 unaccounted (API BV?) |
| 2TB SSD | 35 | 0 | 6 | 29 | 26 | -3 | ⚠️ 3 over-deducted |
| RTX3050-6GB | 25 | 0 | 9 | 16 | 10 | -6 | ⚠️ 6 over-deducted |
| RTX-3060 | 2 | 0 | 0 | 2 | 2 | ✅ | Match |
| RTX-5050 | 20 | 0 | 7 | 13 | 11 | -2 | ⚠️ 2 missing |
| RTX-5060 | 18 | **10** | 30 | -2 | 5 | **+7** | ❓ 7 unaccounted (API BV?) |
| RTX-5060TI | 10 | **3** | 1 | 12 | 2 | **-10** | 🔴 10 MISSING |
| RTX-5070 | 1 | **3** | 1 | 3 | 0 | **-3** | 🔴 3 MISSING |
| A520 (mobo) | 53 | **86** | ~58 | ~81 | 34 | **-47** | 🔴 47 MISSING |
| NGG (case) | 226 | 0 | ~69 | ~157 | 157 | ✅ | Match |
| SP-620 (PSU) | 149 | 0 | ~69 | ~80 | 80 | ✅ | Match |

---

## Critical Findings 🔴

### 1. Major Discrepancies (purchased but not in InvenTree)
| Component | Purchased | Missing from Stock | Likely Explanation |
|-----------|:---:|:---:|--------|
| A520M mobo | 86 | 47 | **Not all added to InvenTree?** Or sold outside automation |
| RTX-5060TI | 3 | 10 | **More sold than tracked** + possibly not added |
| RTX-5070 | 3 | 3 | **Purchased but never added to InvenTree** |
| 512GB SSD | 50 | 13 | Partial add? Different SKU mapping? |
| 8GB RAM | 40 | 17 | Partial add or extra deductions from duplicates |

### 2. Unaccounted Stock Increases (likely API BV)
| Component | Extra Stock | Probable Source |
|-----------|:---:|--------|
| RYZEN 5-4500 | +14 | API BV invoice(s) |
| 16GB RAM | +39 | API BV invoice(s) |
| 1TB SSD | +40 | API BV invoice(s) |
| RTX-5060 | +7 | API BV invoice(s) |

**⚠️ API BV sent 3 invoices (Feb 5, 6, 19) with PDF attachments. These likely contain: ~14x Ryzen 5-4500, ~39x 16GB RAM, ~40x 1TB SSD, ~7x RTX-5060. Otto needs to verify.**

### 3. RTX-5060TI: 10 units vanished
- Jan 31 baseline: 10
- Purchased: 3 (Megekko)
- Sold via automation: 1 (order 01241_300604806-A)
- Expected: 12
- Actual: 2
- **10 MISSING** — sold manually? Shipped but not via email system?

### 4. RTX-5070: All 3 purchased units missing
- Bought 3 from Megekko (1 on Feb 2, 2 on Feb 10)
- 1 was sold (01241_299555955-A on Feb 6)
- Expected: 3
- Actual: 0
- **Possibly sold before being added to InvenTree, or not added at all**

---

## RAM Catastrophe Assessment

### 🟢 Verdict: NO massive wrong deduction occurred

**Evidence:**
- F905MU72289-A (ram_gb=5700, success=True, Feb 6): The validation gate caught missing GPU/SSD
- With 40 new 8GB sticks purchased (KOSATEC, Feb 13) + baseline 237 - ~78 sold = ~199 expected
- Actual: 182 → 17 under, consistent with duplicate orders or extra untracked sales
- If 712 sticks had been deducted, stock would be deeply negative

### Affected Boulanger Orders (all with bad RAM parsing):
| Order | Parsed RAM | Status | Impact |
|-------|:---:|--------|--------|
| F905MU72289-A | 5700 GB | success=True | CPU deducted only (validation caught missing GPU/SSD) |
| F905MU97701-A | 3200 GB | Failed | None |
| F905MW07602-A | 5700 GB | Failed | None |
| F905MW07694-A | 5700 GB | Failed | None |
| F905MW95107-A | 3200 GB | Failed | None |
| F905MX06841-A | 3200 GB | Failed | None |
| F905MX10359-A | 3200 GB | Failed | None |

---

## Boulanger Email Types

1. **"Commande n°XXX à expédier"** = **REAL SALE** ✅ PROCESS — has SKU, price, qty, address
2. **"Confirmation de réception automatique..."** = Auto-receipt ❌ SKIP — no product details
3. **"Vous avez une ou plusieurs commandes à confirmer"** = Reminder ❌ SKIP
4. **"Nouvelle facture disponible"** = Invoice notification ❌ SKIP
5. **"Vous avez reçu un message..."** = Customer message ❌ SKIP

Parser now correctly filters. Only type 1 gets processed.

---

## Action Items for Otto

1. **🔴 Check API BV invoices** (R 532604, R 532681, R 534739) — likely contain the ~14 Ryzen 5-4500, ~39 16GB RAM, ~40 1TB SSD, ~7 RTX-5060
2. **🔴 Verify RTX-5060TI** — 10 units missing. Were they sold manually outside the system?
3. **🔴 Verify RTX-5070** — 3 purchased from Megekko but 0 in stock. Were all sold manually?
4. **🔴 Add KOSATEC purchases to InvenTree** if not already done (50x R7-5700X, 86x A520M, 50x 512GB SSD, 40x 8GB RAM)
5. **⚠️ Re-queue failed orders** — ~20+ with stock now available, ~15 with parsing failures
6. **⚠️ Fix duplicate processing** — F905MD53591-A (3x), C0000CT5T0 (2x), C0000CMX65 (2x) had extra deductions
7. **📋 KOSATEC S621804**: Nick said "only 40x left" — confirm 40 or 55 8GB sticks were received
