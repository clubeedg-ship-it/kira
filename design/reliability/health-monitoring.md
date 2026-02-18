# Health Monitoring

## 1. Process Watchdog

### Monitored Processes

| Process | Default Port | Health Endpoint | Critical? |
|---------|-------------|-----------------|-----------|
| Gateway (OpenClaw) | 3000 | `GET /health` | Yes — all agent comms flow through it |
| Dashboard Server | 3001 | `GET /api/health` | No — UI only, agents work without it |
| Cron Scheduler | (internal) | IPC ping | No — missed crons retry on recovery |

### Health Check Protocol

Each process exposes a health endpoint returning:

```json
{
  "status": "ok" | "degraded" | "unhealthy",
  "uptime": 84321,
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "memory_mb": 142,
    "pending_jobs": 3
  }
}
```

The watchdog polls every **10 seconds**. A process is considered dead after **3 consecutive failures** (30s).

### Auto-Restart with Exponential Backoff

```
Attempt 1: wait 1s, restart
Attempt 2: wait 5s, restart
Attempt 3: wait 30s, restart
Attempt 4: wait 5min, restart
Attempt 5+: wait 5min, restart (cap)
```

Backoff resets after **10 minutes of stable uptime**.

### Implementation

```typescript
// src/watchdog/process-monitor.ts

interface ProcessConfig {
  name: string;
  command: string;
  args: string[];
  healthUrl?: string;        // HTTP health check
  healthIpc?: string;        // IPC socket path
  critical: boolean;         // If true, watchdog alerts immediately
  maxRestarts: number;       // Before giving up (default: 10)
  crashLogLines: number;     // Last N stderr lines to capture (default: 100)
}

const BACKOFF_SCHEDULE = [1000, 5000, 30000, 300000]; // ms

class ProcessMonitor {
  private processes: Map<string, ManagedProcess>;
  
  async start(config: ProcessConfig): Promise<void>;
  async stop(name: string): Promise<void>;
  async restart(name: string): Promise<void>;
  async healthCheck(name: string): Promise<HealthResult>;
  
  // Called on crash
  private onProcessExit(name: string, code: number, signal: string): void {
    // 1. Capture last N lines of stderr
    // 2. Log crash with stack trace if available
    // 3. Calculate backoff delay
    // 4. Schedule restart
    // 5. If restarts > threshold, alert user
  }
}
```

### Crash Logging

On crash, the watchdog captures:
- Exit code and signal
- Last 100 lines of stderr
- Stack trace (parsed from stderr if present)
- Timestamp and restart count
- System resource snapshot (memory, CPU, disk)

Stored in: `~/.kira/logs/crashes/{process}-{timestamp}.json`

### User Alerts

After **3 consecutive restarts** of a critical process, send a chat message:

> ⚠️ Kira's gateway has crashed 3 times in the last 2 minutes. I'm still trying to restart it. Last error: `ECONNREFUSED on port 3001`. You may need to check the logs: `kira logs gateway`

After **max restarts exceeded**, send:

> 🛑 Kira's gateway has failed to start after 10 attempts. I've stopped trying. Run `kira doctor` to diagnose, or `kira restart` to try again.

---

## 2. Self-Healing

### Hung Process Detection

A process is "hung" if:
- Health endpoint stops responding but process is still alive (PID exists)
- Event loop lag exceeds **5 seconds** (measured via `monitorEventLoopDelay`)
- No log output for **60 seconds** during active work

**Recovery**: Send SIGTERM, wait 5s, SIGKILL if needed, then restart.

```typescript
// Inside each process
import { monitorEventLoopDelay } from 'perf_hooks';

const h = monitorEventLoopDelay({ resolution: 100 });
h.enable();

// Health endpoint includes:
app.get('/health', (req, res) => {
  const lagMs = h.max / 1e6;
  if (lagMs > 5000) {
    res.status(503).json({ status: 'unhealthy', eventLoopLag: lagMs });
  }
});
```

### Memory Leak Detection

- Track RSS every 60s via `process.memoryUsage()`
- If RSS grows monotonically for **30 minutes** and exceeds **512MB**, flag as leak
- **Action**: Log warning, schedule graceful restart at next idle moment
- Hard kill at **1GB** RSS (configurable)

### Disk Full Recovery

- Check disk usage on startup and every **5 minutes**
- At **90% full**: Warning log, stop writing non-essential data (debug logs)
- At **95% full**: Purge old logs (oldest first), compact SQLite with VACUUM
- At **98% full**: Emergency mode — stop all writes except crash logs, alert user

```typescript
async function checkDisk(): Promise<DiskStatus> {
  const { available, total } = await diskUsage('/');
  const usedPct = ((total - available) / total) * 100;
  
  if (usedPct > 98) return DiskStatus.EMERGENCY;
  if (usedPct > 95) return DiskStatus.CRITICAL;
  if (usedPct > 90) return DiskStatus.WARNING;
  return DiskStatus.OK;
}
```

### Network Timeout Handling

- All HTTP requests use **30s timeout** by default
- OpenRouter API: **60s timeout** (LLM responses can be slow)
- On timeout: retry once after 2s, then report failure
- Circuit breaker: if an endpoint fails **5 times in 1 minute**, stop calling for **30s**

### Graceful Degradation

| Failure | Degraded Behavior |
|---------|-------------------|
| OpenRouter down | Main agent responds with cached/local model; sub-agents skipped |
| Dashboard down | Agents keep working; user uses CLI or chat |
| Cron scheduler down | Missed jobs queued in DB; run on recovery |
| Database locked | Retry with exponential backoff (WAL mode prevents most locks) |
| Internet down | Local models only; queue outbound requests |

### Database Recovery

```sql
-- SQLite configuration for resilience
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging
PRAGMA wal_autocheckpoint = 1000;   -- Checkpoint every 1000 pages
PRAGMA busy_timeout = 5000;         -- Wait 5s on lock
PRAGMA foreign_keys = ON;
```

On startup:
1. Run `PRAGMA integrity_check` — if it fails, restore from last backup
2. Run `PRAGMA wal_checkpoint(TRUNCATE)` to clean WAL
3. Automatic daily backup: copy DB file to `~/.kira/backups/`
4. Keep last **7 daily backups**

### Session Recovery

If the agent crashes mid-response:
1. The pending message is marked `status: 'interrupted'` in the DB
2. On restart, check for interrupted messages
3. Send to user: "Sorry, I crashed while working on your request. Here's what I had so far: [partial response if any]. Want me to try again?"
4. If no partial response: "I crashed before I could respond. What were you asking?"

---

## 3. Metrics Dashboard

### Collected Metrics

All metrics stored in SQLite table `metrics` with 30-day retention.

```sql
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,          -- e.g., 'process.gateway.memory_mb'
  value REAL NOT NULL,
  tags TEXT,                   -- JSON: {"process": "gateway"}
  timestamp INTEGER NOT NULL   -- Unix epoch seconds
);

CREATE INDEX idx_metrics_name_ts ON metrics(name, timestamp);
```

### System Metrics (collected every 60s)

| Metric | Description |
|--------|-------------|
| `system.cpu_pct` | CPU usage percentage |
| `system.memory_mb` | Total RSS across all Kira processes |
| `system.disk_pct` | Disk usage percentage |
| `system.disk_available_gb` | Free disk space |
| `process.{name}.uptime_s` | Process uptime |
| `process.{name}.memory_mb` | Per-process RSS |
| `process.{name}.restart_count` | Restarts since install |

### Application Metrics (collected per event)

| Metric | Description |
|--------|-------------|
| `agent.request_count` | Total agent requests |
| `agent.success_count` | Successful completions |
| `agent.failure_count` | Failed requests |
| `agent.response_time_ms` | Time to first token |
| `agent.total_time_ms` | Time to complete response |
| `tokens.input` | Input tokens used (tagged by model) |
| `tokens.output` | Output tokens used (tagged by model) |
| `tokens.cost_usd` | Estimated cost (tagged by model) |
| `api.{provider}.latency_ms` | API response time |
| `api.{provider}.error_count` | API errors |
| `cron.execution_count` | Cron jobs executed |
| `cron.failure_count` | Cron jobs failed |

### Dashboard Display

The metrics dashboard is a page in the Kira web UI at `/dashboard/metrics`:

- **Uptime**: Current uptime + uptime percentage (last 30 days)
- **Health**: Green/yellow/red status per process
- **Token Usage**: Line chart — daily tokens by model, with cost overlay
- **Resource Usage**: CPU/memory/disk gauges + 24h sparklines
- **Error Rate**: Errors per hour, last 7 days
- **API Performance**: P50/P95/P99 latency per provider
- **Agent Stats**: Success rate, avg response time, requests per day

### API Endpoint

```
GET /api/metrics?name=tokens.cost_usd&from=2026-02-01&to=2026-02-11&interval=day
```

Returns aggregated time series for charting.

### Alerts (v1.0)

Simple threshold-based alerts delivered via chat message:
- Process down for > 1 minute
- Disk > 90%
- Memory > 80% of limit
- API error rate > 10% over 5 minutes
- Daily cost exceeds user-set budget
