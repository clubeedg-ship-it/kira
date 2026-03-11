import { Router } from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readFile } from 'fs/promises';
import path from 'path';
const execFileAsync = promisify(execFile);
export const skillsRouter = Router();
const cache = { runtime: null, marketplace: null };
const RUNTIME_TTL = 30_000; // 30s
const MARKETPLACE_TTL = 300_000; // 5min
// ─── Helpers ────────────────────────────────────────────────────────────────
async function getOpenClawSkills() {
    if (cache.runtime && Date.now() - cache.runtime.ts < RUNTIME_TTL)
        return cache.runtime.data;
    try {
        const { stdout } = await execFileAsync('openclaw', ['skills', 'check', '--json'], {
            timeout: 15_000,
            env: { ...process.env },
        });
        const parsed = JSON.parse(stdout);
        const eligible = new Set(parsed.eligible || []);
        const disabled = new Set(parsed.disabled || []);
        const blocked = new Set(parsed.blocked || []);
        const skills = [];
        // Eligible skills
        for (const name of eligible) {
            skills.push({ slug: name, name: formatName(name), source: 'runtime', status: 'ready', eligible: true });
        }
        // Disabled
        for (const name of disabled) {
            skills.push({ slug: name, name: formatName(name), source: 'runtime', status: 'ready', eligible: false });
        }
        // Blocked
        for (const name of blocked) {
            skills.push({ slug: name, name: formatName(name), source: 'runtime', status: 'blocked', eligible: false });
        }
        // Missing requirements
        for (const entry of parsed.missingRequirements || []) {
            skills.push({
                slug: entry.name,
                name: formatName(entry.name),
                source: 'runtime',
                status: 'missing-deps',
                eligible: false,
                missing: entry.missing,
                installHints: entry.install,
            });
        }
        cache.runtime = { data: skills, ts: Date.now() };
        return skills;
    }
    catch (err) {
        if (cache.runtime)
            return cache.runtime.data; // stale is better than nothing
        throw err;
    }
}
async function getMarketplaceSkills() {
    if (cache.marketplace && Date.now() - cache.marketplace.ts < MARKETPLACE_TTL)
        return cache.marketplace.data;
    try {
        const { stdout } = await execFileAsync('npx', ['clawhub', 'explore', '--json', '--limit', '50'], {
            timeout: 30_000,
            env: { ...process.env },
        });
        const parsed = JSON.parse(stdout);
        const items = parsed.items || [];
        cache.marketplace = { data: items, ts: Date.now() };
        return items;
    }
    catch (err) {
        if (cache.marketplace)
            return cache.marketplace.data;
        return []; // marketplace down is non-fatal
    }
}
async function searchMarketplace(query) {
    try {
        const { stdout } = await execFileAsync('npx', ['clawhub', 'search', '--json', query], {
            timeout: 20_000,
            env: { ...process.env },
        });
        const parsed = JSON.parse(stdout);
        return parsed.items || [];
    }
    catch {
        return [];
    }
}
function formatName(slug) {
    return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
function mergeSkills(runtime, marketplace) {
    const merged = new Map();
    // Runtime skills first (source of truth)
    for (const s of runtime) {
        merged.set(s.slug, {
            slug: s.slug,
            name: s.name,
            description: '',
            source: 'runtime',
            status: s.status,
            eligible: s.eligible,
            installed: true,
            enabled: s.eligible && s.status === 'ready',
            missing: s.missing,
            installHints: s.installHints,
            tags: [],
        });
    }
    // Enrich with marketplace data
    for (const m of marketplace) {
        const existing = merged.get(m.slug);
        if (existing) {
            existing.source = 'both';
            existing.description = m.summary;
            existing.tags = Object.keys(m.tags || {}).filter(t => t !== 'latest');
            existing.version = m.latestVersion?.version;
            existing.downloads = m.stats?.downloads;
            existing.stars = m.stats?.stars;
            existing.changelog = m.latestVersion?.changelog;
            existing.updatedAt = m.updatedAt;
        }
        else {
            merged.set(m.slug, {
                slug: m.slug,
                name: m.displayName,
                description: m.summary,
                source: 'marketplace',
                status: 'not-installed',
                eligible: false,
                installed: false,
                enabled: false,
                tags: Object.keys(m.tags || {}).filter(t => t !== 'latest'),
                version: m.latestVersion?.version,
                downloads: m.stats?.downloads,
                stars: m.stats?.stars,
                changelog: m.latestVersion?.changelog,
                updatedAt: m.updatedAt,
            });
        }
    }
    return Array.from(merged.values());
}
// ─── Routes ─────────────────────────────────────────────────────────────────
// GET /api/v1/skills — merged view
skillsRouter.get('/', async (_req, res) => {
    try {
        const [runtime, marketplace] = await Promise.all([
            getOpenClawSkills(),
            getMarketplaceSkills(),
        ]);
        const merged = mergeSkills(runtime, marketplace);
        res.json({ data: merged, meta: { runtime: runtime.length, marketplace: marketplace.length } });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch skills', detail: String(err) });
    }
});
// GET /api/v1/skills/search?q=...
skillsRouter.get('/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q)
        return res.json({ data: [] });
    try {
        const results = await searchMarketplace(q);
        const runtime = cache.runtime?.data || [];
        const runtimeSlugs = new Set(runtime.map(s => s.slug));
        const data = results.map(m => ({
            slug: m.slug,
            name: m.displayName,
            description: m.summary,
            source: runtimeSlugs.has(m.slug) ? 'both' : 'marketplace',
            status: runtimeSlugs.has(m.slug) ? 'ready' : 'not-installed',
            installed: runtimeSlugs.has(m.slug),
            enabled: false,
            tags: Object.keys(m.tags || {}).filter(t => t !== 'latest'),
            version: m.latestVersion?.version,
            downloads: m.stats?.downloads,
            stars: m.stats?.stars,
            changelog: m.latestVersion?.changelog,
        }));
        res.json({ data });
    }
    catch (err) {
        res.status(500).json({ error: 'Search failed', detail: String(err) });
    }
});
// GET /api/v1/skills/sync — force refresh
skillsRouter.get('/sync', async (_req, res) => {
    cache.runtime = null;
    cache.marketplace = null;
    try {
        const [runtime, marketplace] = await Promise.all([
            getOpenClawSkills(),
            getMarketplaceSkills(),
        ]);
        const merged = mergeSkills(runtime, marketplace);
        res.json({ data: merged, meta: { runtime: runtime.length, marketplace: marketplace.length } });
    }
    catch (err) {
        res.status(500).json({ error: 'Sync failed', detail: String(err) });
    }
});
// GET /api/v1/skills/:slug — skill detail
skillsRouter.get('/:slug', async (req, res) => {
    const { slug } = req.params;
    try {
        const runtime = await getOpenClawSkills();
        const rSkill = runtime.find(s => s.slug === slug);
        // Try to read SKILL.md from common locations
        let instructions = '';
        const skillPaths = [
            path.join(process.env.HOME || '/root', '.openclaw', 'skills', slug, 'SKILL.md'),
            path.join(process.env.HOME || '/root', '.openclaw', 'managed-skills', slug, 'SKILL.md'),
            path.join('/usr', 'local', 'share', 'openclaw', 'skills', slug, 'SKILL.md'),
        ];
        for (const p of skillPaths) {
            try {
                instructions = await readFile(p, 'utf-8');
                break;
            }
            catch { /* try next */ }
        }
        if (rSkill) {
            res.json({
                data: {
                    ...rSkill,
                    instructions,
                    installed: true,
                },
            });
        }
        else {
            // Try marketplace
            const marketplace = await getMarketplaceSkills();
            const mSkill = marketplace.find(m => m.slug === slug);
            if (mSkill) {
                res.json({
                    data: {
                        slug: mSkill.slug,
                        name: mSkill.displayName,
                        description: mSkill.summary,
                        source: 'marketplace',
                        status: 'not-installed',
                        eligible: false,
                        installed: false,
                        enabled: false,
                        tags: Object.keys(mSkill.tags || {}).filter(t => t !== 'latest'),
                        version: mSkill.latestVersion?.version,
                        downloads: mSkill.stats?.downloads,
                        changelog: mSkill.latestVersion?.changelog,
                        instructions,
                    },
                });
            }
            else {
                res.status(404).json({ error: 'Skill not found' });
            }
        }
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to get skill detail', detail: String(err) });
    }
});
// POST /api/v1/skills/:slug/install
skillsRouter.post('/:slug/install', async (req, res) => {
    const { slug } = req.params;
    try {
        const { stdout, stderr } = await execFileAsync('npx', ['clawhub', 'install', slug], {
            timeout: 60_000,
            env: { ...process.env },
        });
        cache.runtime = null; // invalidate
        res.json({ data: { success: true, output: stdout, errors: stderr || undefined } });
    }
    catch (err) {
        res.status(500).json({ error: 'Install failed', detail: err.stderr || err.message || String(err) });
    }
});
// POST /api/v1/skills/:slug/uninstall
skillsRouter.post('/:slug/uninstall', async (req, res) => {
    const { slug } = req.params;
    try {
        const { stdout, stderr } = await execFileAsync('npx', ['clawhub', 'uninstall', slug], {
            timeout: 30_000,
            env: { ...process.env },
        });
        cache.runtime = null;
        res.json({ data: { success: true, output: stdout, errors: stderr || undefined } });
    }
    catch (err) {
        res.status(500).json({ error: 'Uninstall failed', detail: err.stderr || err.message || String(err) });
    }
});
// POST /api/v1/skills/:slug/toggle
skillsRouter.post('/:slug/toggle', async (req, res) => {
    const { slug } = req.params;
    const { enabled } = req.body || {};
    // Toggle by editing openclaw config (disable/enable skill)
    try {
        const action = enabled ? 'enable' : 'disable';
        const { stdout } = await execFileAsync('openclaw', ['skills', action, slug], {
            timeout: 10_000,
            env: { ...process.env },
        });
        cache.runtime = null;
        res.json({ data: { success: true, output: stdout } });
    }
    catch (err) {
        // Fallback: just invalidate cache and report
        cache.runtime = null;
        res.json({ data: { success: true, note: 'Toggle attempted, cache cleared' } });
    }
});
// POST /api/v1/skills/:slug/configure
skillsRouter.post('/:slug/configure', async (req, res) => {
    const { slug } = req.params;
    const { envVars } = req.body || {};
    // For now, store config as environment variables by writing to .env or openclaw config
    // This is a placeholder — real implementation would use openclaw config set
    try {
        if (envVars && typeof envVars === 'object') {
            for (const [key, value] of Object.entries(envVars)) {
                await execFileAsync('openclaw', ['config', 'set', `skills.${slug}.${key}`, String(value)], {
                    timeout: 5_000,
                    env: { ...process.env },
                });
            }
        }
        res.json({ data: { success: true } });
    }
    catch (err) {
        res.status(500).json({ error: 'Configure failed', detail: err.message || String(err) });
    }
});
//# sourceMappingURL=skills.js.map