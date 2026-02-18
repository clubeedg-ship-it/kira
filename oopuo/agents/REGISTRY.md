# Agent Registry

**Last Updated:** 2026-02-05 14:55 UTC

---

## Active Agents

| Agent | Role | Session Key | Status | Spawned |
|-------|------|-------------|--------|---------|
| Kira | CEO | agent:main:main | ACTIVE | - |
| CFO Agent | Chief Financial Officer | - | ✅ DONE | 2026-02-05 |
| QA Agent | Quality Assurance | - | ✅ DONE | 2026-02-05 |
| Migration Agent | VDR → Notion | - | ✅ DONE | 2026-02-05 |
| Revision Agent | IAM Doc Fix | - | ✅ DONE | 2026-02-05 |
| COO Agent | Operations Roadmap | agent:main:subagent:41b98e07-f0da-4ebc-9adf-33f4dfe86a1d | 🟢 RUNNING | 2026-02-05 |
| CMO Agent | OttoGen Launch | agent:main:subagent:3d43ec8d-f19c-48b7-9850-ecb580fec357 | 🟢 RUNNING | 2026-02-05 |

---

## Pending Agents (To Spawn)

| Agent | Role | Priority | Dependencies |
|-------|------|----------|--------------|
| COO Agent | Operations | HIGH | CFO done |
| CMO Agent | Marketing | HIGH | QA done |
| CTO Agent | Technology | MEDIUM | - |
| ContentCreator | Content | MEDIUM | CMO |
| Researcher | Research | MEDIUM | - |
| Developer | Technical | MEDIUM | CTO |

---

## Agent Communication Protocol

### To send to an agent:
```
sessions_send(sessionKey, message)
```

### To check agent status:
```
sessions_list(kinds: ["subagent"])
```

### To get agent history:
```
sessions_history(sessionKey, limit: 20)
```

---

## Escalation Matrix

| Issue Type | First Contact | Escalate To |
|------------|---------------|-------------|
| Financial | CFO Agent | Kira → Otto |
| Quality | QA Agent | Kira → Otto |
| Operations | COO Agent | Kira → Otto |
| Technical | CTO Agent | Kira → Otto |
| Strategic | Kira | Otto |

---

*Registry auto-updates on agent spawn/completion*
