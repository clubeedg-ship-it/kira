const Database = require('better-sqlite3');
const crypto = require('crypto');
const db = new Database('/home/adminuser/kira/memory/unified.db');

// Get all orphans
const orphans = db.prepare(`
  SELECT e.id, e.type, e.name, COALESCE(e.description,'') as description 
  FROM entities e 
  WHERE NOT EXISTS (SELECT 1 FROM relations r WHERE r.source_id=e.id OR r.target_id=e.id)
`).all();

// Get all connected entities (non-orphans)
const connected = db.prepare(`
  SELECT DISTINCT e.id, e.type, e.name, COALESCE(e.description,'') as description 
  FROM entities e 
  WHERE EXISTS (SELECT 1 FROM relations r WHERE r.source_id=e.id OR r.target_id=e.id)
`).all();

console.log(`Orphans: ${orphans.length}, Connected: ${connected.length}`);

const STOP_WORDS = new Set(['the','and','for','that','this','with','from','are','was','were','been','have','has',
  'had','not','but','what','all','can','her','his','one','our','out','you','its','let','may','who','did',
  'get','got','him','how','man','new','now','old','see','way','day','too','use','she','each','which','their',
  'will','other','about','many','then','them','these','some','would','make','like','into','could','time',
  'very','when','come','made','after','back','only','also','been','more','than','most','just','over','such']);

function tokenize(text) {
  return [...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 3 && !STOP_WORDS.has(w))
  )];
}

// Build indexes for connected entities
const connByType = {};
const connByWord = {};
for (const c of connected) {
  const t = c.type;
  if (!connByType[t]) connByType[t] = [];
  connByType[t].push(c);
  const words = tokenize(c.name + ' ' + c.description);
  for (const w of words) {
    if (!connByWord[w]) connByWord[w] = [];
    connByWord[w].push(c);
  }
}

// Semantic category mapping
const SEMANTIC_MAP = {
  'dmarc': ['email', 'security', 'dns', 'mail', 'spam', 'domain'],
  'ssh': ['security', 'server', 'remote', 'linux', 'terminal'],
  'docker': ['container', 'deployment', 'devops', 'image', 'kubernetes'],
  'imap': ['email', 'mail', 'inbox', 'smtp'],
  'smtp': ['email', 'mail', 'imap'],
  'ssl': ['security', 'tls', 'certificate', 'https', 'encryption'],
  'tls': ['security', 'ssl', 'certificate', 'encryption'],
  'api': ['endpoint', 'rest', 'http', 'request', 'webhook'],
  'git': ['repository', 'commit', 'branch', 'github', 'version'],
  'npm': ['package', 'node', 'javascript', 'module'],
  'react': ['frontend', 'component', 'jsx', 'ui', 'javascript'],
  'next': ['react', 'frontend', 'vercel', 'nextjs'],
  'node': ['javascript', 'npm', 'backend', 'server'],
  'python': ['pip', 'django', 'flask', 'script'],
  'database': ['sql', 'sqlite', 'postgres', 'mysql', 'query', 'table'],
  'sql': ['database', 'query', 'table', 'sqlite', 'postgres'],
  'sqlite': ['database', 'sql', 'better-sqlite3'],
  'redis': ['cache', 'database', 'memory', 'queue'],
  'nginx': ['server', 'proxy', 'web', 'http'],
  'telegram': ['bot', 'chat', 'message', 'channel'],
  'discord': ['bot', 'chat', 'message', 'channel', 'server'],
  'openai': ['gpt', 'ai', 'llm', 'chatgpt', 'model'],
  'claude': ['anthropic', 'ai', 'llm', 'model'],
  'anthropic': ['claude', 'ai', 'llm', 'model'],
  'graph': ['entity', 'relation', 'knowledge', 'node', 'edge'],
  'memory': ['context', 'summary', 'graph', 'knowledge'],
  'cron': ['schedule', 'timer', 'job', 'periodic'],
  'webhook': ['api', 'endpoint', 'http', 'callback'],
  'port': ['network', 'server', 'tcp', 'http'],
  'dns': ['domain', 'nameserver', 'dmarc', 'record'],
  'jwt': ['token', 'auth', 'security'],
  'oauth': ['auth', 'token', 'login', 'security'],
  'config': ['setting', 'configuration', 'env', 'environment'],
  'env': ['environment', 'variable', 'config', 'setting'],
  'log': ['logging', 'monitor', 'debug', 'error'],
  'test': ['testing', 'jest', 'unit', 'spec'],
  'deploy': ['deployment', 'ci', 'cd', 'release', 'production'],
  'ui': ['frontend', 'interface', 'component', 'design', 'ux'],
  'ux': ['ui', 'design', 'user', 'interface'],
  'css': ['style', 'design', 'frontend', 'tailwind'],
  'html': ['web', 'page', 'frontend', 'dom'],
  'json': ['data', 'format', 'api', 'parse'],
  'yaml': ['config', 'configuration', 'format'],
  'markdown': ['document', 'format', 'text', 'readme'],
  'linux': ['server', 'ubuntu', 'bash', 'terminal', 'command'],
  'ubuntu': ['linux', 'server', 'apt', 'debian'],
  'aws': ['cloud', 'amazon', 'ec2', 's3', 'lambda'],
  'vercel': ['deploy', 'next', 'frontend', 'hosting'],
  'stripe': ['payment', 'billing', 'subscription', 'checkout'],
  'portfolio': ['investment', 'stock', 'finance', 'asset'],
  'notion': ['note', 'document', 'workspace', 'productivity'],
  'price': ['cost', 'pricing', 'payment', 'money', 'revenue'],
  'revenue': ['money', 'income', 'profit', 'financial'],
  'customer': ['user', 'client', 'buyer', 'segment'],
  'marketing': ['campaign', 'brand', 'content', 'seo'],
  'seo': ['marketing', 'search', 'google', 'ranking'],
  'analytics': ['metric', 'data', 'tracking', 'dashboard'],
  'dashboard': ['analytics', 'metric', 'chart', 'ui'],
  'widget': ['component', 'ui', 'dashboard', 'element'],
  'component': ['ui', 'react', 'frontend', 'widget'],
  'script': ['code', 'automation', 'bash', 'node'],
  'automation': ['script', 'workflow', 'cron', 'bot'],
  'bot': ['automation', 'telegram', 'discord', 'chat'],
  'agent': ['ai', 'automation', 'bot', 'llm', 'task'],
  'skill': ['agent', 'tool', 'capability', 'openclaw'],
  'openclaw': ['agent', 'skill', 'tool', 'bot', 'gateway'],
};

// Compatible type pairs for relationships
const TYPE_COMPAT = {
  'concept': ['concept', 'technology', 'product', 'tool', 'project', 'feature', 'service', 'component'],
  'technology': ['technology', 'concept', 'product', 'tool', 'framework', 'library', 'platform', 'service'],
  'product': ['product', 'company', 'technology', 'feature', 'platform', 'tool'],
  'company': ['company', 'product', 'person', 'technology', 'platform', 'tool', 'investor'],
  'tool': ['tool', 'technology', 'concept', 'product', 'script', 'command', 'service'],
  'person': ['person', 'company', 'organization', 'project', 'role', 'team'],
  'file': ['file', 'directory', 'project', 'script', 'component', 'document'],
  'project': ['project', 'technology', 'tool', 'person', 'company', 'file', 'document'],
  'document': ['document', 'project', 'file', 'concept'],
  'feature': ['feature', 'product', 'technology', 'component', 'project'],
  'component': ['component', 'project', 'technology', 'file', 'feature', 'product'],
  'service': ['service', 'technology', 'tool', 'product', 'company', 'platform'],
  'script': ['script', 'file', 'tool', 'project', 'technology'],
  'command': ['command', 'tool', 'script', 'technology'],
  'location': ['location', 'company', 'person', 'event'],
  'event': ['event', 'person', 'company', 'location', 'date', 'project'],
  'metric': ['metric', 'dashboard', 'analytics tool', 'product', 'project'],
  'database': ['database', 'technology', 'tool', 'project', 'table'],
  'platform': ['platform', 'technology', 'company', 'product', 'tool'],
};

const insert = db.prepare(`INSERT INTO relations (id, source_id, target_id, type, properties, timestamp) VALUES (?,?,?,?,?,?)`);
const now = new Date().toISOString();

let connectedCount = 0;
let relationsCreated = 0;
const batchSize = 500;
let batch = [];

db.exec('BEGIN');

for (let i = 0; i < orphans.length; i++) {
  const orphan = orphans[i];
  const oWords = tokenize(orphan.name + ' ' + orphan.description);
  let bestMatch = null;
  let bestScore = 0;
  let bestType = 'related_to';
  
  // Strategy 1: Word overlap with connected entities via word index
  const candidates = new Map(); // id -> {entity, score}
  for (const w of oWords) {
    // Direct word match
    if (connByWord[w]) {
      for (const c of connByWord[w]) {
        const existing = candidates.get(c.id);
        if (existing) existing.score += 2;
        else candidates.set(c.id, { entity: c, score: 2 });
      }
    }
    // Semantic expansion
    if (SEMANTIC_MAP[w]) {
      for (const syn of SEMANTIC_MAP[w]) {
        if (connByWord[syn]) {
          for (const c of connByWord[syn]) {
            const existing = candidates.get(c.id);
            if (existing) existing.score += 1;
            else candidates.set(c.id, { entity: c, score: 1 });
          }
        }
      }
    }
  }
  
  // Find best from candidates
  for (const [id, {entity, score}] of candidates) {
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entity;
    }
  }
  
  // Strategy 2: If no word match, try same-type fallback — pick most connected entity of same type
  if (!bestMatch && connByType[orphan.type] && connByType[orphan.type].length > 0) {
    // Pick first one (they're already connected)
    bestMatch = connByType[orphan.type][0];
    bestScore = 0.5;
    bestType = 'instance_of';
  }
  
  // Strategy 3: Compatible type fallback
  if (!bestMatch) {
    const compatTypes = TYPE_COMPAT[orphan.type] || ['concept', 'technology'];
    for (const ct of compatTypes) {
      if (connByType[ct] && connByType[ct].length > 0) {
        bestMatch = connByType[ct][0];
        bestScore = 0.3;
        bestType = 'related_to';
        break;
      }
    }
  }
  
  if (bestMatch) {
    // Determine relationship type based on score and types
    if (bestScore >= 4) bestType = 'part_of';
    else if (bestScore >= 2) bestType = 'related_to';
    else if (orphan.type === bestMatch.type) bestType = 'instance_of';
    
    const confidence = Math.min(0.8, Math.max(0.4, 0.3 + bestScore * 0.05));
    
    insert.run(crypto.randomUUID(), orphan.id, bestMatch.id, bestType, JSON.stringify({confidence, source:'orphan-linker'}), now);
    relationsCreated++;
    connectedCount++;
  }
  
  if ((i + 1) % 500 === 0) {
    console.log(`Progress: Connected ${connectedCount}/${i+1} orphans, created ${relationsCreated} new relations`);
  }
}

db.exec('COMMIT');
console.log(`\nDone! Connected ${connectedCount}/${orphans.length} orphans, created ${relationsCreated} new relations`);
console.log(`Connection rate: ${(connectedCount/orphans.length*100).toFixed(1)}%`);
