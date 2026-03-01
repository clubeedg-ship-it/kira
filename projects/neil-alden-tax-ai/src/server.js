#!/usr/bin/env node
/**
 * MSTA Tax AI - API Server
 * Parecer Tributário Inteligente
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { search } = require('./search');
const { analyzeTreaty } = require('./treaty-analyzer');
const { generatePDF } = require('./pdf-export');
const { buildLegalContext } = require('./legal-status');
const { auditOpinion, formatAuditSection } = require('./audit-agent');

const PORT = 3870;
const Anthropic = require('@anthropic-ai/sdk');
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const LLM_MODEL = 'claude-opus-4-6';
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
// Opus 4.6 pricing: $15/1M input, $75/1M output
const LLM_INPUT_COST_PER_TOKEN = 15.0 / 1e6;
const LLM_OUTPUT_COST_PER_TOKEN = 75.0 / 1e6;
const DEFAULT_CORS_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

function normalizeOrigin(origin = '') {
  return origin.trim().replace(/\/+$/, '');
}

const parsedCorsOrigins = (process.env.CORS_ORIGINS || DEFAULT_CORS_ORIGINS.join(','))
  .split(',')
  .map(normalizeOrigin)
  .filter(origin => origin && origin !== '*');

const CORS_ALLOWLIST = new Set(
  parsedCorsOrigins.length ? parsedCorsOrigins : DEFAULT_CORS_ORIGINS.map(normalizeOrigin)
);

// --- Security: Rate Limiting & Brute Force Detection ---
const rateLimitMap = new Map(); // ip -> { auth: [{ts}], api: [{ts}] }
const bruteForceMap = new Map(); // ip -> { failures: [{ts}], blockedUntil: null }
const RATE_AUTH_MAX = 5, RATE_AUTH_WINDOW = 60000;
const RATE_API_MAX = 30, RATE_API_WINDOW = 60000;
const BRUTE_MAX_FAILURES = 10, BRUTE_WINDOW = 300000, BRUTE_BLOCK_DURATION = 900000;

function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
}

function checkRateLimit(ip, type) {
  const now = Date.now();
  if (!rateLimitMap.has(ip)) rateLimitMap.set(ip, { auth: [], api: [] });
  const bucket = rateLimitMap.get(ip);
  const max = type === 'auth' ? RATE_AUTH_MAX : RATE_API_MAX;
  const window = type === 'auth' ? RATE_AUTH_WINDOW : RATE_API_WINDOW;
  bucket[type] = bucket[type].filter(ts => now - ts < window);
  if (bucket[type].length >= max) return false;
  bucket[type].push(now);
  return true;
}

function isBruteForceBlocked(ip) {
  const entry = bruteForceMap.get(ip);
  if (!entry) return false;
  if (entry.blockedUntil && Date.now() < entry.blockedUntil) return true;
  if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
    bruteForceMap.delete(ip);
    return false;
  }
  return false;
}

function recordLoginFailure(ip) {
  const now = Date.now();
  if (!bruteForceMap.has(ip)) bruteForceMap.set(ip, { failures: [], blockedUntil: null });
  const entry = bruteForceMap.get(ip);
  entry.failures = entry.failures.filter(ts => now - ts < BRUTE_WINDOW);
  entry.failures.push(now);
  if (entry.failures.length >= BRUTE_MAX_FAILURES) {
    entry.blockedUntil = now + BRUTE_BLOCK_DURATION;
    securityLog(`BLOCKED IP=${ip} reason=brute_force failures=${entry.failures.length} blocked_until=${new Date(entry.blockedUntil).toISOString()}`);
  }
}

function recordLoginSuccess(ip) {
  bruteForceMap.delete(ip);
}

// --- Security: Logging ---
const ACCESS_LOG = path.join(__dirname, '..', 'data', 'access.log');
const SECURITY_LOG = path.join(__dirname, '..', 'data', 'security.log');

function accessLog(ip, method, pathname, status) {
  const line = `[${new Date().toISOString()}] ${ip} ${method} ${pathname} ${status}\n`;
  fs.appendFile(ACCESS_LOG, line, () => {});
  // Rotate: async check every ~100 writes
  if (Math.random() < 0.01) rotateLog(ACCESS_LOG, 10000);
}

function securityLog(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFile(SECURITY_LOG, line, () => {});
}

function rotateLog(filePath, maxLines) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length > maxLines) {
      fs.writeFileSync(filePath, lines.slice(-maxLines).join('\n'));
    }
  } catch {}
}

// --- Security: Input Sanitization ---
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '').trim();
}

// Cleanup stale rate limit entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of rateLimitMap) {
    bucket.auth = bucket.auth.filter(ts => now - ts < RATE_AUTH_WINDOW);
    bucket.api = bucket.api.filter(ts => now - ts < RATE_API_WINDOW);
    if (!bucket.auth.length && !bucket.api.length) rateLimitMap.delete(ip);
  }
  for (const [ip, entry] of bruteForceMap) {
    if (entry.blockedUntil && now >= entry.blockedUntil) bruteForceMap.delete(ip);
    else {
      entry.failures = entry.failures.filter(ts => now - ts < BRUTE_WINDOW);
      if (!entry.failures.length && !entry.blockedUntil) bruteForceMap.delete(ip);
    }
  }
}, 300000);

// --- Auth Layer (SQLite) ---
const Database = require('better-sqlite3');
const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const authDb = new Database(path.join(DATA_DIR, 'auth.db'));
authDb.pragma('journal_mode = WAL');
authDb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    created_at TEXT DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    image TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS support_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    summary TEXT,
    steps TEXT,
    expected TEXT,
    actual TEXT,
    screenshot TEXT,
    severity TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    model TEXT,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS opinions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    client_name TEXT,
    country TEXT,
    form_data TEXT,
    opinion_text TEXT,
    sources TEXT,
    treaty_analysis TEXT,
    status TEXT DEFAULT 'complete',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// One-time migrations
try { authDb.exec('ALTER TABLE opinions ADD COLUMN audit_result TEXT'); } catch {}
try { authDb.exec('ALTER TABLE opinions ADD COLUMN audit_approved INTEGER DEFAULT 0'); } catch {}

// One-time migration: promote otto to admin
authDb.prepare("UPDATE users SET role = 'admin' WHERE email = 'otto@oopuo.com'").run();

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createUser(name, email, password) {
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const password_hash = hashPassword(password, salt);
  try {
    authDb.prepare('INSERT INTO users (id, name, email, password_hash, salt) VALUES (?,?,?,?,?)').run(id, name, email, password_hash, salt);
    return { id, name, email };
  } catch (e) {
    if (e.message.includes('UNIQUE')) throw new Error('Email already registered');
    throw e;
  }
}

function loginUser(email, password) {
  const user = authDb.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) throw new Error('Invalid credentials');
  if (hashPassword(password, user.salt) !== user.password_hash) throw new Error('Invalid credentials');
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 86400000).toISOString();
  authDb.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?,?,?)').run(token, user.id, expires);
  return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

function parseCookies(req) {
  const cookies = {};
  (req.headers.cookie || '').split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k) cookies[k] = v;
  });
  return cookies;
}

function setAuthCookie(res, token) {
  res.setHeader('Set-Cookie', `sv_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${7 * 86400}`);
}

function clearAuthCookie(res) {
  res.setHeader('Set-Cookie', 'sv_session=; HttpOnly; Path=/; Max-Age=0');
}

function authMiddleware(req) {
  // Try Bearer token first, then httpOnly cookie
  let token = null;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    token = parseCookies(req).sv_session;
  }
  if (!token) return null;
  const session = authDb.prepare('SELECT s.*, u.name, u.email, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime(\'now\')').get(token);
  if (!session) return null;
  return { id: session.user_id, name: session.name, email: session.email, role: session.role };
}

// --- Questionnaire Schema ---
// IP Geolocation (free, no API key)
const geoCache = new Map();
async function geolocateIP(ip, userId) {
  if (geoCache.has(ip)) {
    const loc = geoCache.get(ip);
    authDb.prepare('UPDATE users SET last_location = ? WHERE id = ?').run(loc, userId);
    return;
  }
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`);
    const d = await res.json();
    if (d.status === 'success') {
      const loc = `${d.city}, ${d.regionName}, ${d.country}`;
      geoCache.set(ip, loc);
      authDb.prepare('UPDATE users SET last_location = ? WHERE id = ?').run(loc, userId);
    }
  } catch {}
}

const QUESTIONNAIRE = {
  steps: [
    {
      id: 'client_info',
      title: 'Informações do Cliente',
      fields: [
        { id: 'client_name', label: 'Nome/Razão Social', type: 'text', required: true },
        { id: 'client_type', label: 'Tipo de Contribuinte', type: 'select', required: true,
          options: ['Pessoa Física', 'Pessoa Jurídica', 'Empresa Multinacional'] },
        { id: 'country_residence', label: 'País de Residência Fiscal', type: 'text', required: true },
        { id: 'cnpj_cpf', label: 'CNPJ/CPF', type: 'text', required: false },
      ]
    },
    {
      id: 'operation',
      title: 'Natureza da Operação',
      fields: [
        { id: 'income_type', label: 'Tipo de Rendimento', type: 'select', required: true,
          options: ['Dividendos', 'Juros', 'Royalties', 'Serviços Técnicos', 'Ganho de Capital',
                    'Lucros de Empresa', 'Rendimentos Imobiliários', 'Pensões', 'Outros'] },
        { id: 'income_description', label: 'Descrição Detalhada da Operação', type: 'textarea', required: true },
        { id: 'amount', label: 'Valor Estimado (BRL)', type: 'number', required: false },
        { id: 'frequency', label: 'Frequência', type: 'select', required: true,
          options: ['Única', 'Mensal', 'Trimestral', 'Anual', 'Contínua'] },
      ]
    },
    {
      id: 'jurisdictions',
      title: 'Jurisdições Envolvidas',
      fields: [
        { id: 'source_country', label: 'País de Origem do Rendimento', type: 'text', required: true },
        { id: 'destination_country', label: 'País de Destino do Rendimento', type: 'text', required: true },
        { id: 'intermediary_countries', label: 'Países Intermediários (se houver)', type: 'text', required: false },
        { id: 'has_pe', label: 'Existe Estabelecimento Permanente?', type: 'select', required: true,
          options: ['Sim', 'Não', 'A ser avaliado'] },
        { id: 'has_substance', label: 'A empresa possui substância econômica no país de residência? (escritório físico, funcionários, decisões tomadas localmente)', type: 'select', required: true,
          options: ['Sim — escritório, funcionários e decisões locais', 'Parcial — alguma presença mas limitada', 'Não — estrutura sem presença real'] },
        { id: 'currency_inflow', label: 'Haverá ingresso efetivo de divisas no Brasil?', type: 'select', required: true,
          options: ['Sim — pagamento direto em moeda estrangeira', 'Sim — via plataforma digital/conversão indireta', 'Não', 'A definir'] },
        { id: 'service_nature', label: 'Natureza do serviço/produto', type: 'select', required: true,
          options: ['Licenciamento de software (SaaS) sem intervenção humana', 'Serviço técnico com expertise humana', 'Consultoria/assessoria profissional', 'Cessão de direitos/propriedade intelectual', 'Misto — software + serviço humano'] },
      ]
    },
    {
      id: 'objectives',
      title: 'Objetivos do Planejamento',
      fields: [
        { id: 'objective', label: 'Objetivo Principal', type: 'select', required: true,
          options: ['Redução de Carga Tributária', 'Eliminação de Dupla Tributação',
                    'Conformidade Regulatória', 'Reestruturação Societária', 'Repatriação de Lucros'] },
        { id: 'additional_notes', label: 'Observações Adicionais', type: 'textarea', required: false },
        { id: 'urgency', label: 'Prazo', type: 'select', required: true,
          options: ['Urgente (< 1 semana)', 'Normal (2-4 semanas)', 'Planejamento (> 1 mês)'] },
      ]
    }
  ]
};

// --- Build prompt from form data + treaty analysis ---
function buildPrompt(formData, treatyAnalysis) {
  let analysisContext = '';
  let context = '';
  const sources = new Set();

  if (treatyAnalysis.hasTreaty) {
    analysisContext = `Tratado aplicável: Brasil-${treatyAnalysis.countryName}, Artigo ${treatyAnalysis.relevantArticle || '?'}`;
    if (treatyAnalysis.pptAnalysis) {
      analysisContext += `\nPPT: ${treatyAnalysis.pptAnalysis.reasoning}`;
    }
    if (treatyAnalysis.risks.length) {
      analysisContext += '\nRiscos: ' + treatyAnalysis.risks.map(r => `[${r.level}] ${r.description}`).join('; ');
    }
    for (const p of treatyAnalysis.treatyProvisions.slice(0, 3)) {
      context += `\n[${p.metadata.country || p.country} - ${p.metadata.decreto || ''}]: ${p.text.substring(0, 300)}`;
      sources.add(`${p.metadata.country || p.country} - ${p.metadata.decreto || 'N/A'}`);
    }
  } else {
    analysisContext = `Não existe tratado entre Brasil e ${treatyAnalysis.countryName}.`;
  }

  // Build legal context from legal-status module
  const legalContext = buildLegalContext(formData);

  const prompt = `Dados: ${formData.client_name} (${formData.client_type}), residente em ${formData.country_residence}.
Operação: ${formData.income_type} - ${formData.income_description}. Valor: R$${formData.amount || '?'}. Frequência: ${formData.frequency}.
Jurisdições: ${formData.source_country} → ${formData.destination_country}. EP: ${formData.has_pe}. Substância: ${formData.has_substance}.
Ingresso de divisas: ${formData.currency_inflow || 'Não informado'}. Natureza do serviço: ${formData.service_nature || 'Não informado'}.
Objetivo: ${formData.objective}.

Análise: ${analysisContext}

Trechos dos tratados:${context || ' Nenhum encontrado.'}

${legalContext}

Gere PARECER TRIBUTÁRIO com: 1) Resumo Executivo 2) Fundamentação Jurídica (cite artigos) 3) Carga Tributária Estimada 4) Riscos 5) Recomendações`;

  return { prompt, sources: [...sources], legalContext };
}

// --- Streaming LLM Generation (Anthropic SDK) ---
async function streamGenerate(prompt, system, res) {
  let fullText = '';
  let usageData = null;

  const stream = anthropic.messages.stream({
    model: LLM_MODEL,
    max_tokens: 8000,
    temperature: 0.4,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }]
  });

  stream.on('text', (text) => {
    fullText += text;
    res.write(`data: ${JSON.stringify({ token: text })}\n\n`);
  });

  const finalMessage = await stream.finalMessage();
  usageData = {
    prompt_tokens: finalMessage.usage?.input_tokens || 0,
    completion_tokens: finalMessage.usage?.output_tokens || 0
  };

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  return { text: fullText, usage: usageData };
}

// --- Non-streaming fallback (Anthropic SDK) ---
async function generateWithLLM(prompt, system = '') {
  const response = await anthropic.messages.create({
    model: LLM_MODEL,
    max_tokens: 8000,
    temperature: 0.4,
    ...(system ? { system } : {}),
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content?.[0]?.text || '';
}

// --- HTTP helpers ---
function appendVaryHeader(currentValue, value) {
  if (!currentValue) return value;
  const list = String(currentValue).split(',').map(v => v.trim()).filter(Boolean);
  if (!list.includes(value)) list.push(value);
  return list.join(', ');
}

function buildContentSecurityPolicy(nonce) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `script-src-elem 'self' 'nonce-${nonce}'`,
    "script-src-attr 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: https://api.qrserver.com",
    "connect-src 'self' ws: wss:",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ');
}

function injectNonceIntoScripts(html, nonce) {
  return html.replace(/<script\b(?![^>]*\bnonce=)/gi, `<script nonce="${nonce}"`);
}

function serveHtml(res, filePath, nonce) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const htmlWithNonce = injectNonceIntoScripts(content, nonce);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store',
      'Pragma': 'no-cache'
    });
    res.end(htmlWithNonce);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function serveStatic(res, filePath, contentType) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid JSON')); }
    });
  });
}

const SYSTEM = `Você é advogado tributarista internacional sênior especializado em planejamento tributário internacional no escritório MSTA (Miara-Schuarts, Tomasczeski Advogados). Seu foco é risco e pragmatismo econômico.

REGRAS OBRIGATÓRIAS — NUNCA VIOLE:

1. HIERARQUIA NORMATIVA: Sempre raciocine na ordem Constituição Federal → Tratado Internacional → Lei Complementar → Lei Ordinária → Instrução Normativa. Cite a base legal de cada conclusão.

2. VIGÊNCIA E ANACRONISMO: 
   - O Instrumento Multilateral (MLI) foi ASSINADO pelo Brasil em 20/10/2025, mas NÃO FOI RATIFICADO pelo Congresso Nacional nem depositado na OCDE (status: fev/2026).
   - NUNCA aplique o PPT (Principal Purpose Test) como norma vigente. Apenas mencione como risco FUTURO.
   - Sempre verifique se o tratado/norma citada está em vigor. Se houver dúvida, declare expressamente.

3. EXPORTAÇÃO DE SERVIÇOS — IMUNIDADES:
   - PIS/COFINS: Exportações de serviços são ISENTAS (MP 2.158-35/2001, art. 14, c/c EC 33/2001), desde que: (a) tomador residente no exterior, (b) ingresso efetivo de divisas (SC Cosit 160/2024 aceita meios digitais).
   - ISS: Exportações de serviços têm imunidade conforme LC 116/2003, art. 2º, I.
   - NUNCA cobre PIS/COFINS ou ISS em exportação sem antes verificar os requisitos de isenção.

4. BASE DE CÁLCULO:
   - IRPJ/CSLL: Tributação sobre receita BRUTA (não líquida). Crédito ordinário para imposto pago no exterior (art. 26 da Lei 9.249/95).
   - IRRF sobre remessas: Aplicar alíquota do tratado (geralmente art. 12 para royalties/serviços técnicos).
   - NUNCA use "receita líquida" como base para IRPJ/CSLL.

5. QUALIFICAÇÃO DE SERVIÇOS DE IA/SOFTWARE:
   - Distinguir OBRIGATORIAMENTE entre: (a) licenciamento de software/SaaS (Art. 7 — Lucros das Empresas, sem retenção), (b) serviços técnicos com intervenção humana (Art. 12/Protocolo — Royalties, 15% fonte).
   - Se SaaS sem intervenção humana → defender Art. 7, sem retenção na fonte.
   - Se serviço técnico com expertise humana → Art. 12 + Protocolo aplicável.

6. TRATADO BRASIL-PAÍSES BAIXOS (Decreto 99.700/1990):
   - Item 5 do Protocolo equipara serviços técnicos a royalties → 15% na fonte.
   - Sempre citar o Protocolo quando aplicável.

7. REFORMA TRIBUTÁRIA (IBS/CBS):
   - A partir de 2026: alíquotas de teste 0,1% IBS + 0,9% CBS.
   - Imunidade nas exportações dependerá de prova de consumo no exterior.
   - Mencionar como alerta de transição (2026-2033), não como norma consolidada.

8. CÁLCULOS:
   - Apresente memória de cálculo detalhada com base legal para cada alíquota.
   - Nunca invente alíquotas. Se não tiver certeza, declare "alíquota a confirmar conforme regulamentação vigente".

9. FORMATO DO PARECER:
   - Gere em português brasileiro formal.
   - Cite artigos específicos dos tratados e leis.
   - Inclua seção de RISCOS com probabilidade (alto/médio/baixo).
   - Inclua RECOMENDAÇÕES práticas e acionáveis.
   - Inclua DISCLAIMER: "Este parecer deve ser revisado por profissional qualificado."

10. PROIBIÇÕES:
    - NUNCA aplique norma futura como vigente sem declarar expressamente.
    - NUNCA conclua definitivamente sobre normas em trâmite legislativo.
    - NUNCA omita riscos relevantes para parecer mais favorável.
    - NUNCA invente jurisprudência ou soluções de consulta.`;

const server = http.createServer(async (req, res) => {
  const clientIP = getClientIP(req);
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const requestOrigin = normalizeOrigin(req.headers.origin || '');
  const cspNonce = crypto.randomBytes(16).toString('base64');

  // Security headers
  if (requestOrigin && CORS_ALLOWLIST.has(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', appendVaryHeader(res.getHeader('Vary'), 'Origin'));
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(cspNonce));

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !CORS_ALLOWLIST.has(requestOrigin)) {
      res.writeHead(403);
      return res.end();
    }
    res.writeHead(204);
    return res.end();
  }

  // Track response status for access log
  const origEnd = res.end.bind(res);
  let logged = false;
  res.end = function(...args) {
    if (!logged) { logged = true; accessLog(clientIP, req.method, url.pathname, res.statusCode || 200); }
    return origEnd(...args);
  };

  const json = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };

  // Brute force IP block check
  if (isBruteForceBlocked(clientIP)) {
    return json(403, { error: 'IP temporarily blocked due to too many failed attempts' });
  }

  // Rate limiting for auth endpoints
  const isAuthEndpoint = url.pathname.startsWith('/api/auth/login') || url.pathname.startsWith('/api/auth/register');
  if (isAuthEndpoint && !checkRateLimit(clientIP, 'auth')) {
    return json(429, { error: 'Too many requests. Please wait before trying again.' });
  }
  // Rate limiting for API endpoints
  if (url.pathname.startsWith('/api/') && !isAuthEndpoint && !checkRateLimit(clientIP, 'api')) {
    return json(429, { error: 'Too many requests. Please slow down.' });
  }

  try {
    // Block sensitive files (source code, databases, data directory)
    if (url.pathname.match(/\.(db|sqlite|sql)$/i) || url.pathname.startsWith('/src/') || url.pathname.startsWith('/data/')) {
      res.writeHead(403); return res.end('Forbidden');
    }

    // Static files (public)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return serveHtml(res, path.join(__dirname, '..', 'ui', 'index.html'), cspNonce);
    }
    if (url.pathname === '/favicon.svg') {
      return serveStatic(res, path.join(__dirname, '..', 'ui', 'favicon.svg'), 'image/svg+xml');
    }
    if (url.pathname.endsWith('.css') || url.pathname.includes('.css')) {
      return serveStatic(res, path.join(__dirname, '..', 'ui', path.basename(url.pathname).split('?')[0]), 'text/css; charset=utf-8');
    }
    if ((url.pathname.endsWith('.js') || url.pathname.includes('.js')) && !url.pathname.startsWith('/api')) {
      return serveStatic(res, path.join(__dirname, '..', 'ui', path.basename(url.pathname).split('?')[0]), 'application/javascript; charset=utf-8');
    }

    // --- Auth routes (public) ---
    if (url.pathname === '/api/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      const name = sanitizeInput(body.name);
      const email = sanitizeInput(body.email);
      const password = body.password;
      if (!name || !email || !password) return json(400, { error: 'Name, email and password required' });
      if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters' });
      try {
        const user = createUser(name, email, password);
        const session = loginUser(email, password);
        setAuthCookie(res, session.token);
        recordLoginSuccess(clientIP);
        return json(201, session);
      } catch (e) { return json(400, { error: e.message }); }
    }

    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      const { email, password } = await parseBody(req);
      if (!email || !password) return json(400, { error: 'Email and password required' });
      try {
        const session = loginUser(email, password);
        setAuthCookie(res, session.token);
        recordLoginSuccess(clientIP);
        return json(200, session);
      } catch (e) {
        recordLoginFailure(clientIP);
        securityLog(`LOGIN_FAIL IP=${clientIP} email=${email}`);
        return json(401, { error: e.message });
      }
    }

    if (url.pathname === '/api/auth/logout' && req.method === 'POST') {
      clearAuthCookie(res);
      return json(200, { ok: true });
    }

    if (url.pathname === '/api/auth/me' && req.method === 'GET') {
      const user = authMiddleware(req);
      if (!user) return json(401, { error: 'Not authenticated' });
      return json(200, { user });
    }

    // --- Protected API routes ---
    const user = authMiddleware(req);
    // Track user IP + location on every auth'd request
    if (user) {
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.headers['cf-connecting-ip'] || req.socket.remoteAddress || '';
      authDb.prepare('UPDATE users SET last_ip = ?, last_active = datetime(\'now\') WHERE id = ?').run(ip, user.id);
      // Async geolocate (non-blocking, best effort)
      if (ip && ip !== '127.0.0.1' && ip !== '::1') {
        geolocateIP(ip, user.id).catch(() => {});
      }
    }
    if (url.pathname.startsWith('/api/') && !user) {
      return json(401, { error: 'Authentication required' });
    }

    // API: Opinions CRUD
    if (url.pathname === '/api/opinions' && req.method === 'GET') {
      const opinions = authDb.prepare('SELECT id, title, client_name, country, status, created_at FROM opinions WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
      return json(200, { opinions });
    }
    if (url.pathname === '/api/opinions' && req.method === 'POST') {
      const { title, client_name, country, formData: fd, opinion_text, sources, treaty_analysis } = await parseBody(req);
      const id = crypto.randomUUID();
      authDb.prepare('INSERT INTO opinions (id, user_id, title, client_name, country, form_data, opinion_text, sources, treaty_analysis) VALUES (?,?,?,?,?,?,?,?,?)').run(
        id, user.id, title || `Parecer - ${client_name || 'Cliente'}`, client_name || '', country || '',
        JSON.stringify(fd || {}), opinion_text || '', JSON.stringify(sources || []), JSON.stringify(treaty_analysis || {})
      );
      return json(201, { id });
    }
    if (url.pathname.match(/^\/api\/opinions\/[\w-]+$/) && req.method === 'GET') {
      const id = url.pathname.split('/').pop();
      const op = authDb.prepare('SELECT * FROM opinions WHERE id = ? AND user_id = ?').get(id, user.id);
      if (!op) return json(404, { error: 'Not found' });
      op.form_data = JSON.parse(op.form_data || '{}');
      op.sources = JSON.parse(op.sources || '[]');
      op.treaty_analysis = JSON.parse(op.treaty_analysis || '{}');
      return json(200, op);
    }
    if (url.pathname.match(/^\/api\/opinions\/[\w-]+$/) && req.method === 'DELETE') {
      const id = url.pathname.split('/').pop();
      authDb.prepare('DELETE FROM opinions WHERE id = ? AND user_id = ?').run(id, user.id);
      return json(200, { ok: true });
    }

    // API: questionnaire schema
    if (url.pathname === '/api/questionnaire' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(QUESTIONNAIRE));
    }

    // API: search
    if (url.pathname === '/api/search' && req.method === 'POST') {
      const { query, topK } = await parseBody(req);
      const results = await search(query, topK || 5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(results));
    }

    // API: treaty analysis only
    if (url.pathname === '/api/analyze' && req.method === 'POST') {
      const formData = await parseBody(req);
      const result = await analyzeTreaty(formData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    }

    // API: generate (non-streaming, returns full JSON)
    if (url.pathname === '/api/generate' && req.method === 'POST') {
      const formData = await parseBody(req);
      const treatyAnalysis = await analyzeTreaty(formData);
      const { prompt, sources, legalContext } = buildPrompt(formData, treatyAnalysis);
      const opinion = await generateWithLLM(prompt, SYSTEM);
      // Run audit
      const auditResult = await auditOpinion(opinion, formData, legalContext);
      const auditSection = formatAuditSection(auditResult);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ opinion: opinion + auditSection, sources, treatyAnalysis, auditResult: { approved: auditResult.approved, issues: auditResult.issues, summary: auditResult.summary }, generatedAt: new Date().toISOString(), formData }));
    }

    // API: stream generate (SSE)
    if (url.pathname === '/api/stream' && req.method === 'POST') {
      const formData = await parseBody(req);
      const treatyAnalysis = await analyzeTreaty(formData);
      const { prompt, sources, legalContext } = buildPrompt(formData, treatyAnalysis);

      // Send treaty analysis first, then stream opinion tokens
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ type: 'analysis', treatyAnalysis, sources })}\n\n`);

      const { text: opinion, usage: streamUsage } = await streamGenerate(prompt, SYSTEM, res);

      // Log usage
      const inputTokens = streamUsage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const outputTokens = streamUsage?.completion_tokens || Math.ceil(opinion.length / 4);
      const cost = (inputTokens * LLM_INPUT_COST_PER_TOKEN) + (outputTokens * LLM_OUTPUT_COST_PER_TOKEN);
      try {
        authDb.prepare('INSERT INTO usage_logs (user_id, action, model, input_tokens, output_tokens, cost_usd, metadata) VALUES (?,?,?,?,?,?,?)')
          .run(user.id, 'generate_opinion', LLM_MODEL, inputTokens, outputTokens, cost, JSON.stringify({ country: formData.source_country || formData.country_residence, client_type: formData.client_type }));
      } catch (e) { console.error('Usage log error:', e.message); }

      res.write(`data: ${JSON.stringify({ type: 'complete', opinion, generatedAt: new Date().toISOString() })}\n\n`);

      // Phase 2: Audit Agent - run after opinion is streamed
      try {
        res.write(`data: ${JSON.stringify({ type: 'audit_status', message: 'Auditando parecer...' })}\n\n`);
        const auditResult = await auditOpinion(opinion, formData, legalContext);
        const auditSection = formatAuditSection(auditResult);

        // Stream audit section as additional tokens
        res.write(`data: ${JSON.stringify({ type: 'audit', auditSection, auditResult: { approved: auditResult.approved, issues: auditResult.issues, summary: auditResult.summary } })}\n\n`);

        // Log audit usage
        if (auditResult.usage) {
          const aIn = auditResult.usage.prompt_tokens || 0;
          const aOut = auditResult.usage.completion_tokens || 0;
          const aCost = (aIn * LLM_INPUT_COST_PER_TOKEN) + (aOut * LLM_OUTPUT_COST_PER_TOKEN);
          try {
            authDb.prepare('INSERT INTO usage_logs (user_id, action, model, input_tokens, output_tokens, cost_usd, metadata) VALUES (?,?,?,?,?,?,?)')
              .run(user.id, 'audit', LLM_MODEL, aIn, aOut, aCost, JSON.stringify({ approved: auditResult.approved, issues_count: auditResult.issues.length }));
          } catch (e) { console.error('Audit usage log error:', e.message); }
        }
      } catch (e) {
        console.error('Audit error:', e.message);
        res.write(`data: ${JSON.stringify({ type: 'audit', auditSection: '', auditResult: { approved: true, issues: [], summary: 'Auditoria indisponível.' } })}\n\n`);
      }

      res.end();
      return;
    }

    // API: PDF export
    if (url.pathname === '/api/pdf' && req.method === 'POST') {
      const data = await parseBody(req);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="parecer-${(data.formData?.client_name || 'cliente').replace(/\\s+/g, '-').toLowerCase()}.pdf"`,
      });
      generatePDF(data, res);
      return;
    }

    // --- Support Chat Routes ---
    if (url.pathname === '/api/support/messages' && req.method === 'GET') {
      const msgs = authDb.prepare('SELECT id, role, content, image, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC').all(user.id);
      return json(200, { messages: msgs });
    }

    if (url.pathname === '/api/support/message' && req.method === 'POST') {
      const { content, image } = await parseBody(req);
      if (!content && !image) return json(400, { error: 'Content or image required' });

      authDb.prepare('INSERT INTO support_messages (user_id, role, content, image) VALUES (?, ?, ?, ?)').run(user.id, 'user', content || '', image || null);

      const history = authDb.prepare('SELECT role, content, image FROM support_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id).reverse();

      const supportSystem = `Você é o assistente de suporte do sistema MSTA — Parecer Tributário Inteligente.

O sistema é uma aplicação web que gera pareceres tributários usando IA. Stack técnica:
- Frontend: HTML/CSS/JS vanilla (ui/index.html, ui/app.js, ui/style.css)
- Backend: Node.js com HTTP server puro (src/server.js)
- Database: SQLite (better-sqlite3) para auth e embeddings
- LLM: Claude Opus 4.6 via Anthropic para geração de pareceres
- RAG: Busca semântica em tratados tributários brasileiros (50+ tratados)
- PDF: Exportação de pareceres em PDF

Funcionalidades:
1. Login/Registro de usuários
2. Questionário multi-etapas para coletar dados do caso tributário
3. Análise automática de tratados (busca por país, tipo de renda, etc.)
4. Geração de parecer tributário com streaming
5. Exportação em PDF

Seu objetivo:
- Ajudar o usuário com dúvidas sobre o sistema
- Se reportar um bug, coletar: o que fez, o que esperava, o que aconteceu, screenshot se possível
- Ser educado e profissional em português
- Se não souber resolver, diga que vai encaminhar para a equipe técnica
- NUNCA inventar funcionalidades que não existem`;

      const messages = [
        { role: 'system', content: supportSystem },
        ...history.map(m => ({ role: m.role, content: m.image ? m.content + '\n[Imagem anexada]' : m.content }))
      ];

      try {
        // Anthropic requires system as top-level param, not in messages array
        const userMessages = messages.filter(m => m.role !== 'system');
        const response = await anthropic.messages.create({
          model: LLM_MODEL,
          max_tokens: 2000,
          temperature: 0.5,
          system: supportSystem,
          messages: userMessages
        });
        let reply = response.content?.[0]?.text || 'Desculpe, não consegui processar sua mensagem.';

        // Log support chat usage
        const sInputTokens = response.usage?.input_tokens || 0;
        const sOutputTokens = response.usage?.output_tokens || 0;
        const sCost = (sInputTokens * LLM_INPUT_COST_PER_TOKEN) + (sOutputTokens * LLM_OUTPUT_COST_PER_TOKEN);
        try {
          authDb.prepare('INSERT INTO usage_logs (user_id, action, model, input_tokens, output_tokens, cost_usd, metadata) VALUES (?,?,?,?,?,?,?)')
            .run(user.id, 'support_chat', LLM_MODEL, sInputTokens, sOutputTokens, sCost, '{}');
        } catch (e) { console.error('Usage log error:', e.message); }

        authDb.prepare('INSERT INTO support_messages (user_id, role, content) VALUES (?, ?, ?)').run(user.id, 'assistant', reply);
        return json(200, { reply });
      } catch (e) {
        console.error('Support chat error:', e.message);
        const fallback = 'Desculpe, estou com dificuldades técnicas. Tente novamente em instantes.';
        authDb.prepare('INSERT INTO support_messages (user_id, role, content) VALUES (?, ?, ?)').run(user.id, 'assistant', fallback);
        return json(200, { reply: fallback });
      }
    }

    if (url.pathname === '/api/support/report' && req.method === 'POST') {
      const { summary, steps, expected, actual, screenshot, severity } = await parseBody(req);
      const result = authDb.prepare('INSERT INTO support_reports (user_id, summary, steps, expected, actual, screenshot, severity) VALUES (?, ?, ?, ?, ?, ?, ?)').run(user.id, summary, steps, expected, actual, screenshot || null, severity || 'medium');
      const reportId = result.lastInsertRowid;
      const reportData = { id: reportId, user_id: user.id, user_email: user.email, summary, steps, expected, actual, severity: severity || 'medium', created_at: new Date().toISOString() };
      const bugDir = path.join(__dirname, '..', 'data', 'bug-reports');
      if (!fs.existsSync(bugDir)) fs.mkdirSync(bugDir, { recursive: true });
      fs.writeFileSync(path.join(bugDir, 'report-' + reportId + '.json'), JSON.stringify(reportData, null, 2));
      return json(201, { id: reportId });
    }

    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return serveHtml(res, path.join(__dirname, '..', 'ui', 'admin.html'), cspNonce);
    }

    // --- Admin API routes ---
    if (url.pathname.startsWith('/api/admin/')) {
      if (!user || user.role !== 'admin') return json(403, { error: 'Admin required' });

      if (url.pathname === '/api/admin/dashboard' && req.method === 'GET') {
        const totalUsers = authDb.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const activeToday = authDb.prepare("SELECT COUNT(DISTINCT user_id) as c FROM sessions WHERE created_at >= date('now')").get().c;
        const activeLast7d = authDb.prepare("SELECT COUNT(DISTINCT user_id) as c FROM sessions WHERE created_at >= date('now', '-7 days')").get().c;
        const totalOpinions = authDb.prepare('SELECT COUNT(*) as c FROM opinions').get().c;
        const opinionsToday = authDb.prepare("SELECT COUNT(*) as c FROM opinions WHERE created_at >= date('now')").get().c;
        const opinionsLast7d = authDb.prepare("SELECT COUNT(*) as c FROM opinions WHERE created_at >= date('now', '-7 days')").get().c;
        const openReports = authDb.prepare("SELECT COUNT(*) as c FROM support_reports WHERE status = 'open'").get().c;
        const totalMessages = authDb.prepare('SELECT COUNT(*) as c FROM support_messages').get().c;
        const topCountries = authDb.prepare("SELECT country, COUNT(*) as count FROM opinions WHERE country != '' GROUP BY country ORDER BY count DESC LIMIT 10").all();
        const totalCost = authDb.prepare('SELECT COALESCE(SUM(cost_usd),0) as c FROM usage_logs').get().c;
        const totalTokens = authDb.prepare('SELECT COALESCE(SUM(input_tokens),0) as inp, COALESCE(SUM(output_tokens),0) as out FROM usage_logs').get();
        const userLocations = authDb.prepare("SELECT name, email, last_location, last_ip, last_active FROM users WHERE last_location IS NOT NULL AND last_location != '' ORDER BY last_active DESC").all();
        const recentActivity = authDb.prepare(`
          SELECT u.name as user_name, 'opinion' as action, o.title as detail, o.created_at as time, u.last_location as location
          FROM opinions o JOIN users u ON o.user_id = u.id
          ORDER BY o.created_at DESC LIMIT 20
        `).all();
        return json(200, {
          users: { total: totalUsers, activeToday, activeLast7d },
          opinions: { total: totalOpinions, today: opinionsToday, last7d: opinionsLast7d },
          support: { openReports, totalMessages },
          usage: { totalCost, inputTokens: totalTokens.inp, outputTokens: totalTokens.out },
          topCountries, userLocations, recentActivity
        });
      }

      if (url.pathname === '/api/admin/users' && req.method === 'GET') {
        const users = authDb.prepare(`
          SELECT u.id, u.name, u.email, u.role, u.created_at, u.last_ip, u.last_location, u.last_active,
            (SELECT COUNT(*) FROM opinions WHERE user_id = u.id) as opinion_count,
            (SELECT COALESCE(SUM(cost_usd),0) FROM usage_logs WHERE user_id = u.id) as total_cost
          FROM users u ORDER BY u.created_at DESC
        `).all();
        return json(200, { users });
      }

      const userMatch = url.pathname.match(/^\/api\/admin\/users\/([\w-]+)$/);
      if (userMatch && req.method === 'GET') {
        const u = authDb.prepare('SELECT id, name, email, role, created_at, last_ip, last_location, last_active FROM users WHERE id = ?').get(userMatch[1]);
        if (!u) return json(404, { error: 'User not found' });
        const opinions = authDb.prepare('SELECT id, title, client_name, country, created_at FROM opinions WHERE user_id = ? ORDER BY created_at DESC').all(u.id);
        const supportCount = authDb.prepare('SELECT COUNT(*) as c FROM support_messages WHERE user_id = ?').get(u.id).c;
        return json(200, { ...u, opinions, support_messages_count: supportCount });
      }
      if (userMatch && req.method === 'PATCH') {
        const body = await parseBody(req);
        if (body.role) authDb.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, userMatch[1]);
        return json(200, { ok: true });
      }

      if (url.pathname === '/api/admin/opinions' && req.method === 'GET') {
        const opinions = authDb.prepare(`
          SELECT o.id, o.title, o.client_name, o.country, u.name as user_name, u.email as user_email, o.created_at
          FROM opinions o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC
        `).all();
        return json(200, { opinions });
      }

      const opMatch = url.pathname.match(/^\/api\/admin\/opinions\/([\w-]+)$/);
      if (opMatch && req.method === 'GET') {
        const op = authDb.prepare(`
          SELECT o.*, u.name as user_name, u.email as user_email
          FROM opinions o JOIN users u ON o.user_id = u.id WHERE o.id = ?
        `).get(opMatch[1]);
        if (!op) return json(404, { error: 'Not found' });
        op.form_data = JSON.parse(op.form_data || '{}');
        op.sources = JSON.parse(op.sources || '[]');
        op.treaty_analysis = JSON.parse(op.treaty_analysis || '{}');
        return json(200, op);
      }

      if (url.pathname === '/api/admin/reports' && req.method === 'GET') {
        const reports = authDb.prepare(`
          SELECT r.*, u.name as user_name, u.email as user_email
          FROM support_reports r JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC
        `).all();
        // Also get support conversations summary
        const conversations = authDb.prepare(`
          SELECT u.id as user_id, u.name as user_name, u.email as user_email, u.last_location,
            COUNT(*) as message_count,
            MAX(m.created_at) as last_message,
            MIN(m.created_at) as first_message
          FROM support_messages m JOIN users u ON m.user_id = u.id
          GROUP BY m.user_id ORDER BY last_message DESC
        `).all();
        return json(200, { reports, conversations });
      }

      // Get a user's support chat transcript
      const supportTranscriptMatch = url.pathname.match(/^\/api\/admin\/support\/([\w-]+)$/);
      if (supportTranscriptMatch && req.method === 'GET') {
        if (user.role !== 'admin') return json(403, { error: 'Admin required' });
        const msgs = authDb.prepare('SELECT role, content, image, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC').all(supportTranscriptMatch[1]);
        return json(200, { messages: msgs });
      }

      const reportMatch = url.pathname.match(/^\/api\/admin\/reports\/(\d+)$/);
      if (reportMatch && req.method === 'PATCH') {
        const body = await parseBody(req);
        if (body.status) authDb.prepare('UPDATE support_reports SET status = ? WHERE id = ?').run(body.status, reportMatch[1]);
        return json(200, { ok: true });
      }

      if (url.pathname === '/api/admin/usage' && req.method === 'GET') {
        const totals = authDb.prepare('SELECT COALESCE(SUM(cost_usd),0) as totalCost, COALESCE(SUM(input_tokens),0) as input, COALESCE(SUM(output_tokens),0) as output FROM usage_logs').get();
        const byUser = authDb.prepare(`
          SELECT u.name as user_name, COALESCE(SUM(l.cost_usd),0) as cost, COUNT(*) as opinions
          FROM usage_logs l JOIN users u ON l.user_id = u.id GROUP BY l.user_id ORDER BY cost DESC
        `).all();
        const byDay = authDb.prepare(`
          SELECT date(created_at) as date, COALESCE(SUM(cost_usd),0) as cost, COUNT(*) as requests
          FROM usage_logs GROUP BY date(created_at) ORDER BY date DESC LIMIT 30
        `).all();
        const byAction = authDb.prepare(`
          SELECT action, COUNT(*) as count, COALESCE(SUM(cost_usd),0) as cost
          FROM usage_logs GROUP BY action ORDER BY cost DESC
        `).all();
        return json(200, {
          totalCost: totals.totalCost,
          totalTokens: { input: totals.input, output: totals.output },
          byUser, byDay, byAction
        });
      }

      // Security dashboard API
      if (url.pathname === '/api/admin/security' && req.method === 'GET') {
        const blockedIPs = [];
        const now = Date.now();
        for (const [ip, entry] of bruteForceMap) {
          if (entry.blockedUntil && now < entry.blockedUntil) {
            blockedIPs.push({ ip, blockedUntil: new Date(entry.blockedUntil).toISOString(), failures: entry.failures.length });
          }
        }
        // Read recent security log entries
        let failedLogins = [];
        try {
          const secContent = fs.readFileSync(SECURITY_LOG, 'utf-8');
          const lines = secContent.split('\n').filter(l => l.includes('LOGIN_FAIL'));
          const cutoff = new Date(Date.now() - 86400000).toISOString();
          failedLogins = lines.filter(l => { const m = l.match(/\[(.*?)\]/); return m && m[1] >= cutoff; })
            .map(l => { const m = l.match(/\[(.*?)\] LOGIN_FAIL IP=(.*?) email=(.*)/); return m ? { time: m[1], ip: m[2], email: m[3] } : null; })
            .filter(Boolean).slice(-100);
        } catch {}
        // Request stats from rate limit map
        const requestStats = [];
        for (const [ip, bucket] of rateLimitMap) {
          const total = bucket.auth.length + bucket.api.length;
          if (total > 0) requestStats.push({ ip, auth: bucket.auth.length, api: bucket.api.length, total });
        }
        requestStats.sort((a, b) => b.total - a.total);
        return json(200, { blockedIPs, failedLogins, requestStats: requestStats.slice(0, 20) });
      }

      if (url.pathname === '/api/admin/access-log' && req.method === 'GET') {
        let entries = [];
        try {
          const content = fs.readFileSync(ACCESS_LOG, 'utf-8');
          entries = content.split('\n').filter(Boolean).slice(-50);
        } catch {}
        return json(200, { entries });
      }

      return json(404, { error: 'Admin endpoint not found' });
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (e) {
    console.error('Error:', e.message);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: e.message }));
  }
});

// Graceful error handling
process.on('uncaughtException', (e) => { console.error('Uncaught:', e.message); });
process.on('unhandledRejection', (e) => { console.error('Unhandled:', e); });

server.listen(PORT, () => {
  console.log(`🏛️  MSTA Tax AI running at http://localhost:${PORT}`);
  console.log(`   Model: ${LLM_MODEL}`);
});
