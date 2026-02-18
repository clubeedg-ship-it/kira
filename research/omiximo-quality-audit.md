# Omiximo Inventory System — Quality Audit Report
**Date:** 2026-02-15  
**Auditor:** Kira (subagent deep code review)  
**Scope:** `~/omiximo-email-automation` and `~/omiximo-inventory`

---

## Executive Summary

The system has **6 critical bugs, 4 high-severity issues, and 5 medium issues**. The most damaging: sales from Boulanger (and potentially any marketplace) can be recorded with **zero components extracted**, meaning no stock is deducted but the sale is marked successful. The root cause chain: vague product descriptions → failed regex extraction → no validation gate → silent success.

---

## BUG #1: No Validation Gate for Empty Component Extraction
**Severity: 🔴 CRITICAL**  
**Location:** `stock_manager.py` → `deduct_components()`

### Problem
When `ComponentExtractor.extract()` returns an `ExtractedComponents` with all-None/zero fields, `deduct_components()` simply skips every `if` block and returns an **empty results list**. The caller (`process_order`) treats this as success and proceeds to create a Sales Order.

```python
# stock_manager.py line ~160
def deduct_components(self, components, quantity=1, order_ref=""):
    results = []
    
    # 1. Deduct CPU
    if components.cpu:          # None → skipped
        ...
    # 2. Deduct GPU
    if components.gpu:          # None → skipped
        ...
    # 3. Deduct RAM
    if components.ram_gb > 0:   # 0 → skipped
        ...
    # 4. Deduct SSD
    if components.ssd_size:     # None → skipped
        ...
    
    return results  # Returns [] — caller sees "no failures"
```

### Impact
- Sale recorded with 0 components → inventory never deducted
- Profit calculation wrong (components cost = €0)
- InvenTree stock drifts from reality

### Confirmed Case
`sku_registry.json` shows `OMX-BOU-UNK-0-0-001` with cpu="-", ram_gb=0, storage_gb=0, gpu="" — a Boulanger sale (order F905MS48553-A) that went through with zero extraction.

### Fix
Add minimum component validation in `process_order()`:
```python
def process_order(self, order, create_sales_order=True):
    components = self.component_extractor.extract(sku=order.sku, description=order.product_description)
    
    # GATE: Refuse to process if essential components missing
    missing = []
    if not components.cpu: missing.append("CPU")
    if not components.gpu: missing.append("GPU")
    if components.ram_gb == 0: missing.append("RAM")
    if not components.ssd_size: missing.append("SSD")
    
    if missing:
        logger.error(f"Order {order.order_number}: Missing components: {missing}. "
                     f"SKU={order.sku}, Description={order.product_description[:100]}")
        raise ValueError(f"Cannot process order: missing {', '.join(missing)}")
```

---

## BUG #2: Boulanger Product Description Too Vague for Extraction
**Severity: 🔴 CRITICAL**  
**Location:** `boulanger.py` → `parse()`, regex for "Nom de l'article"

### Problem
Boulanger's email format has the product name under "Nom de l'article" which is typically a **short marketing name** like "B21" or "Omiximo Ghana" — NOT a full spec string like "Ryzen 7 5700X RTX 5060 16GB 1TB SSD".

```python
# boulanger.py
desc_match = re.search(
    r"Nom\s*de\s*l['\u2019]article[:\s]+(.+?)(?=\s*Etat|...)",
    body_text, re.IGNORECASE
)
if desc_match:
    order.product_description = desc_match.group(1).strip()[:200]
```

If the article name is just "B21", then:
- `ComponentExtractor.extract_from_description("B21")` → matches nothing
- `SKUGenerator.extract_specs("B21")` → cpu_brand="", ram_gb=0, storage_gb=0
- Generated SKU: `OMX-BOU-UNK-0-0-001` ← confirmed in registry

### Root Cause
Boulanger emails likely have the full spec description **elsewhere** in the body (perhaps in a longer "Beschrijving" or "Description complète" field), but the parser only extracts the short article name.

### Fix
1. Extract ALL text fields from the Boulanger email body and concatenate for description parsing
2. Or add a **SKU-to-config lookup table** that maps Boulanger's internal reference (e.g., "151382860") to known PC configurations
3. Or use the `sku` field (Référence interne) as a key to look up components

---

## BUG #3: SKU Generator Produces Invalid SKUs Without Warning
**Severity: 🔴 CRITICAL**  
**Location:** `sku_generator.py` → `generate_base_sku()`

### Problem
When specs extraction fails, the generator creates SKUs with `UNK-0-0` instead of raising an error:

```python
def generate_base_sku(self, marketplace, specs):
    cpu_part = f"{specs.cpu_brand}{specs.cpu_tier}" if specs.cpu_brand else "UNK"
    ram_part = str(specs.ram_gb) if specs.ram_gb > 0 else "0"
    storage_part = self.format_storage(specs.storage_gb) if specs.storage_gb > 0 else "0"
    return f"OMX-{mp_code}-{cpu_part}-{ram_part}-{storage_part}"
```

This creates `OMX-BOU-UNK-0-0-001` which is technically "valid" but represents a **complete extraction failure**. The SKU is then used downstream as if everything is fine.

### Fix
```python
def generate_sku(self, marketplace, description, order_number=""):
    specs = self.extract_specs(description)
    
    if not specs.cpu_brand or specs.ram_gb == 0 or specs.storage_gb == 0:
        logger.warning(f"Incomplete specs for order {order_number}: {specs}")
        # Still generate SKU but flag it
        # OR: raise ValueError(f"Cannot generate SKU: incomplete specs from '{description[:80]}'")
```

---

## BUG #4: Boulanger SKU Field Contains Internal Reference, Not Product SKU
**Severity: 🔴 CRITICAL**  
**Location:** `boulanger.py` → SKU extraction

### Problem
The parser extracts "Référence interne" (e.g., "151382860") as the SKU. This is Boulanger's internal product ID — it has **no relation** to the component configuration. When passed to `ComponentExtractor.extract_from_sku("151382860")`, every pattern fails:

```python
# ComponentExtractor.extract_from_sku()
# Looks for "R3", "R5", "R7" in parts → "151382860" has none
# Looks for "RTX" prefix → not found
# Looks for RAM pattern \d+G → "151382860" doesn't match
```

Result: empty ExtractedComponents from SKU path. Combined with the vague description (Bug #2), both extraction paths fail.

### Fix
Don't use Boulanger's "Référence interne" as a component SKU. Instead:
1. Map it to a known configuration via a lookup table
2. Or rely entirely on description-based extraction (after fixing Bug #2)

---

## BUG #5: Config Desync Between Frontend and Email Automation
**Severity: 🔴 CRITICAL**  
**Location:** `config/fixed_elements.json` vs `shared_config/fixed_elements.json`

### Problem
Two different config files exist with **conflicting data**:

| Field | `config/fixed_elements.json` | `shared_config/fixed_elements.json` |
|-------|-----|------|
| Case | SKYLINE (partId: 84) | NGG GAMING (partId: 87) |
| PSU | SP-620 (partId: 46) | SP-620 (partId: 46) |
| Motherboard | — | A520 (partId: 36) |
| Overhead | €95.00 | €122.00 |
| VAT | Not present | 20% |
| Commission | 6.2% | 6.2% |
| Updated | 2026-01-26 | 2026-02-15 |

The email-automation `config_loader.py` uses priority: `/app/shared_config/` (Docker) → `shared_config/` (local) → `config/` (legacy). But:
- If running outside Docker, it may read the **stale** `config/fixed_elements.json`
- The frontend syncs to `shared_config/` via API, but `config/` is never cleaned up
- **Different case being deducted** depending on which config is loaded

### Fix
1. Delete `config/fixed_elements.json` (legacy)
2. Ensure email-automation always reads from `shared_config/`
3. Add a config version/hash check on startup

---

## BUG #6: Frontend Transactions in localStorage Only — No Persistence
**Severity: 🔴 CRITICAL**  
**Location:** `profit.js` → `profitState.transactions`

### Problem
Manual sales recorded via the frontend are stored **only in localStorage**:

```javascript
const profitState = {
    transactions: [],  // In-memory only, loaded from localStorage
    ...
};
```

The `recordSale.submit()` creates a transaction object and stores it locally. There is **no sync to InvenTree or any backend database**. Consequences:
- Clear browser cache → all transaction history lost
- Different device → no historical sales visible
- No backup mechanism

The system does fetch Sales Orders from InvenTree for display, but manually recorded sales exist only in the browser.

### Fix
1. POST manual transactions to InvenTree as Sales Orders (already partially implemented via `SalesOrderManager` on the backend)
2. Or add a dedicated transactions API endpoint
3. At minimum, add localStorage export/import functionality

---

## BUG #7: RAM Pattern Regex Matches GPU VRAM
**Severity: 🟡 HIGH**  
**Location:** `component_extractor.py` → `extract_from_description()`

### Problem
The RAM regex is too greedy:
```python
ram_match = re.search(r"(?:RAM\s+)?(\d+)\s*GB(?:\s*(?:RAM|DDR\d))?", description, re.IGNORECASE)
```

For a description like "RTX3050-6GB 16GB RAM", this matches "6" (from GPU VRAM) first, not "16" (actual RAM).

### Fix
```python
# Require "RAM" keyword or DDR qualifier, or use negative lookbehind for GPU context
ram_match = re.search(r"(?:RAM\s+)(\d+)\s*GB|(\d+)\s*GB\s*(?:RAM|DDR\d)", description, re.IGNORECASE)
```

---

## BUG #8: Bol.com Parser Relies on Subject Line for Product Description
**Severity: 🟡 HIGH**  
**Location:** `bolcom.py` → `parse()`

### Problem
```python
desc_match = re.search(
    r"bestelling[:\s]+(.+?)\s*\(bestelnummer", subject, re.IGNORECASE
)
```

The product description comes from the email **subject line**, which may be truncated by email clients. If the subject is cut short (e.g., "Nieuwe bestelling: Gaming PC Ryzen 7-5700X RTX 5060 16GB..."), storage info ("1TB SSD") could be lost.

The body fallback only looks for `product|artikel` patterns which may not match bol.com's actual body format.

### Fix
Parse the full email body for product details, not just the subject.

---

## BUG #9: No Intel CPU Support in ComponentExtractor
**Severity: 🟡 HIGH**  
**Location:** `component_extractor.py` → `CPU_MAP` and `CPU_PATTERNS`

### Problem
Only one Intel entry exists:
```python
CPU_MAP = {
    "I5-15": "INTEL-15",  # Only one Intel SKU
    # No I7, I9, or specific models
}
CPU_PATTERNS = [
    # ALL patterns are AMD Ryzen only
]
```

Any Intel-based PC will fail CPU extraction entirely.

### Fix
Add Intel patterns to both `CPU_MAP` and `CPU_PATTERNS`.

---

## BUG #10: `_generate_sku_from_description` in Boulanger Parser Duplicates Logic
**Severity: 🟡 HIGH**  
**Location:** `boulanger.py` → `_generate_sku_from_description()`

### Problem
This method duplicates the SKU generator's extraction logic but with **different patterns**. The RAM regex `(\d+)\s*GB` will match VRAM too. Storage only matches TB, not GB SSDs. This method is called when `sku` is empty but `product_description` exists, creating an inconsistent SKU that differs from `generated_sku`.

Two SKU fields exist on OrderData: `sku` (from this method) and `generated_sku` (from SKUGenerator). They can conflict.

### Fix
Remove `_generate_sku_from_description` from all parsers; rely solely on `SKUGenerator.generate_sku()`.

---

## BUG #11: `check_stock_availability` Silently Ignores Missing Components
**Severity: 🟠 MEDIUM**  
**Location:** `stock_manager.py` → `check_stock_availability()`

### Problem
```python
if components.cpu:    # If None → not checked, not reported as issue
    cpu_stock = ...
```

If CPU is None (extraction failed), it's **not reported as an issue** — the check passes. Should report "CPU not identified" as an issue.

---

## BUG #12: Frontend Stock Deduction Uses PATCH Instead of InvenTree Stock API
**Severity: 🟠 MEDIUM**  
**Location:** `profit.js` → `recordSale.submit()`

### Problem
```javascript
await api.request(`/stock/${batch.stockId}/`, {
    method: 'PATCH',
    body: JSON.stringify({
        quantity: (await this.getStockQty(batch.stockId)) - batch.qty
    })
});
```

This directly sets the quantity via PATCH, which:
1. Has a race condition (read-then-write with async gap)
2. Doesn't create proper stock tracking history in InvenTree
3. InvenTree has a dedicated stock removal API (`/stock/remove/`) that should be used

---

## BUG #13: Sales Order Created with unit_price=0 for All Components
**Severity: 🟠 MEDIUM**  
**Location:** `stock_manager.py` → `_build_components_sold()`

### Problem
```python
sold.append({
    "sku": ram_sku,
    "quantity": num_sticks * order.quantity,
    "unit_price": 0,  # Always zero!
    "notes": f"...",
})
```

Every component in the Sales Order has `unit_price: 0`, making the SO useless for cost tracking in InvenTree.

---

## BUG #14: `OrderData.is_valid()` Too Permissive
**Severity: 🟠 MEDIUM**  
**Location:** `base.py` → `OrderData.is_valid()`

### Problem
```python
def is_valid(self):
    return bool(self.order_number and (self.sku or self.generated_sku))
```

An order with a number and `OMX-BOU-UNK-0-0-001` as generated_sku passes validation. No check for price > 0, no check for product_description being non-empty.

---

## BUG #15: MediaMarktSaturn Parser Doesn't Decode HTML Entities
**Severity: 🟠 MEDIUM**  
**Location:** `mediamarktsaturn.py` → `parse()`

### Problem
Unlike Boulanger and Bol.com parsers which call `html.unescape()`, MediaMarktSaturn works on raw `body`:
```python
body = email_data.get("body", "")  # No html.unescape()!
```

HTML entities like `&euro;`, `&amp;`, `&#39;` in the body will break regex matches.

---

## Priority Fix Order

1. **Bug #1** (validation gate) — prevents all future zero-component sales
2. **Bug #2 + #4** (Boulanger extraction) — fixes the confirmed failure case
3. **Bug #5** (config desync) — delete legacy config, single source of truth
4. **Bug #3** (SKU generator warning) — adds visibility to extraction failures
5. **Bug #6** (localStorage persistence) — prevents data loss
6. **Bugs #7-10** (extraction quality) — improves accuracy
7. **Bugs #11-15** (medium issues) — robustness improvements
