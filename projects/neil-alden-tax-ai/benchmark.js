const fs = require('fs');
const path = require('path');

const API_KEY = process.env.OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TIMEOUT = 120000; // 120s

const MODELS = [
  'moonshotai/kimi-k2.5',
  'minimax/minimax-m1-40k',
  'thudm/glm-4-32b',
  'qwen/qwen3-32b',
  'deepseek/deepseek-r1',
];

const SYSTEM_PROMPT = `Você é advogado tributarista internacional sênior no escritório Neil Alden Advocacia Tributária. Gere pareceres em português formal com citações a artigos de tratados. Seja específico e prático. Quando citar artigos, inclua o número do artigo e parágrafo específico.`;

const corpusDir = path.join(__dirname, 'corpus/treaties-text');

// Load treaty text
const treatyText = fs.readFileSync(path.join(corpusDir, 'paises-baixos.md'), 'utf8').slice(0, 3000);

const PROMPTS = [
  {
    name: 'Treaty Analysis (Royalties BR-NL)',
    text: `Contexto do tratado (Brasil-Países Baixos):\n${treatyText}\n\nPergunta do cliente: Uma empresa holandesa com estabelecimento permanente no Brasil recebe royalties de uma subsidiária brasileira. Qual a tributação aplicável segundo o tratado? Cite os artigos específicos.`
  },
  {
    name: 'Formal Legal Opinion (DE services)',
    text: `Com base no tratado Brasil-Alemanha para evitar dupla tributação, elabore um parecer tributário sobre a seguinte situação:\n\nCliente: Empresa alemã de tecnologia que presta serviços de consultoria remotamente para clientes brasileiros, sem presença física no Brasil. Faturamento anual de R$ 2 milhões.\n\nO parecer deve incluir:\n1. Enquadramento nos artigos do tratado\n2. Análise de estabelecimento permanente (Art. 5)\n3. Tributação de lucros empresariais (Art. 7)\n4. Tributação de serviços técnicos\n5. Conclusão e recomendação prática`
  },
  {
    name: 'Quick Q&A (Dividends BR-JP)',
    text: `Qual a alíquota máxima de retenção na fonte sobre dividendos pagos do Brasil para o Japão segundo o tratado vigente? Responda de forma direta citando o artigo.`
  }
];

async function callModel(model, prompt) {
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    max_tokens: 4000,
  };

  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    const data = await res.json();

    if (data.error) {
      return { error: data.error.message || JSON.stringify(data.error), elapsed };
    }

    const choice = data.choices?.[0];
    const content = choice?.message?.content || '';
    const usage = data.usage || {};

    return {
      content,
      elapsed,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      model: data.model || model,
    };
  } catch (e) {
    clearTimeout(timer);
    return { error: e.name === 'AbortError' ? 'TIMEOUT (120s)' : e.message, elapsed: Date.now() - start };
  }
}

async function main() {
  const results = [];
  const total = MODELS.length * PROMPTS.length;
  let count = 0;

  for (const model of MODELS) {
    for (const prompt of PROMPTS) {
      count++;
      console.log(`[${count}/${total}] ${model} | ${prompt.name}...`);
      const res = await callModel(model, prompt.text);
      results.push({
        model,
        prompt: prompt.name,
        ...res,
        excerpt: res.content ? res.content.slice(0, 500) : null,
      });
      console.log(`  → ${res.error ? 'ERROR: ' + res.error : `OK ${res.elapsed}ms, ${res.totalTokens} tokens`}`);
      // Small delay between calls
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Save raw results
  fs.writeFileSync(path.join(__dirname, 'benchmark-results.json'), JSON.stringify(results, null, 2));

  // Generate markdown summary
  let md = `# LLM Benchmark: Brazilian Tax Law Opinion Generation\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}\n`;
  md += `**Models tested:** ${MODELS.length} | **Prompts:** ${PROMPTS.length} | **Total runs:** ${total}\n\n`;

  // Summary table
  md += `## Summary Table\n\n`;
  md += `| Model | Prompt | Time (s) | Tokens | Error |\n`;
  md += `|-------|--------|----------|--------|-------|\n`;
  for (const r of results) {
    md += `| ${r.model} | ${r.prompt} | ${r.error ? '-' : (r.elapsed / 1000).toFixed(1)} | ${r.error ? '-' : r.totalTokens} | ${r.error || '-'} |\n`;
  }

  // Average response times per model
  md += `\n## Average Response Time by Model\n\n`;
  md += `| Model | Avg Time (s) | Successful Runs |\n`;
  md += `|-------|--------------|-----------------|\n`;
  for (const model of MODELS) {
    const modelResults = results.filter(r => r.model === model && !r.error);
    if (modelResults.length === 0) {
      md += `| ${model} | - | 0/${PROMPTS.length} |\n`;
    } else {
      const avgTime = modelResults.reduce((s, r) => s + r.elapsed, 0) / modelResults.length;
      md += `| ${model} | ${(avgTime / 1000).toFixed(1)} | ${modelResults.length}/${PROMPTS.length} |\n`;
    }
  }

  // Response excerpts
  md += `\n## Response Excerpts (first 500 chars)\n\n`;
  for (const r of results) {
    md += `### ${r.model} — ${r.prompt}\n`;
    if (r.error) {
      md += `**ERROR:** ${r.error}\n\n`;
    } else {
      md += `**Time:** ${(r.elapsed / 1000).toFixed(1)}s | **Tokens:** ${r.totalTokens}\n\n`;
      md += `\`\`\`\n${r.excerpt}\n\`\`\`\n\n`;
    }
  }

  fs.writeFileSync(path.join(__dirname, 'BENCHMARK-RESULTS.md'), md);
  console.log('\nDone! Results saved to benchmark-results.json and BENCHMARK-RESULTS.md');
}

main().catch(console.error);
