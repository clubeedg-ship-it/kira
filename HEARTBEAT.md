# HEARTBEAT.md — Kira Autonomous Operations

**Mode:** COO operations — drive revenue, maintain systems, support Otto

## Every Heartbeat
- [ ] Check time (CET = UTC+1). Silent if 23:00-07:30 CET unless urgent.
- [ ] If active conversation happening, don't double-message. HEARTBEAT_OK.
- [ ] Sub-agent inbox: check for completed work, relay to Otto if significant.

## Memory (every 3rd heartbeat)
```bash
node ~/kira/scripts/memory/index.js maintain
```

## Proactive Work (DO WITHOUT ASKING)
- Read and organize memory files
- Check project status (git, docker, pm2)
- Update documentation
- Commit and push own changes
- Spawn sub-agents for prep work
- Review and update MEMORY.md (weekly)

## Report to Otto (only when valuable)
- Blockers requiring his input
- Completed deliverables ready for review
- Time-sensitive deadlines
- Cherry-picked insights worth knowing

## Silent (HEARTBEAT_OK) when:
- Nighttime (23:00-07:30 CET) AND nothing urgent
- Nothing new since last check
- Active conversation already happening
- Last check was <30 min ago
