---
name: kira-routine
description: CEO daily routine and gamification system. Show today's routine, complete checkpoints, check XP/level/streak.
metadata:
  {
    "openclaw": { "emoji": "🎮", "requires": { "anyBins": ["node", "sqlite3"] } },
  }
---

# Kira Routine Skill

CEO daily routine management and gamification system. Track Otto's daily checkpoints, earn XP, maintain streaks, and level up.

## Commands

### Show today's routine
Display all checkpoints for today with completion status and XP values.
```bash
node /home/adminuser/kira/src/index.js routine today
```

### Complete a checkpoint
Mark a specific checkpoint as done and earn XP.
```bash
node /home/adminuser/kira/src/index.js routine done <checkpoint_name>
```

Checkpoint names (9 daily):
- `morning_review` - Review overnight alerts and messages
- `priority_set` - Set top 3 priorities for the day
- `agent_briefing` - Review agent status and pending jobs
- `deep_work` - Complete focused work block
- `midday_check` - Midday progress check
- `stakeholder` - Stakeholder communication
- `learning` - Learning/reading block
- `evening_review` - End of day review and reflection
- `planning` - Next day planning

Example:
```bash
node /home/adminuser/kira/src/index.js routine done morning_review
```

### Check XP, level, and streak
Show current CEO stats: total XP, level, and consecutive day streak.
```bash
node /home/adminuser/kira/src/index.js xp
```

### System health check
Quick health check across all Kira subsystems.
```bash
node /home/adminuser/kira/src/index.js health
```

## Database Queries

For detailed gamification data, query `~/.kira/kira.db` directly.

### Today's routine details
```bash
sqlite3 ~/.kira/kira.db "SELECT checkpoint, status, xp_value, completed_at FROM daily_routine WHERE date = date('now') ORDER BY sort_order;"
```

### XP history
```bash
sqlite3 ~/.kira/kira.db "SELECT date, SUM(xp_value) as daily_xp FROM daily_routine WHERE status = 'completed' GROUP BY date ORDER BY date DESC LIMIT 7;"
```

### Streak calculation
```bash
sqlite3 ~/.kira/kira.db "SELECT date, COUNT(*) as completed FROM daily_routine WHERE status = 'completed' GROUP BY date ORDER BY date DESC LIMIT 14;"
```

## Tips

- Run `routine today` at the start of each day to generate checkpoints
- Complete checkpoints in order for best flow, but any order works
- XP accumulates toward levels; higher levels unlock agent autonomy
- Streaks multiply XP bonuses - don't break the chain
- Use `xp` to flex current stats in conversations
