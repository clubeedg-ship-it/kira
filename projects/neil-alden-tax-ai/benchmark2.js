const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENROUTER_API_KEY;
if (!API_KEY) { console.error('Set OPENROUTER_API_KEY'); process.exit(1); }

const MODELS = [
  'deepseek/deepseek-v3.2',
  'z-ai/glm-5',
  'minimax/minimax-m2.5',
  'qwen/qwen3-max-thinking',
  'moonshotai/kimi-k2.5',
];

const SYSTEM = `Você é advogado tributarista internacional sênior no escritório Neil Alden Advocacia Tributária. Gere pareceres em português formal com citações a artigos de tratados. Seja específico e prático.`;

const treatyText = fs.readFileSync(path.join(__dirname, 'corpus/treaties-text/paises-baixos.md'), 'utf8').slice(0, 3000);
const treatyDE = fs.readFileSync(path.join(__dirname, 'corpus/treaties-text/alemanha.md'), 'utf8').slice(0, 3000);

const PROMPTS = [
  {
    name: 'Treaty Analysis',
    text: `Contexto do tratado Brasil-Países Baixos:\n${treatyText}\n\nUma empresa holandesa com EP no Brasil recebe royalties de subsidiária brasileira. Qual a tributação aplicável? Cite artigos específicos.`
  },
  {
    name: 'Legal Opinion',
    text: `Com base no tratado Brasil-Alemanha:\n${treatyDE}\n\nElabore parecer: empresa alemã de TI presta consultoria remota para clientes BR, sem presença física, faturamento R$2M/ano.\nInclua: 1) Enquadramento 2) EP (Art.5) 3) Lucros (Art.7) 4) Serviços técnicos 5) Conclusão prática`
  },
  {
    name: 'Quick Q&A',
    text: `Qual a alíquota máxima de retenção na fonte sobre dividendos pagos do Brasil para o Japão segundo o tratado vigente? Responda de forma direta citando o artigo.`
  }
];

async function callModel(model, prompt) {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  
  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], max_tokens: 16000 }),
      signal: controller.signal
    });
    const data = await resp.json();
    clearTimeout(timer);
    const ms = Date.now() - start;
    
    if (data.error) return { model, error: data.error.message || JSON.stringify(data.error), ms };
    
    const content = data.choices?.[0]?.message?.content || '';
    const usage = data.usage || {};
    return { model, ms, content, promptTokens: usage.prompt_tokens, completionTokens: usage.completion_tokens, totalTokens: usage.total_tokens };
  } catch (e) {
    clearTimeout(timer);
    return { model, error: e.message, ms: Date.now() - start };
  }
}

(async () => {
  const results = [];
  
  for (const model of MODELS) {
    for (const prompt of PROMPTS) {
      process.stdout.write(`[${results.length+1}/${MODELS.length * PROMPTS.length}] ${model} | ${prompt.name}...`);
      const r = await callModel(model, prompt.text);
      r.promptName = prompt.name;
      results.push(r);
      
      if (r.error) {
        console.log(` ERROR: ${r.error.substring(0, 80)}`);
      } else {
        console.log(` ${(r.ms/1000).toFixed(1)}s | ${r.totalTokens} tok | ${r.content.length} chars`);
      }
    }
  }
  
  // Generate report
  let md = `# Tax AI Model Benchmark Results\n\n**Date:** ${new Date().toISOString().split('T')[0]}\n**Budget:** $10 OpenRouter credits\n\n## Summary\n\n| Model | Prompt | Time | Tokens | Quality |\n|-------|--------|------|--------|---------|\n`;
  
  for (const r of results) {
    if (r.error) {
      md += `| ${r.model} | ${r.promptName} | - | - | ❌ ${r.error.substring(0,40)} |\n`;
    } else {
      md += `| ${r.model} | ${r.promptName} | ${(r.ms/1000).toFixed(1)}s | ${r.totalTokens} | ✅ |\n`;
    }
  }
  
  md += `\n## Response Excerpts\n\n`;
  for (const r of results) {
    md += `### ${r.model} — ${r.promptName}\n`;
    if (r.error) {
      md += `**ERROR:** ${r.error}\n\n`;
    } else {
      md += `**Time:** ${(r.ms/1000).toFixed(1)}s | **Tokens:** ${r.totalTokens}\n\n`;
      md += `\`\`\`\n${r.content.substring(0, 800)}\n\`\`\`\n\n`;
    }
  }
  
  fs.writeFileSync(path.join(__dirname, 'BENCHMARK-RESULTS.md'), md);
  fs.writeFileSync(path.join(__dirname, 'benchmark-results.json'), JSON.stringify(results, null, 2));
  console.log('\n✅ Results saved to BENCHMARK-RESULTS.md');
})();
