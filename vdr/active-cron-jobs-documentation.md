# Active Cron Jobs Documentation

*Documented: 2026-02-10*

## OpenClaw Cron Jobs (13 total, all enabled)

| Job | Schedule | Timezone | Type | Purpose |
|-----|----------|----------|------|---------|
| **Morning Brief** | 07:00 daily | Amsterdam | agentTurn | Daily briefing for Otto |
| **Evening Wrap** | 18:00 daily | Amsterdam | agentTurn | End-of-day summary |
| **Goal/Task Analyst** | 05:00 daily | Amsterdam | agentTurn | Review goals and task alignment |
| **Night Shift - Kira Autonomous Work** | 22:00 daily | Amsterdam | agentTurn | Autonomous value creation (this job) |
| **Task Pre-Digester** | 08:30 Mon-Fri | Amsterdam | agentTurn | Prepare daily task priorities |
| **Midday Blocker Check** | 13:00 Mon-Fri | Amsterdam | agentTurn | Identify and resolve blockers |
| **Monday Sprint Planning** | 07:30 Mon | Amsterdam | agentTurn | Weekly sprint setup |
| **Friday Review** | 17:00 Fri | Amsterdam | agentTurn | Weekly retrospective |
| **Executive Advisor - Weekly Strategy** | 06:00 Sun | Amsterdam | agentTurn | High-level strategic review |
| **Monthly OKR Review** | 09:00 1st of month | Amsterdam | agentTurn | Monthly objectives check |
| **Living VDR Agent** | Every 4h (00,04,08,12,16,20) | Amsterdam | agentTurn | Sync VDR documents |
| **Abura Sales Weekly** | 10:00 Mon | UTC | agentTurn | Abura Cosmetics sales support |
| **Dashboard UI Redesign** | (no schedule set) | UTC | agentTurn | One-off sprint task |

## System Cron (crontab)

| Schedule | Command | Purpose |
|----------|---------|---------|
| */10 * * * * | activity-daemon.js | Chimera activity feed daemon (restarts if dead) |

## System Timers (systemd)

Standard Ubuntu timers: apt updates, logrotate, fstrim, sysstat, man-db, e2scrub. No custom timers.

## Notes
- All OpenClaw jobs use `isolated/agentTurn` (run independently from main session)
- "Dashboard UI Redesign" has no schedule expression — may need cleanup
- Total: ~18 agent runs/day + continuous activity daemon
