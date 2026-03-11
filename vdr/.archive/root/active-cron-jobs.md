# Active Cron Jobs — Full Inventory
*Documented: 2026-02-14*

---

## OpenClaw Cron Jobs (36 total)

### Kira — Core Operations
| Job | Schedule | Target | Enabled |
|-----|----------|--------|---------|
| Morning Brief | 07:00 daily | isolated | ✅ |
| Evening Wrap | 18:00 daily | isolated | ✅ |
| Night Shift - Autonomous Work | 22:00 daily | isolated | ✅ |
| Goal/Task Analyst | 05:00 daily | isolated | ✅ |
| Task Pre-Digester | 08:30 Mon-Fri | isolated | ✅ |
| Midday Blocker Check | 13:00 Mon-Fri | isolated | ✅ |
| Monday Sprint Planning | 07:30 Mon | isolated | ✅ |
| Friday Review | 17:00 Fri | isolated | ✅ |
| Executive Advisor - Weekly Strategy | 06:00 Sun | isolated | ✅ |
| Monthly OKR Review | 09:00 1st of month | isolated | ✅ |
| Living VDR Agent | Every 4h (0,4,8,12,16,20) | isolated | ✅ |
| Hourly Worklog Checkin | 08:00-23:00 hourly | main | ✅ |
| Self-Improvement: Weekly Analysis | 06:00 Sun | main | ✅ |

### Content & Outreach
| Job | Schedule | Target | Enabled |
|-----|----------|--------|---------|
| LinkedIn Post Reminder (Tue) | 07:00 Tue | main | ✅ |
| LinkedIn Post Reminder (Wed) | 07:00 Wed | main | ✅ |
| LinkedIn Post Reminder (Thu) | 07:00 Thu | main | ✅ |
| Abura Sales Weekly | 10:00 Mon | isolated | ✅ |

### Memory & Infrastructure
| Job | Schedule | Target | Enabled |
|-----|----------|--------|---------|
| Daily Graph Extraction | 02:00 daily | isolated | ✅ |
| Weekly Graph Audit | 03:00 Sun | isolated | ✅ |
| Inbox Batch Process | Every 4h | isolated | ✅ |

### Multi-Agent (Stella, Nova, Hannelore)
| Job | Schedule | Target | Agent | Enabled |
|-----|----------|--------|-------|---------|
| Stella Debts Playbook | 09:00 Mon | main | stella | ✅ |
| Nova Morning Brief | 07:00 daily | isolated | nova | ❌ |
| Nova Evening Wrap | 21:00 daily | isolated | nova | ✅ |
| Nova Weekly Review | 10:00 Sun | isolated | nova | ✅ |
| Hannelore Ochtend Brief | 08:00 daily | isolated | hannelore | ✅ |
| Hannelore Avond Wrap | 20:00 daily | isolated | hannelore | ✅ |
| Hannelore Balansen Reminder | 08:00 26th monthly | isolated | hannelore | ✅ |
| Hannelore Vakantie Voorbereiding | one-shot | isolated | hannelore | ✅ |
| Hannelore Gemeente Beslissing | one-shot | isolated | hannelore | ✅ |
| Hannelore Moeder Verjaardag Planning | one-shot | isolated | hannelore | ✅ |
| Hannelore Moeder Verjaardag Reminder | one-shot | isolated | hannelore | ✅ |
| Hannelore Mark Verjaardag Planning | one-shot | isolated | hannelore | ✅ |
| Hannelore Mark Verjaardag | one-shot | isolated | hannelore | ✅ |
| Hannelore Jer Eten Afstemmen | one-shot | isolated | hannelore | ✅ |

### One-Shot / Completed
| Job | Status |
|-----|--------|
| Dashboard UI Redesign Night Sprint | one-shot (likely fired) |
| Night Research: NLP Voice-to-Agent Pipeline | one-shot (likely fired) |

---

## System Crontab
```
*/10 * * * * pgrep -f activity-daemon.js || node ~/clawd/scripts/activity-daemon.js &
```

## PM2 Services (9 total, 8 running)
| Service | Status | Uptime | Memory |
|---------|--------|--------|--------|
| agent-log | online | 24h | 130MB |
| chat-sync | online | 2D | 165MB |
| gpu-router | online | 24h | 49MB |
| graph-sync | online | 6h | 105MB |
| kira-dashboard | online | 6h | 97MB |
| msg-proxy | online | 6h | 194MB |
| stella-tax | online | 29h | 67MB |
| voice-interceptor | **stopped** | - | - |
| whisper | online | 6h | 228MB |

---

## Observations & Recommendations
1. **voice-interceptor is stopped** — investigate if needed or remove
2. **Nova Morning Brief is disabled** — intentional? Conflicts with Kira's Morning Brief at same time
3. **6 Hannelore one-shots** — review if any have fired and can be cleaned up
4. **Hourly worklog (08-23)** — 16 main-session events/day, high token burn. Consider reducing to every 2-3h
5. **Living VDR every 4h** — verify it's producing value, 6 runs/day
