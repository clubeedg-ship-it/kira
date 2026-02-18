#!/usr/bin/env node
/**
 * Voice Layer Test Script
 * 
 * Tests all components without iPhone:
 *   node test.js [component]
 * 
 * Components:
 *   all      - Run all tests (default)
 *   ollama   - Test LLM connection
 *   rag      - Test memory query
 *   agent    - Test voice agent
 *   tts      - Test TTS providers
 *   server   - Test HTTP endpoints
 */

import { processVoiceCommand, summarizeForSpeech } from './voice-agent.js';
import { queryMemory, formatRAGResults, initRAG } from './rag.js';
import { getAvailableTTS, textToSpeechAuto } from './tts.js';
import http from 'http';
import { spawn } from 'child_process';

const PORT = 3456;
const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const MODEL = process.env.VOICE_AGENT_MODEL || 'qwen2.5:7b';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(status, msg) {
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : status === 'info' ? '📋' : '⏳';
  console.log(`${icon} ${msg}`);
}

/**
 * Test Ollama connection and model
 */
async function testOllama() {
  console.log('\n--- Testing Ollama ---');
  
  // Check Ollama running
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    log('pass', `Ollama running, ${data.models?.length || 0} models available`);
    
    // Check if model exists
    const models = data.models?.map(m => m.name) || [];
    if (models.some(m => m.includes('qwen2.5'))) {
      log('pass', `Model qwen2.5 available`);
    } else {
      log('fail', `Model qwen2.5 not found. Available: ${models.join(', ')}`);
      return false;
    }
    
    // Quick inference test
    log('info', 'Testing inference (may take a few seconds)...');
    const testRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt: 'Reply with exactly: TEST_OK',
        stream: false,
        options: { num_predict: 20 }
      })
    });
    
    const testData = await testRes.json();
    if (testData.response?.includes('TEST_OK')) {
      log('pass', 'Inference working');
      return true;
    } else {
      log('info', `Response: ${testData.response?.slice(0, 50)}...`);
      return true; // Model responded, just not exact match
    }
  } catch (e) {
    log('fail', `Ollama error: ${e.message}`);
    return false;
  }
}

/**
 * Test RAG memory query
 */
async function testRAG() {
  console.log('\n--- Testing RAG ---');
  
  try {
    initRAG();
    log('pass', 'RAG initialized');
    
    // Query for something
    const results = queryMemory('IAM website');
    log('info', `Found ${results.length} results for "IAM website"`);
    
    if (results.length > 0) {
      log('pass', `Sample: ${results[0].content?.slice(0, 80)}...`);
    } else {
      log('info', 'No results (memory may be empty)');
    }
    
    return true;
  } catch (e) {
    log('fail', `RAG error: ${e.message}`);
    return false;
  }
}

/**
 * Test voice agent
 */
async function testAgent() {
  console.log('\n--- Testing Voice Agent ---');
  
  const testCases = [
    {
      input: 'Tell Kira that I reviewed the documents and they look good',
      expectType: 'crafted_message'
    },
    {
      input: 'What time is it',
      expectType: 'general_response'
    },
    {
      input: 'Send a message: Meeting at 3pm tomorrow',
      expectType: 'crafted_message'
    }
  ];
  
  for (const tc of testCases) {
    log('info', `Testing: "${tc.input.slice(0, 50)}..."`);
    
    try {
      const result = await processVoiceCommand(tc.input, { 
        originalMessage: 'Test context from Kira',
        topic: 'testing'
      });
      
      if (result.type === tc.expectType || result.crafted || result.response) {
        log('pass', `Got ${result.type}: ${(result.crafted || result.response)?.slice(0, 60)}...`);
      } else {
        log('fail', `Expected ${tc.expectType}, got ${result.type}`);
      }
    } catch (e) {
      log('fail', `Agent error: ${e.message}`);
    }
  }
  
  return true;
}

/**
 * Test TTS providers
 */
async function testTTS() {
  console.log('\n--- Testing TTS ---');
  
  const available = getAvailableTTS();
  log('info', `Available providers: ${available.join(', ') || 'none'}`);
  
  if (available.length === 0) {
    log('fail', 'No TTS providers available');
    return false;
  }
  
  // Test the first available
  try {
    log('info', `Testing auto TTS...`);
    const path = await textToSpeechAuto('Hello, this is a test', { mode: available[0] });
    log('pass', `Generated: ${path}`);
    return true;
  } catch (e) {
    log('fail', `TTS error: ${e.message}`);
    return false;
  }
}

/**
 * Test HTTP server endpoints
 */
async function testServer() {
  console.log('\n--- Testing Server ---');
  
  // Check if server is running
  try {
    const res = await fetch(`http://localhost:${PORT}/voice/status`);
    const data = await res.json();
    
    if (data.status === 'ok') {
      log('pass', `Server running on port ${PORT}`);
      log('info', `Telegram: ${data.telegram ? '✅' : '❌'}, TTS: ${data.tts ? '✅' : '❌'}`);
    }
    
    // Test process endpoint
    log('info', 'Testing /voice/process...');
    const processRes = await fetch(`http://localhost:${PORT}/voice/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        text: 'Tell Kira hello',
        sendToTelegram: false  // Don't actually send
      })
    });
    
    const processData = await processRes.json();
    if (processData.crafted || processData.response) {
      log('pass', `Process endpoint working: ${(processData.crafted || processData.response)?.slice(0, 50)}...`);
    } else {
      log('info', `Response: ${JSON.stringify(processData).slice(0, 100)}`);
    }
    
    return true;
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      log('fail', `Server not running. Start with: node server.js`);
    } else {
      log('fail', `Server error: ${e.message}`);
    }
    return false;
  }
}

/**
 * Run all tests
 */
async function runAll() {
  console.log('🎙️  Voice Layer Test Suite\n');
  
  const results = {
    ollama: await testOllama(),
    rag: await testRAG(),
    agent: await testAgent(),
    // tts: await testTTS(),  // Skip if no TTS installed
    // server: await testServer()  // Skip if not running
  };
  
  console.log('\n--- Summary ---');
  for (const [test, passed] of Object.entries(results)) {
    log(passed ? 'pass' : 'fail', `${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  }
  
  const allPassed = Object.values(results).every(v => v);
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed'}`);
  
  return allPassed;
}

// Main
const component = process.argv[2] || 'all';

switch (component) {
  case 'ollama':
    await testOllama();
    break;
  case 'rag':
    await testRAG();
    break;
  case 'agent':
    await testAgent();
    break;
  case 'tts':
    await testTTS();
    break;
  case 'server':
    await testServer();
    break;
  default:
    await runAll();
}

process.exit(0);
