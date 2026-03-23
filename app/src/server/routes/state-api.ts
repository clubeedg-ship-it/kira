/**
 * Kira State API — Single source of truth for all backend state.
 *
 * Exposes clean, well-organized endpoints that ANY UI can consume.
 * Principles:
 *   - Every endpoint returns { data: T } wrapper
 *   - All state lives here, UIs are dumb renderers
 *   - No business logic in frontends
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const router = Router();
const KIRA_HOME = process.env.KIRA_HOME || '/home/adminuser/kira';
const MEM0_DB = process.env.MEM0_DB_PATH || '/home/adminuser/kira/app/mem0-history.db';
const UNIFIED_DB = path.join(KIRA_HOME, 'memory/unified.db');
const MEMORY_DIR = path.join(KIRA_HOME, 'memory');

// Lazy-load better-sqlite3
let _sqlite: any = null;
async function getSqlite() {
  if (!_sqlite) _sqlite = (await import('better-sqlite3')).default;
  return _sqlite;
}

function wrap(data: any) { return { data }; }

// ─────────────────────────────────────────────────
// 1. MEMORY — Mem0 facts, search, daily logs
// ─────────────────────────────────────────────────

/** GET /api/v1/state/memory/facts — All Mem0-extracted facts */
router.get('/memory/facts', async (req, res) => {
  try {
    const Database = await getSqlite();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    const offset = parseInt(req.query.offset as string) || 0;
    const action = (req.query.action as string) || 'ADD';

    const db = new Database(MEM0_DB, { readonly: true });
    const rows = db.prepare(`
      SELECT id, memory_id, new_value as fact, action, created_at, updated_at
      FROM memory_history 
      WHERE is_deleted = 0 AND action = ?
      ORDER BY id DESC LIMIT ? OFFSET ?
    `).all(action, limit, offset);
    const total = (db.prepare(`SELECT COUNT(*) as c FROM memory_history WHERE is_deleted = 0 AND action = ?`).get(action) as any)?.c || 0;
    db.close();

    res.json({ data: rows, total, limit, offset });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/memory/search — Semantic search via Mem0 */
router.get('/memory/search', async (req, res) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.status(400).json({ error: 'q parameter required' });

    const { searchMemory } = await import('../memory/mem0-service');
    const results = await searchMemory(q, { userId: 'otto', agentId: 'kira' });
    res.json(wrap(results));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/memory/stats — Memory system statistics */
router.get('/memory/stats', async (req, res) => {
  try {
    const Database = await getSqlite();
    const stats: any = { mem0: {}, knowledgeGraph: {}, files: {} };

    // Mem0 stats
    if (fs.existsSync(MEM0_DB)) {
      const db = new Database(MEM0_DB, { readonly: true });
      const counts = db.prepare(`SELECT action, COUNT(*) as c FROM memory_history WHERE is_deleted = 0 GROUP BY action`).all() as any[];
      stats.mem0.total = counts.reduce((s: number, r: any) => s + r.c, 0);
      stats.mem0.byAction = Object.fromEntries(counts.map((r: any) => [r.action, r.c]));
      const newest = db.prepare(`SELECT created_at FROM memory_history ORDER BY id DESC LIMIT 1`).get() as any;
      stats.mem0.lastUpdated = newest?.created_at || null;
      db.close();
    }

    // Knowledge graph stats
    if (fs.existsSync(UNIFIED_DB)) {
      const db = new Database(UNIFIED_DB, { readonly: true });
      try { stats.knowledgeGraph.entities = (db.prepare(`SELECT COUNT(*) as c FROM entities`).get() as any)?.c || 0; } catch {}
      try { stats.knowledgeGraph.facts = (db.prepare(`SELECT COUNT(*) as c FROM facts`).get() as any)?.c || 0; } catch {}
      try { stats.knowledgeGraph.relations = (db.prepare(`SELECT COUNT(*) as c FROM relations`).get() as any)?.c || 0; } catch {}
      db.close();
    }

    // Memory files
    if (fs.existsSync(MEMORY_DIR)) {
      const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md'));
      stats.files.count = files.length;
      stats.files.dailyLogs = files.filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).length;
      stats.files.totalSizeKB = Math.round(files.reduce((s, f) => {
        try { return s + fs.statSync(path.join(MEMORY_DIR, f)).size; } catch { return s; }
      }, 0) / 1024);
    }

    res.json(wrap(stats));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/memory/daily-logs — List available daily log files */
router.get('/memory/daily-logs', (_req, res) => {
  try {
    const files = fs.readdirSync(MEMORY_DIR)
      .filter(f => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
      .sort()
      .reverse()
      .map(f => ({
        date: f.replace('.md', ''),
        filename: f,
        sizeKB: Math.round(fs.statSync(path.join(MEMORY_DIR, f)).size / 1024),
      }));
    res.json(wrap(files));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/memory/daily-logs/:date — Read a specific daily log */
router.get('/memory/daily-logs/:date', (req, res) => {
  try {
    const date = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Invalid date format' });
    const filePath = path.join(MEMORY_DIR, `${date}.md`);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Log not found' });
    const content = fs.readFileSync(filePath, 'utf8');
    res.json(wrap({ date, content }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// 2. AGENTS — Sub-agents, sessions, runs
// ─────────────────────────────────────────────────

/** GET /api/v1/state/agents/sessions — Active OpenClaw sessions */
router.get('/agents/sessions', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('openclaw', ['sessions', 'list', '--json'], {
      timeout: 15_000, env: { ...process.env },
    });
    const parsed = JSON.parse(stdout);
    res.json(wrap(parsed));
  } catch (err: any) {
    res.json(wrap([]));
  }
});

/** GET /api/v1/state/agents/sessions/:id/history — Session message history */
router.get('/agents/sessions/:id/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const { stdout } = await execFileAsync('openclaw', [
      'sessions', 'history', '--session-id', req.params.id, '--json', '--limit', String(limit),
    ], { timeout: 15_000, env: { ...process.env } });
    const parsed = JSON.parse(stdout);
    res.json(wrap(parsed));
  } catch (err: any) {
    res.json(wrap([]));
  }
});

/** GET /api/v1/state/agents/skills — Available OpenClaw skills */
router.get('/agents/skills', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('openclaw', ['skills', 'check', '--json'], {
      timeout: 15_000, env: { ...process.env },
    });
    res.json(wrap(JSON.parse(stdout)));
  } catch (err: any) {
    res.json(wrap({ eligible: [], disabled: [], blocked: [] }));
  }
});

// ─────────────────────────────────────────────────
// 3. INFRASTRUCTURE — PM2, Docker, system health
// ─────────────────────────────────────────────────

/** GET /api/v1/state/infra/pm2 — All PM2 processes */
router.get('/infra/pm2', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist'], {
      timeout: 10_000, env: { ...process.env },
    });
    const processes = JSON.parse(stdout).map((p: any) => ({
      id: p.pm_id,
      name: p.name,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu,
      memoryMB: Math.round((p.monit?.memory || 0) / 1024 / 1024),
      restarts: p.pm2_env?.restart_time,
      uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
      scriptPath: p.pm2_env?.pm_exec_path,
    }));
    res.json(wrap(processes));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/infra/docker — Docker container statuses */
router.get('/infra/docker', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('docker', [
      'ps', '-a', '--format', '{{json .}}',
    ], { timeout: 10_000 });
    const containers = stdout.trim().split('\n').filter(Boolean).map(line => {
      const c = JSON.parse(line);
      return {
        id: c.ID,
        name: c.Names,
        image: c.Image,
        status: c.Status,
        state: c.State,
        ports: c.Ports,
        created: c.CreatedAt,
      };
    });
    res.json(wrap(containers));
  } catch (err: any) {
    res.json(wrap([]));
  }
});

/** GET /api/v1/state/infra/system — System resources */
router.get('/infra/system', async (_req, res) => {
  try {
    const [memRaw, diskRaw, uptimeRaw, gpuRaw] = await Promise.allSettled([
      execFileAsync('free', ['-m'], { timeout: 5000 }),
      execFileAsync('df', ['-h', '/'], { timeout: 5000 }),
      execFileAsync('uptime', [], { timeout: 5000 }),
      execFileAsync('nvidia-smi', ['--query-gpu=name,memory.used,memory.total,utilization.gpu,temperature.gpu', '--format=csv,noheader,nounits'], { timeout: 5000 }),
    ]);

    const system: any = {};

    // Memory
    if (memRaw.status === 'fulfilled') {
      const lines = memRaw.value.stdout.split('\n');
      const memLine = lines[1]?.split(/\s+/);
      if (memLine) {
        system.memory = {
          totalMB: parseInt(memLine[1]),
          usedMB: parseInt(memLine[2]),
          availableMB: parseInt(memLine[6]),
        };
      }
    }

    // Disk
    if (diskRaw.status === 'fulfilled') {
      const lines = diskRaw.value.stdout.split('\n');
      const diskLine = lines[1]?.split(/\s+/);
      if (diskLine) {
        system.disk = { size: diskLine[1], used: diskLine[2], available: diskLine[3], usePercent: diskLine[4] };
      }
    }

    // Uptime
    if (uptimeRaw.status === 'fulfilled') {
      system.uptime = uptimeRaw.value.stdout.trim();
    }

    // GPU
    if (gpuRaw.status === 'fulfilled') {
      const parts = gpuRaw.value.stdout.trim().split(',').map((s: string) => s.trim());
      if (parts.length >= 5) {
        system.gpu = {
          name: parts[0],
          memoryUsedMB: parseInt(parts[1]),
          memoryTotalMB: parseInt(parts[2]),
          utilizationPercent: parseInt(parts[3]),
          temperatureC: parseInt(parts[4]),
        };
      }
    }

    res.json(wrap(system));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// 4. PORTFOLIO — Projects, VDR, revenue tracking
// ─────────────────────────────────────────────────

/** GET /api/v1/state/portfolio/projects — Portfolio overview from USER.md */
router.get('/portfolio/projects', (_req, res) => {
  try {
    const userMd = fs.readFileSync(path.join(KIRA_HOME, 'USER.md'), 'utf8');
    // Parse portfolio section
    const projects = [
      { name: 'IAM (InterActiveMove)', tier: 1, type: 'revenue', description: 'Interactive floor/wall projectors, kindergarten market' },
      { name: 'Oopuo', tier: 1, type: 'revenue', description: 'AI services for SMBs, personal brand, webinars' },
      { name: 'CuttingEdge', tier: 1, type: 'revenue', description: 'Interior design & project management' },
      { name: 'Abura Cosmetics', tier: 1, type: 'revenue', description: 'Sales support (commission)' },
      { name: 'Omiximo', tier: 1, type: 'revenue', description: 'Email automation, inventory systems' },
      { name: 'ZenithCred', tier: 2, type: 'funding', description: 'Corporate wellness gamification, seed round €1.1M' },
      { name: 'SentinAgro', tier: 2, type: 'funding', description: 'Drone cattle monitoring' },
      { name: 'Chimera', tier: 3, type: 'infrastructure', description: 'Privacy-preserving distributed AI' },
    ];
    res.json(wrap(projects));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/portfolio/revenue-targets — MRR targets */
router.get('/portfolio/revenue-targets', (_req, res) => {
  res.json(wrap({
    targets: [
      { month: '2026-03', target: 700, currency: 'USD' },
      { month: '2026-04', target: 2000, currency: 'USD' },
      { month: '2026-05', target: 7500, currency: 'USD' },
      { month: '2026-08', target: 30000, currency: 'USD' },
    ],
    strategy: '60% revenue / 30% funding / 10% infrastructure',
  }));
});

/** GET /api/v1/state/portfolio/vdr — VDR document listing */
router.get('/portfolio/vdr', (_req, res) => {
  try {
    const vdrPath = path.join(KIRA_HOME, 'vdr');
    if (!fs.existsSync(vdrPath)) return res.json(wrap([]));

    const docs: any[] = [];
    const walkDir = (dir: string, prefix: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walkDir(path.join(dir, entry.name), rel);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.json')) {
          const stat = fs.statSync(path.join(dir, entry.name));
          docs.push({
            path: rel,
            name: entry.name,
            category: prefix.split('/')[0] || 'root',
            sizeKB: Math.round(stat.size / 1024),
            lastModified: stat.mtime.toISOString(),
          });
        }
      }
    };
    walkDir(vdrPath, '');
    res.json({ data: docs, total: docs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/portfolio/vdr/:path — Read a VDR document */
router.get('/portfolio/vdr/*', (req, res) => {
  try {
    const relPath = req.params[0];
    if (!relPath || relPath.includes('..')) return res.status(400).json({ error: 'Invalid path' });
    const fullPath = path.join(KIRA_HOME, 'vdr', relPath);
    if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'Document not found' });
    const content = fs.readFileSync(fullPath, 'utf8');
    res.json(wrap({ path: relPath, content }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// 5. ACTIVITY — Crons, heartbeats, recent operations
// ─────────────────────────────────────────────────

/** GET /api/v1/state/activity/crons — OpenClaw cron jobs */
router.get('/activity/crons', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('openclaw', ['crons', 'list', '--json'], {
      timeout: 10_000, env: { ...process.env },
    });
    res.json(wrap(JSON.parse(stdout)));
  } catch (err: any) {
    res.json(wrap([]));
  }
});

/** GET /api/v1/state/activity/agent-outputs — Recent agent output files */
router.get('/activity/agent-outputs', (_req, res) => {
  try {
    const outputDir = path.join(KIRA_HOME, 'agents/outputs');
    if (!fs.existsSync(outputDir)) return res.json(wrap([]));
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.json') || f.endsWith('.md'))
      .map(f => {
        const stat = fs.statSync(path.join(outputDir, f));
        return { name: f, sizeKB: Math.round(stat.size / 1024), lastModified: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
      .slice(0, 50);
    res.json(wrap(files));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/v1/state/activity/agent-outputs/:name — Read an output file */
router.get('/activity/agent-outputs/:name', (req, res) => {
  try {
    const name = req.params.name;
    if (name.includes('..') || name.includes('/')) return res.status(400).json({ error: 'Invalid name' });
    const filePath = path.join(KIRA_HOME, 'agents/outputs', name);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
    const content = fs.readFileSync(filePath, 'utf8');
    if (name.endsWith('.json')) {
      try { res.json(wrap(JSON.parse(content))); return; } catch {}
    }
    res.json(wrap({ name, content }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────
// 6. OVERVIEW — Combined dashboard state
// ─────────────────────────────────────────────────

/** GET /api/v1/state/overview — Everything a dashboard needs in one call */
router.get('/overview', async (_req, res) => {
  try {
    const [memStats, pm2, system] = await Promise.allSettled([
      // Memory stats
      (async () => {
        const Database = await getSqlite();
        const stats: any = {};
        if (fs.existsSync(MEM0_DB)) {
          const db = new Database(MEM0_DB, { readonly: true });
          stats.totalFacts = (db.prepare(`SELECT COUNT(*) as c FROM memory_history WHERE is_deleted = 0`).get() as any)?.c || 0;
          const newest = db.prepare(`SELECT created_at FROM memory_history ORDER BY id DESC LIMIT 1`).get() as any;
          stats.lastExtraction = newest?.created_at || null;
          db.close();
        }
        return stats;
      })(),
      // PM2 summary
      (async () => {
        const { stdout } = await execFileAsync('pm2', ['jlist'], { timeout: 10_000 });
        const procs = JSON.parse(stdout);
        return {
          total: procs.length,
          online: procs.filter((p: any) => p.pm2_env?.status === 'online').length,
          errored: procs.filter((p: any) => p.pm2_env?.status === 'errored').length,
          stopped: procs.filter((p: any) => p.pm2_env?.status === 'stopped').length,
        };
      })(),
      // System
      (async () => {
        const { stdout } = await execFileAsync('free', ['-m'], { timeout: 5000 });
        const memLine = stdout.split('\n')[1]?.split(/\s+/);
        return {
          memoryUsedMB: parseInt(memLine?.[2] || '0'),
          memoryTotalMB: parseInt(memLine?.[1] || '0'),
        };
      })(),
    ]);

    res.json(wrap({
      memory: memStats.status === 'fulfilled' ? memStats.value : null,
      services: pm2.status === 'fulfilled' ? pm2.value : null,
      system: system.status === 'fulfilled' ? system.value : null,
      timestamp: new Date().toISOString(),
    }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as stateApiRouter };
