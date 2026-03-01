/**
 * Support chat routes
 */
const { authDb } = require('../auth');
const { parseBody } = require('../http-helpers');
const { LLM_MODEL, LLM_INPUT_COST_PER_TOKEN, LLM_OUTPUT_COST_PER_TOKEN } = require('../config');
const { generateWithLLM } = require('../llm');

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

function handleSupportRoutes(url, req, res, json, user) {
  if (url.pathname === '/api/support/messages' && req.method === 'GET') {
    const msgs = authDb.prepare('SELECT id, role, content, image, created_at FROM support_messages WHERE user_id = ? ORDER BY created_at ASC').all(user.id);
    return json(200, { messages: msgs });
  }

  if (url.pathname === '/api/support/message' && req.method === 'POST') {
    return (async () => {
      const { content, image } = await parseBody(req);
      if (!content && !image) return json(400, { error: 'Content or image required' });

      authDb.prepare('INSERT INTO support_messages (user_id, role, content, image) VALUES (?, ?, ?, ?)').run(user.id, 'user', content || '', image || null);

      const history = authDb.prepare('SELECT role, content, image FROM support_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id).reverse();

      const userMessages = history.map(m => ({ role: m.role, content: m.image ? m.content + '\n[Imagem anexada]' : m.content }));

      try {
        // Build conversation as single prompt for Claude CLI
        const chatPrompt = userMessages.map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`).join('\n\n');
        let reply = await generateWithLLM(chatPrompt, supportSystem) || 'Desculpe, não consegui processar sua mensagem.';

        const sInputTokens = Math.ceil(chatPrompt.length / 4);
        const sOutputTokens = Math.ceil(reply.length / 4);
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
    })();
  }

  if (url.pathname === '/api/support/report' && req.method === 'POST') {
    return (async () => {
      const fs = require('fs');
      const path = require('path');
      const { summary, steps, expected, actual, screenshot, severity } = await parseBody(req);
      const result = authDb.prepare('INSERT INTO support_reports (user_id, summary, steps, expected, actual, screenshot, severity) VALUES (?, ?, ?, ?, ?, ?, ?)').run(user.id, summary, steps, expected, actual, screenshot || null, severity || 'medium');
      const reportId = result.lastInsertRowid;
      const reportData = { id: reportId, user_id: user.id, user_email: user.email, summary, steps, expected, actual, severity: severity || 'medium', created_at: new Date().toISOString() };
      const bugDir = path.join(__dirname, '..', '..', 'data', 'bug-reports');
      if (!fs.existsSync(bugDir)) fs.mkdirSync(bugDir, { recursive: true });
      fs.writeFileSync(path.join(bugDir, 'report-' + reportId + '.json'), JSON.stringify(reportData, null, 2));
      return json(201, { id: reportId });
    })();
  }

  return null;
}

module.exports = { handleSupportRoutes };
