/**
 * Protected API routes: generate, opinions, treaties, PDF, questionnaire, search
 */
const crypto = require('crypto');
const { authDb } = require('../auth');
const { parseBody } = require('../http-helpers');
const { search } = require('../search');
const { analyzeTreaty } = require('../treaty-analyzer');
const { generatePDF } = require('../pdf-export');
const { auditOpinion, formatAuditSection } = require('../audit-agent');
const { QUESTIONNAIRE, buildPrompt } = require('../questionnaire');
const { streamGenerate, generateWithLLM } = require('../llm');
const { LLM_MODEL, LLM_INPUT_COST_PER_TOKEN, LLM_OUTPUT_COST_PER_TOKEN, SYSTEM } = require('../config');

function handleApiRoutes(url, req, res, json, user) {
  // API: Opinions CRUD
  if (url.pathname === '/api/opinions' && req.method === 'GET') {
    const opinions = authDb.prepare('SELECT id, title, client_name, country, status, created_at FROM opinions WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
    return json(200, { opinions });
  }
  if (url.pathname === '/api/opinions' && req.method === 'POST') {
    return (async () => {
      const { title, client_name, country, formData: fd, opinion_text, sources, treaty_analysis } = await parseBody(req);
      const id = crypto.randomUUID();
      authDb.prepare('INSERT INTO opinions (id, user_id, title, client_name, country, form_data, opinion_text, sources, treaty_analysis) VALUES (?,?,?,?,?,?,?,?,?)').run(
        id, user.id, title || `Parecer - ${client_name || 'Cliente'}`, client_name || '', country || '',
        JSON.stringify(fd || {}), opinion_text || '', JSON.stringify(sources || []), JSON.stringify(treaty_analysis || {})
      );
      return json(201, { id });
    })();
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
    return (async () => {
      const body = await parseBody(req);
      const results = await search(body.query, body.topK || body.limit || 5);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ results }));
    })();
  }

  // API: treaty analysis only
  if (url.pathname === '/api/analyze' && req.method === 'POST') {
    return (async () => {
      const formData = await parseBody(req);
      const result = await analyzeTreaty(formData);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    })();
  }

  // API: generate (non-streaming)
  if (url.pathname === '/api/generate' && req.method === 'POST') {
    return (async () => {
      const formData = await parseBody(req);
      const treatyAnalysis = await analyzeTreaty(formData);
      const { prompt, sources, legalContext } = buildPrompt(formData, treatyAnalysis);
      const opinion = await generateWithLLM(prompt, SYSTEM);
      const auditResult = await auditOpinion(opinion, formData, legalContext);
      const auditSection = formatAuditSection(auditResult);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ opinion: opinion + auditSection, sources, treatyAnalysis, auditResult: { approved: auditResult.approved, issues: auditResult.issues, summary: auditResult.summary }, generatedAt: new Date().toISOString(), formData }));
    })();
  }

  // API: stream generate (SSE)
  if (url.pathname === '/api/stream' && req.method === 'POST') {
    return (async () => {
      const formData = await parseBody(req);
      const treatyAnalysis = await analyzeTreaty(formData);
      const { prompt, sources, legalContext } = buildPrompt(formData, treatyAnalysis);

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });
      res.write(`data: ${JSON.stringify({ type: 'analysis', treatyAnalysis, sources })}\n\n`);

      const { text: opinion, usage: streamUsage } = await streamGenerate(prompt, SYSTEM, res);

      const inputTokens = streamUsage?.prompt_tokens || Math.ceil(prompt.length / 4);
      const outputTokens = streamUsage?.completion_tokens || Math.ceil(opinion.length / 4);
      const cost = (inputTokens * LLM_INPUT_COST_PER_TOKEN) + (outputTokens * LLM_OUTPUT_COST_PER_TOKEN);
      try {
        authDb.prepare('INSERT INTO usage_logs (user_id, action, model, input_tokens, output_tokens, cost_usd, metadata) VALUES (?,?,?,?,?,?,?)')
          .run(user.id, 'generate_opinion', LLM_MODEL, inputTokens, outputTokens, cost, JSON.stringify({ country: formData.source_country || formData.country_residence, client_type: formData.client_type }));
      } catch (e) { console.error('Usage log error:', e.message); }

      res.write(`data: ${JSON.stringify({ type: 'complete', opinion, generatedAt: new Date().toISOString() })}\n\n`);

      // Phase 2: Audit Agent
      try {
        res.write(`data: ${JSON.stringify({ type: 'audit_status', message: 'Auditando parecer...' })}\n\n`);
        const auditResult = await auditOpinion(opinion, formData, legalContext);
        const auditSection = formatAuditSection(auditResult);

        res.write(`data: ${JSON.stringify({ type: 'audit', auditSection, auditResult: { approved: auditResult.approved, issues: auditResult.issues, summary: auditResult.summary } })}\n\n`);

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
    })();
  }

  // API: PDF export
  if (url.pathname === '/api/pdf' && req.method === 'POST') {
    return (async () => {
      const data = await parseBody(req);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="parecer-${(data.formData?.client_name || 'cliente').replace(/\\s+/g, '-').toLowerCase()}.pdf"`,
      });
      generatePDF(data, res);
    })();
  }

  return null; // not handled
}

module.exports = { handleApiRoutes };
