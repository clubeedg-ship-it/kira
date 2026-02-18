# Autonomy Levels Design

## Overview

Every action an agent can take is classified into one of three autonomy levels: **GREEN**, **YELLOW**, or **RED**. This determines whether the agent acts freely, acts and reports, or asks permission first.

Autonomy levels are configurable per user and can be overridden per agent type.

---

## Level Definitions

### 🟢 GREEN — Do Without Asking

Actions the agent performs freely. No confirmation needed, no report required.

| Category | Actions |
|----------|---------|
| **File Operations** | Read, write, edit, create, organize files in workspace |
| **Memory** | Update MEMORY.md, daily files, context buffers, heartbeat state |
| **Internal Research** | Web search, web fetch, reading documentation |
| **Sub-Agent Spawning** | Spawn sub-agents and specialists within resource limits |
| **Code Execution** | Run safe commands (git status, ls, cat, npm install, tests) |
| **Canvas** | Render widgets, charts, previews |
| **Self-Configuration** | Update own prompts, HEARTBEAT.md, workspace files |
| **Memory Maintenance** | Curate memories, extract facts, prune outdated info |

**Rationale:** These actions are contained within the workspace, reversible, and have no external side effects.

### 🟡 YELLOW — Do and Report

Actions the agent performs but reports to the user afterward. User is informed but not blocked.

| Category | Actions | Report Format |
|----------|---------|---------------|
| **Sending Messages** | Reply in group chats, DM responses | "I replied to X in #channel" |
| **External API Calls** | Calling third-party APIs, webhooks | "Called {api} with {params}" |
| **Cron Scheduling** | Creating/modifying scheduled jobs | "Scheduled: {description} at {time}" |
| **Git Operations** | Commit, push, pull, branch operations | "Pushed 3 commits to main" |
| **Package Installation** | npm install, apt install | "Installed {package}@{version}" |
| **Notifications** | Sending push notifications to devices | "Notified you about {topic}" |

**Report delivery:** Inline in conversation if active, or batched in next heartbeat.

```typescript
interface YellowReport {
  action: string;
  category: string;
  details: string;
  timestamp: string;
  reversible: boolean;
  undo_command?: string;
}

// Example
{
  action: "git_push",
  category: "Git Operations",
  details: "Pushed 3 commits to origin/main (design docs)",
  timestamp: "2026-02-11T09:55:00Z",
  reversible: true,
  undo_command: "git revert HEAD~3..HEAD"
}
```

### 🔴 RED — Ask First

Actions that require explicit user approval before execution. Agent presents the plan and waits.

| Category | Actions | Why |
|----------|---------|-----|
| **Email** | Sending emails on behalf of user | External, permanent, represents user |
| **Public Posts** | Tweets, blog posts, forum posts | Public, permanent, reputational risk |
| **Financial** | Any transaction, purchase, subscription | Monetary impact |
| **Destructive Ops** | `rm -rf`, database drops, account deletion | Irreversible data loss |
| **Access Control** | Changing permissions, sharing files externally | Security implications |
| **Account Actions** | Login, signup, password changes | Identity and security |
| **External Messaging** | Cold outreach, contacting new people | Social impact |
| **Infrastructure** | Server provisioning, DNS changes, deployments | Cost and availability |

**Approval flow:**
```
Agent: "I'd like to send this email to john@example.com:
        Subject: Meeting followup
        Body: [preview]
        
        Should I send it? (yes/no)"
        
User: "yes"

Agent: [sends email, logs action]
```

**Approval timeout:** If no response in 30 minutes, action is cancelled and logged. Agent may remind once.

---

## Configuration

### Per-User Autonomy Config

```yaml
# ~/kira/config/autonomy.yaml
users:
  default:
    green: [file_ops, memory, research, spawn, code_exec, canvas, self_config]
    yellow: [messages, external_api, cron, git, packages, notifications]
    red: [email, public_posts, financial, destructive, access_control, accounts, infra]
    
  otto:  # power user, trusts the agent more
    overrides:
      git: green           # git ops don't need reporting
      cron: green          # cron scheduling is free
      messages: green      # trusted to message freely
    escalation_channel: telegram
    quiet_hours: "23:00-08:00"  # suppress yellow reports during these hours
```

### Per-Agent-Type Overrides

```yaml
agent_overrides:
  sub-agent:
    # Sub-agents are more restricted by default
    max_level: yellow          # can never do RED actions
    messages: red              # sub-agents can't message users without approval
    
  cron-agent:
    messages: yellow           # cron agents report but can message
    git: yellow                # can push but reports
    
  specialist:widget:
    max_level: green           # widget agent has no external actions anyway
```

---

## Escalation Protocol

When an agent is unsure about the autonomy level of an action:

### Decision Tree

```
Is this action in my config?
├── YES → Use configured level
└── NO → 
    Does it have external side effects?
    ├── YES →
    │   Is it reversible?
    │   ├── YES → YELLOW (do and report)
    │   └── NO → RED (ask first)
    └── NO →
        Does it modify important state?
        ├── YES → YELLOW
        └── NO → GREEN
```

### Escalation from Sub-Agents

Sub-agents cannot perform RED actions. When they encounter one:

```
1. Sub-agent identifies RED action needed
2. Sub-agent returns partial result + escalation request:
   {
     "status": "escalation",
     "completed_work": "...",
     "escalation": {
       "action": "send_email",
       "details": "Need to email vendor about pricing",
       "proposed_content": "...",
       "reason": "Required to complete the task"
     }
   }
3. Parent agent presents escalation to user
4. If approved, parent either:
   a. Performs the action itself, OR
   b. Re-spawns sub-agent with elevated permissions for that specific action
```

### Uncertainty Handling

```typescript
// When confidence in classification is low
function classifyAction(action: string, context: AgentContext): AutonomyLevel {
  const configured = lookupConfig(action, context.user);
  if (configured) return configured;
  
  // Heuristic classification
  const score = {
    external: hasExternalSideEffects(action) ? 2 : 0,
    irreversible: isIrreversible(action) ? 2 : 0,
    financial: hasFinancialImpact(action) ? 3 : 0,
    reputational: hasReputationalRisk(action) ? 2 : 0,
    data_loss: risksDataLoss(action) ? 2 : 0,
  };
  
  const total = Object.values(score).reduce((a, b) => a + b, 0);
  
  if (total >= 3) return 'red';
  if (total >= 1) return 'yellow';
  return 'green';
}
```

---

## Audit Trail

All YELLOW and RED actions are logged:

```typescript
// memory/audit-log.jsonl (append-only)
{"ts":"2026-02-11T09:50:00Z","level":"yellow","agent":"main","action":"git_push","details":"Pushed design docs","approved":true}
{"ts":"2026-02-11T10:00:00Z","level":"red","agent":"main","action":"send_email","details":"Meeting followup to john@example.com","approved":true,"approved_by":"user","approved_at":"2026-02-11T10:01:00Z"}
{"ts":"2026-02-11T10:15:00Z","level":"red","agent":"sub:abc123","action":"escalation","details":"Sub-agent needs to call external API","approved":false,"reason":"user_declined"}
```

GREEN actions are not logged individually (too noisy), but aggregate counts are tracked in daily cost/activity reports.

---

## Runtime Enforcement

```typescript
// Middleware that wraps every tool call
async function enforceAutonomy(tool: string, params: any, agent: AgentContext): Promise<void> {
  const action = classifyToolAction(tool, params);
  const level = getAutonomyLevel(action, agent);
  
  switch (level) {
    case 'green':
      // Proceed silently
      break;
      
    case 'yellow':
      // Proceed, queue report
      agent.pendingReports.push({
        action, tool, params,
        timestamp: new Date().toISOString()
      });
      break;
      
    case 'red':
      if (agent.type === 'sub-agent') {
        throw new EscalationRequired(action, params);
      }
      // Present to user and wait
      const approved = await requestApproval(agent, action, params);
      if (!approved) {
        throw new ActionDenied(action);
      }
      break;
  }
}
```
