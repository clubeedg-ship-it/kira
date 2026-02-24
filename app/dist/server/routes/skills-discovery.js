import { Router } from 'express';
import { db } from '../../db';
import { skills } from '../../db/schema';
export const skillsDiscoveryRouter = Router();
// POST /api/v1/skills/discover — trigger skill discovery (admin only)
skillsDiscoveryRouter.post('/discover', async (req, res) => {
    const userId = req.userId;
    if (!userId)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const discovered = await discoverSkills();
        let added = 0;
        for (const skill of discovered) {
            try {
                await db.insert(skills).values(skill).onConflictDoNothing();
                added++;
            }
            catch { }
        }
        res.json({ data: { discovered: discovered.length, added } });
    }
    catch (e) {
        res.status(500).json({ error: String(e) });
    }
});
async function discoverSkills() {
    const allSkills = [];
    try {
        const ghSkills = await searchGitHub();
        allSkills.push(...ghSkills);
    }
    catch (e) {
        console.error('GitHub discovery failed:', e);
    }
    try {
        const registry = await fetchSkillRegistry();
        allSkills.push(...registry);
    }
    catch (e) {
        console.error('Registry fetch failed:', e);
    }
    return allSkills;
}
async function searchGitHub() {
    const queries = [
        'filename:SKILL.md ai agent skill',
        'openclaw skill language:markdown',
    ];
    const result = [];
    for (const query of queries) {
        try {
            const resp = await fetch(`https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=10`, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'KiraSkillDiscovery/1.0',
                },
                signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok)
                continue;
            const data = await resp.json();
            for (const item of (data.items || []).slice(0, 5)) {
                try {
                    const rawUrl = item.html_url
                        .replace('github.com', 'raw.githubusercontent.com')
                        .replace('/blob/', '/');
                    const contentResp = await fetch(rawUrl, { signal: AbortSignal.timeout(5000) });
                    if (!contentResp.ok)
                        continue;
                    const content = await contentResp.text();
                    const nameMatch = content.match(/^#\s+(.+)/m);
                    const descMatch = content.match(/(?:description|summary):\s*(.+)/i) ||
                        content.match(/^(?!#).{20,100}/m);
                    const repoName = item.repository?.full_name || 'unknown';
                    const skillName = nameMatch?.[1]?.trim() || repoName.split('/').pop() || 'Unknown Skill';
                    const slug = skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 58);
                    result.push({
                        slug: `gh-${slug}`,
                        name: skillName,
                        description: descMatch?.[1]?.trim() || `Skill from ${repoName}`,
                        longDescription: content.slice(0, 2000),
                        category: inferCategory(content),
                        instructions: content,
                        icon: inferIcon(content),
                        author: repoName.split('/')[0],
                        sourceUrl: item.html_url,
                        version: '1.0.0',
                        tags: extractTags(content).join(','),
                        isSystem: false,
                        isVerified: false,
                    });
                }
                catch { }
            }
        }
        catch { }
    }
    return result;
}
async function fetchSkillRegistry() {
    try {
        const resp = await fetch('https://clawhub.com/api/skills?limit=50', {
            signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok)
            return [];
        const data = await resp.json();
        return (data.skills || []).map((s) => ({
            slug: `ch-${(s.slug || s.name.toLowerCase().replace(/\s+/g, '-')).slice(0, 60)}`,
            name: s.name,
            description: s.description,
            longDescription: s.readme || s.description,
            category: s.category || 'micro',
            instructions: s.instructions || s.readme || '',
            icon: s.icon || 'Zap',
            author: s.author || 'ClawHub',
            sourceUrl: s.url || `https://clawhub.com/skills/${s.slug}`,
            version: s.version || '1.0.0',
            tags: (s.tags || []).join(','),
            isSystem: false,
            isVerified: s.verified || false,
        }));
    }
    catch {
        return [];
    }
}
function inferCategory(content) {
    const l = content.toLowerCase();
    if (l.includes('code') || l.includes('programming'))
        return 'workflow';
    if (l.includes('health') || l.includes('fitness'))
        return 'domain';
    if (l.includes('finance') || l.includes('trading'))
        return 'domain';
    if (l.includes('legal') || l.includes('law'))
        return 'domain';
    if (l.includes('research') || l.includes('analyze'))
        return 'workflow';
    if (l.includes('write') || l.includes('translate'))
        return 'micro';
    return 'micro';
}
function inferIcon(content) {
    const l = content.toLowerCase();
    if (l.includes('code'))
        return 'Code';
    if (l.includes('search') || l.includes('research'))
        return 'Globe';
    if (l.includes('write') || l.includes('content'))
        return 'PenTool';
    if (l.includes('data') || l.includes('analy'))
        return 'BarChart3';
    if (l.includes('health'))
        return 'Heart';
    if (l.includes('finance'))
        return 'DollarSign';
    return 'Zap';
}
function extractTags(content) {
    const tags = [];
    const l = content.toLowerCase();
    const words = ['ai', 'automation', 'research', 'code', 'writing', 'data', 'health', 'finance', 'marketing', 'productivity', 'learning'];
    for (const w of words)
        if (l.includes(w))
            tags.push(w);
    return tags.slice(0, 8);
}
//# sourceMappingURL=skills-discovery.js.map