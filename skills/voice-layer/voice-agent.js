/**
 * Voice Agent - Conversation handler and message crafter
 * 
 * Uses local LLM (Ollama) to:
 * - Summarize incoming messages for TTS
 * - Help craft responses based on voice input
 * - Incorporate RAG context and web search results
 */

import http from 'http';
import { queryMemory, formatRAGResults, getRecentContext } from './rag.js';

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'localhost';
const OLLAMA_PORT = process.env.OLLAMA_PORT || 11434;

// Auto-detect model (prefer qwen2.5, fallback to qwen3)
let MODEL = process.env.VOICE_AGENT_MODEL || null;

async function detectModel() {
  if (MODEL) return MODEL;
  
  try {
    const res = await fetch(`http://${OLLAMA_HOST}:${OLLAMA_PORT}/api/tags`);
    const data = await res.json();
    const models = data.models?.map(m => m.name) || [];
    
    // Preference order
    for (const preferred of ['qwen2.5:7b', 'qwen2.5', 'qwen3:8b', 'qwen3']) {
      if (models.some(m => m.startsWith(preferred.split(':')[0]))) {
        MODEL = models.find(m => m.startsWith(preferred.split(':')[0]));
        console.log(`Voice agent using model: ${MODEL}`);
        return MODEL;
      }
    }
    
    // Fallback to first available
    MODEL = models[0] || 'qwen3:8b';
    console.log(`Voice agent fallback to: ${MODEL}`);
    return MODEL;
  } catch {
    MODEL = 'qwen3:8b';
    return MODEL;
  }
}

// Initialize model detection
detectModel();

/**
 * Call Ollama for LLM processing
 */
async function callOllama(prompt, systemPrompt = '', options = {}) {
  // Ensure model is detected
  const model = options.model || (await detectModel());
  
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      prompt,
      system: systemPrompt,
      stream: false,
      think: false,  // Disable thinking mode for qwen3
      options: {
        temperature: options.temperature || 0.7,
        num_predict: options.maxTokens || 500
      }
    });
    
    const req = http.request({
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.response || '');
        } catch (e) {
          reject(new Error(`Invalid JSON: ${data.slice(0, 200)}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Ollama timeout')));
    req.write(payload);
    req.end();
  });
}

/**
 * Summarize a message for TTS (shorter, speakable)
 */
export async function summarizeForSpeech(message, options = {}) {
  const maxLength = options.maxLength || 200;
  
  // If already short, just return
  if (message.length <= maxLength) {
    return message;
  }
  
  const systemPrompt = `You summarize messages for voice output. Be concise but preserve key information. Output plain text only, no markdown.`;
  
  const prompt = `Summarize this message in ${maxLength} characters or less for voice output:

${message}

Summary:`;

  try {
    const summary = await callOllama(prompt, systemPrompt, { maxTokens: 150 });
    return summary.trim();
  } catch (e) {
    // Fallback: simple truncation
    return message.slice(0, maxLength) + '...';
  }
}

/**
 * Web search for terminology verification
 */
export async function webSearch(query) {
  // Use Clawdbot's web_fetch capability via curl
  try {
    const { execSync } = await import('child_process');
    const result = execSync(
      `curl -s "https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json"`,
      { timeout: 10000 }
    );
    const json = JSON.parse(result.toString());
    
    if (json.AbstractText) {
      return { found: true, text: json.AbstractText, source: json.AbstractSource };
    }
    
    if (json.RelatedTopics?.[0]?.Text) {
      return { found: true, text: json.RelatedTopics[0].Text };
    }
    
    return { found: false };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

/**
 * Craft a response based on voice input and context
 */
export async function craftResponse(voiceInput, context = {}) {
  const { originalMessage, ragResults, webResults, recentContext } = context;
  
  // Build context inline
  let contextInfo = '';
  
  if (originalMessage) {
    contextInfo += `Kira's last message: "${originalMessage.slice(0, 200)}"\n`;
  }
  
  if (ragResults?.length > 0) {
    const ragText = formatRAGResults(ragResults);
    if (ragText) contextInfo += `Context: ${ragText.slice(0, 200)}\n`;
  }
  
  if (webResults?.found) {
    contextInfo += `Info: ${webResults.text.slice(0, 100)}\n`;
  }
  
  const systemPrompt = `You are an NLP layer helping Otto communicate with Kira (his AI assistant).

Your job:
1. Read Kira's last message/question
2. Understand what Otto is trying to say in response
3. Craft a clear, natural message that captures Otto's CORE INTENTION

Rules:
- Output ONLY the crafted message text
- Keep it concise and direct
- Match Otto's casual communication style
- If the intent is unclear, output: "UNCLEAR: [your interpretation]. Confirm?"
- Never add greetings or fluff that Otto wouldn't say`;

  const prompt = contextInfo 
    ? `${contextInfo}\nVoice input: "${voiceInput}"\n\nMessage:`
    : `Voice input: "${voiceInput}"\n\nMessage:`;

  try {
    const crafted = await callOllama(prompt, systemPrompt, { 
      maxTokens: 150,
      temperature: 0.5 
    });
    // Clean up response - remove quotes if model added them
    return crafted.trim().replace(/^["']|["']$/g, '');
  } catch (e) {
    console.error('Craft error:', e.message);
    // Fallback: just clean up the voice input
    return voiceInput;
  }
}

/**
 * Process voice command
 */
export async function processVoiceCommand(voiceInput, context = {}) {
  const input = voiceInput.toLowerCase();
  
  // Check for RAG query
  if (input.includes('what do we know about') || input.includes('what did we decide')) {
    const topic = voiceInput.replace(/what do we know about|what did we decide/gi, '').trim();
    const results = queryMemory(topic);
    return {
      type: 'rag_query',
      topic,
      results,
      response: formatRAGResults(results) || 'No information found in memory.'
    };
  }
  
  // Check for web search
  if (input.includes('search for') || input.includes('look up')) {
    const query = voiceInput.replace(/search for|look up/gi, '').trim();
    const results = await webSearch(query);
    return {
      type: 'web_search',
      query,
      results,
      response: results.found ? results.text : 'No results found.'
    };
  }
  
  // Default: craft response
  const ragResults = context.topic ? queryMemory(context.topic) : getRecentContext();
  const crafted = await craftResponse(voiceInput, {
    ...context,
    ragResults,
    recentContext: getRecentContext()
  });
  
  return {
    type: 'crafted_message',
    original: voiceInput,
    crafted,
    response: `Crafted message: "${crafted}"`
  };
}

/**
 * Start interactive voice session
 */
export async function startSession(options = {}) {
  return {
    context: {},
    originalMessage: null,
    
    setOriginalMessage(msg) {
      this.originalMessage = msg;
      // Extract topic for RAG
      this.context.topic = msg.slice(0, 100);
    },
    
    async process(voiceInput) {
      return processVoiceCommand(voiceInput, {
        ...this.context,
        originalMessage: this.originalMessage
      });
    }
  };
}
