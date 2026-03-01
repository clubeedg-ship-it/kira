/**
 * LLM: streamGenerate, generateWithLLM (Anthropic SDK calls)
 */
const { anthropic, LLM_MODEL } = require('./config');

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

module.exports = { streamGenerate, generateWithLLM };
