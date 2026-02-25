---
name: osint-recon
description: Open Source Intelligence (OSINT) reconnaissance on a person, username, email, phone number, or company. Use when asked to investigate, look up, profile, or find information about someone from social media links, usernames, emails, phone numbers, or any identifying information. Covers username enumeration, email service detection, phone OSINT, corporate registry lookups, property analysis, family mapping, breach checks, and wealth estimation.
---

# OSINT Reconnaissance Skill

## Prerequisites

Docker container `kali-osint` must be running with tools installed. Verify:

```bash
docker ps --filter name=kali-osint --format '{{.Names}} {{.Status}}'
```

If not running:
```bash
docker start kali-osint 2>/dev/null || docker run -d --name kali-osint --hostname kali --restart unless-stopped \
  -v /home/adminuser/kali-osint/data:/data \
  -v /home/adminuser/kali-osint/reports:/reports \
  kali-osint sleep infinity
```

## Investigation Methodology

Follow these waves in order. Each wave feeds the next. Document all findings as you go.

### Wave 1: Passive Recon (no tools needed)

**Input:** Username, URL, or name

1. **Username enumeration** — Check the same handle across platforms:
   ```bash
   # Quick HTTP status check
   for site in github twitter tiktok youtube reddit linkedin pinterest medium twitch snapchat; do
     code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "https://$site.com/USERNAME" 2>/dev/null)
     echo "$site: $code"
   done
   # Also check: t.me/USERNAME, threads.net/@USERNAME
   ```

2. **Web search** — Use `web_search` tool with queries:
   - `"USERNAME" -site:TARGET_PLATFORM` (find other mentions)
   - `site:artstation.com "USERNAME"` (artists often use real names)
   - `site:linkedin.com "REAL_NAME" CITY` (professional profile)

3. **Profile scraping** — Use `web_fetch` on any discovered profiles. ArtStation, LinkedIn, Behance often expose real names.

4. **Domain check** — `dig +short USERNAME.com`, `whois USERNAME.com`

**Goal:** Get the real name. One real name unlocks everything.

### Wave 2: Free API & Registry Lookups

**Input:** Real name, location

5. **ReceitaWS (Brazil)** — Free CNPJ lookup, no auth:
   ```bash
   curl -s "https://receitaws.com.br/v1/cnpj/CNPJ_NUMBER" | python3 -m json.tool
   ```
   Returns: company name, address, phone, email, partners (QSA), capital, activity. **Rate limit: 3 req/min, add `sleep 25` between calls.**

6. **Surname sweep** — Search all CNPJs with the target surname in the same city. Builds family corporate network.

7. **Address analysis** — Search the exact address to identify the building, property type, and market value. Use `web_search` with the street address.

8. **Genealogy** — Search `"SURNAME" CITY familysearch` for historical records. Italian/German surnames in southern Brazil often trace to 1900s immigration records.

9. **Court records** — `site:jusbrasil.com.br "SURNAME" CITY processo`

10. **Google dorks for phone numbers:**
    ```
    intext:"PHONE_NUMBER" site:facebook.com
    intext:"PHONE_NUMBER" (ext:pdf | ext:doc | ext:xls)
    ```

**Goal:** Map the family network, corporate holdings, addresses, and wealth indicators.

### Wave 3: Kali OSINT Tools

**Input:** Username, emails, phone numbers from previous waves

11. **Sherlock** — Username across 400+ sites:
    ```bash
    docker exec kali-osint sherlock USERNAME --print-found --no-color 2>&1
    ```

12. **Maigret** — Deep username analysis (2669 sites, slower but more thorough):
    ```bash
    docker exec kali-osint maigret USERNAME --timeout 10 --no-color -a 2>&1
    ```
    Outputs to `/data/`. Extracts UIDs, blog IDs, metadata.

13. **Holehe** — Check which services an email is registered on:
    ```bash
    docker exec kali-osint holehe EMAIL@domain.com --no-color 2>&1
    ```
    Legend: `[+]` = registered, `[-]` = not registered, `[x]` = rate limited. Run one email at a time.

14. **PhoneInfoga** — Phone number OSINT:
    ```bash
    docker exec kali-osint phoneinfoga scan -n "+COUNTRYCODE_NUMBER" 2>&1
    ```
    Generates Google dork URLs for social media, pastebin, fraud databases, documents.

15. **h8mail** — Email breach search (needs API keys for full results):
    ```bash
    docker exec kali-osint h8mail -t EMAIL@domain.com 2>&1
    ```

**Goal:** Exhaustive digital footprint, service registrations, breach exposure.

## Reporting

Structure reports in numbered sections (§1, §2, etc.) with clear headers. Split long reports across multiple messages if sending via Telegram (4096 char limit).

### Report Template

```
§1. SUBJECT PROFILE — Name, age, location, contact details
§2. PROPERTY ANALYSIS — Address, building, market value, wealth indicators
§3. CORPORATE NETWORK — All companies, CNPJs, partners, activities
§4. FAMILY TREE — Reconstructed lineage, branches, locations
§5. DIGITAL FOOTPRINT — All confirmed accounts and platforms
§6. WEALTH ASSESSMENT — Estimated range based on indicators
§7. METHODOLOGY — Each step explained didactically
§8. UNEXPLORED VECTORS — What paid tools would unlock next
```

### Key Findings to Highlight

Mark critical discoveries with ⚠️:
- Leaked CPFs in CNPJ records
- Landline numbers (tied to physical addresses)
- Email patterns revealing dates (e.g., `name1909@` → birthday Sep 19)
- Property values vs age/income mismatch
- Phone area codes revealing origin city

## Country-Specific Registries

### Brazil
- **ReceitaWS**: Free CNPJ + QSA (shareholder) data
- **Econodata/Serasa/CNPJA**: Company lookup by name
- **Jusbrasil**: Court records (free search, paid details)
- **FamilySearch**: Birth/marriage/death records
- **SIGEF/INCRA**: Rural land registry
- **CAR**: Environmental rural registry
- **DETRAN**: Vehicle registry (requires auth)
- **Escavador**: All-in-one people search (~R$20/mo)

### Netherlands (EU)
- **KvK (Kamer van Koophandel)**: kvk.nl — Company registry
- **Kadaster**: kadaster.nl — Land/property registry
- **Overheid.nl**: Government records
- **OpenCorporates**: opencorporates.com — Global company search

## OPSEC Notes

- Always use the Kali container for active scanning (isolates from host)
- Tor is available: `docker exec kali-osint tor &` then use proxychains
- Rate limit everything: Sherlock/Maigret hammer sites fast
- HaveIBeenPwned API needs a $3.50/mo key for programmatic access
- PimEyes ($30/mo) and Dehashed ($5/mo) are the highest-value paid upgrades

## Installed Tools Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Sherlock | `sherlock USERNAME` | Username enumeration (400+ sites) |
| Maigret | `maigret USERNAME` | Deep username OSINT (2669 sites) |
| Holehe | `holehe EMAIL` | Email → service registration check |
| PhoneInfoga | `phoneinfoga scan -n "+NUM"` | Phone number OSINT + dorks |
| h8mail | `h8mail -t EMAIL` | Email breach/paste search |
| Nmap | `nmap TARGET` | Network/port scanning |
| Tor | `tor` + `proxychains` | Anonymous routing |
| Chromium | `chromium --headless` | Headless browser scraping |
| whois | `whois DOMAIN` | Domain registration lookup |
| dig | `dig DOMAIN` | DNS resolution |
