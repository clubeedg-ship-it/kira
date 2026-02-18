# 13 — Onboarding

Post-signup wizard. Runs once per user. Tracked by `setup_completed` flag on user record.

## Steps
1. **Welcome** — "Meet Kira" hero, [Get Started]
2. **Connect AI** — Add API key (OpenRouter recommended) or skip (uses server default)
3. **Name Your Agent** — Optional: customize Kira's name/personality
4. **First Chat** — Drop into chat with a welcome message from Kira

## Rules
- Every step is skippable (except welcome click)
- Skipping uses sensible defaults
- Never blocks access to the platform
- Never shows again after completion (or skip-all)
- If user navigates away mid-wizard, resume on next visit
