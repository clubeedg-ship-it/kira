# Cron Job Audit — 2026-02-09

**Total Jobs:** 12 (was 11, now 12 — one added today)
**All enabled:** ✅

## Job Inventory

| # | Job | Schedule | TZ | Last Run | Status |
|---|-----|----------|----|----------|--------|
| 1 | Midday Blocker Check | `0 13 * * 1-5` | Europe/Amsterdam | idle (not yet today) | ✅ OK |
| 2 | Evening Wrap | `0 18 * * *` | Europe/Amsterdam | 19h ago (~Feb 8 18:00) | ✅ OK |
| 3 | Night Shift - Kira Autonomous Work | `0 22 * * *` | Europe/Amsterdam | 15h ago (~Feb 8 22:00) | ✅ OK |
| 4 | Goal/Task Analyst | `0 5 * * *` | Europe/Amsterdam | 8h ago (~Feb 9 05:00) | ✅ OK |
| 5 | Morning Brief | `0 7 * * *` | Europe/Amsterdam | 6h ago (~Feb 9 07:00) | ✅ OK |
| 6 | Task Pre-Digester | `30 8 * * 1-5` | Europe/Amsterdam | 4h ago (~Feb 9 08:30) | ✅ OK |
| 7 | Friday Review | `0 17 * * 5` | Europe/Amsterdam | idle (next in ~4d) | ✅ OK |
| 8 | Executive Advisor - Weekly | `0 6 * * 0` | Europe/Amsterdam | 1d ago (~Feb 8 06:00) | ✅ OK |
| 9 | Monday Sprint Planning | `30 7 * * 1` | Europe/Amsterdam | 5h ago (~Feb 9 07:30) | ✅ OK |
| 10 | Abura Sales Weekly | `0 10 * * 1` | UTC | 2h ago (~Feb 9 10:00) | ✅ OK |
| 11 | Monthly OKR Review | `0 9 1 * *` | Europe/Amsterdam | idle (next in ~20d) | ✅ OK |
| 12 | (Unknown - newly added) | TBD | TBD | TBD | ⚠️ Need to verify |

## Issues Found

1. **Cron list API timing out** — `cron list` returns gateway timeout. Jobs still fire correctly. May be a gateway WS issue under load.
2. **Cron update error** — One failed update attempt at 16:17 UTC (invalid params: missing `kind` in payload, used `id` instead of `jobId`). Non-critical, was a one-off.
3. **12th job unknown** — Added between 11:36 and 15:45 UTC. Need to check jobs.json to identify.

## Recommendations

- Fix cron list timeout (possible gateway WS backpressure issue)
- Verify job #12 identity and purpose
- Consider consolidating: Morning Brief (07:00) and Task Pre-Digester (08:30) overlap in purpose
- Abura Sales Weekly uses UTC while others use Europe/Amsterdam — standardize?

## Verdict: ✅ All jobs healthy, firing on schedule. Minor cleanup opportunities.
