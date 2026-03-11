/**
 * Mem0 Memory Service — SOTA memory layer for Kira
 *
 * Replaces: nlp-extract.ts (extraction), nlp-store.ts (storage),
 * graph-query.ts (retrieval), parts of context-builder.ts
 *
 * Keeps: episodic memory, reflection, procedural, blackboard (our differentiators)
 */

// @ts-expect-error mem0ai/oss types
import { Memory } from 'mem0ai/oss';

export interface Mem0SearchResult {
  id: string;
  memory: string;
  score?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Mem0AddResult {
  results: Mem0SearchResult[];
  relations?: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

// ── Singleton ────────────────────────────────────────────────────────────────

let memoryInstance: InstanceType<typeof Memory> | null = null;

function getMemory(): InstanceType<typeof Memory> {
  if (memoryInstance) return memoryInstance;

  const openrouterKey = process.env.OPENROUTER_API_KEY || '';
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';

  memoryInstance = new Memory({
    // Use OpenRouter for LLM extraction (cheap, good quality)
    llm: {
      provider: 'openai',
      config: {
        apiKey: openrouterKey,
        model: 'moonshotai/kimi-k2.5',
        baseURL: 'https://openrouter.ai/api/v1',
      },
    },
    // Use local Ollama for embeddings (free, fast)
    embedder: {
      provider: 'ollama',
      config: {
        model: 'nomic-embed-text',
        url: ollamaUrl,
      },
    },
    // Use built-in vector store (no external DB needed)
    vectorStore: {
      provider: 'memory',
      config: {
        collectionName: 'kira_memories',
        dimension: 768, // nomic-embed-text dimension
      },
    },
    // History in SQLite
    historyStore: {
      provider: 'sqlite',
      config: {
        historyDbPath: process.env.MEM0_DB_PATH || '/home/adminuser/kira/app/mem0-history.db',
      },
    },
    // Custom extraction prompt for better quality
    customPrompt: `You are a memory extraction expert for a CEO's AI assistant.
Extract ONLY important, actionable information from the conversation.

Focus on:
- Decisions made ("we decided to...", "let's go with...")
- Preferences expressed ("I prefer...", "don't do...")
- Facts about people, companies, projects (names, roles, relationships)
- Deadlines and commitments ("by Friday", "next week")
- Problems and blockers mentioned
- Financial figures (revenue, costs, targets)
- Strategic insights and plans

SKIP trivial content like:
- Greetings, small talk
- Acknowledgments ("ok", "thanks", "got it")
- Technical implementation details (unless they represent a decision)
- Repeated information already in memory

Return memories as concise, factual statements.`,
  });

  console.log('[mem0] Memory service initialized (Kimi K2.5 + nomic-embed-text)');
  return memoryInstance;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Add messages to memory. Call after each conversation turn.
 * Mem0 handles: extraction, deduplication, conflict resolution, storage.
 */
export async function addToMemory(
  messages: Array<{ role: string; content: string }>,
  opts: {
    userId: string;
    agentId?: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<Mem0AddResult | null> {
  try {
    const mem = getMemory();
    const result = await mem.add(messages, {
      userId: opts.userId,
      agentId: opts.agentId || 'kira',
      runId: opts.sessionId,
      metadata: opts.metadata,
    });
    return result as Mem0AddResult;
  } catch (err) {
    console.error('[mem0] Failed to add memory:', err);
    return null;
  }
}

/**
 * Search memories relevant to a query.
 * Returns ranked results with scores.
 */
export async function searchMemory(
  query: string,
  opts: {
    userId: string;
    agentId?: string;
    limit?: number;
  },
): Promise<Mem0SearchResult[]> {
  try {
    const mem = getMemory();
    const result = await mem.search(query, {
      userId: opts.userId,
      agentId: opts.agentId || 'kira',
      limit: opts.limit || 10,
    });
    return (result?.results || []) as Mem0SearchResult[];
  } catch (err) {
    console.error('[mem0] Failed to search memory:', err);
    return [];
  }
}

/**
 * Get all memories for a user (for memory browser UI).
 */
export async function getAllMemories(
  userId: string,
  agentId?: string,
): Promise<Mem0SearchResult[]> {
  try {
    const mem = getMemory();
    const result = await mem.getAll({
      userId,
      agentId: agentId || 'kira',
    });
    return (result?.results || []) as Mem0SearchResult[];
  } catch (err) {
    console.error('[mem0] Failed to get all memories:', err);
    return [];
  }
}

/**
 * Get a specific memory by ID.
 */
export async function getMemoryById(
  memoryId: string,
): Promise<Mem0SearchResult | null> {
  try {
    const mem = getMemory();
    return (await mem.get(memoryId)) as Mem0SearchResult | null;
  } catch (err) {
    console.error('[mem0] Failed to get memory:', err);
    return null;
  }
}

/**
 * Delete a specific memory.
 */
export async function deleteMemory(memoryId: string): Promise<boolean> {
  try {
    const mem = getMemory();
    await mem.delete(memoryId);
    return true;
  } catch (err) {
    console.error('[mem0] Failed to delete memory:', err);
    return false;
  }
}

/**
 * Get memory history for a specific memory ID.
 */
export async function getMemoryHistory(
  memoryId: string,
): Promise<unknown[]> {
  try {
    const mem = getMemory();
    return (await mem.history(memoryId)) || [];
  } catch (err) {
    console.error('[mem0] Failed to get memory history:', err);
    return [];
  }
}

/**
 * Build context string from relevant memories for injection into prompts.
 * This replaces context-builder.ts's knowledge graph portion.
 */
export async function buildMem0Context(
  query: string,
  userId: string,
  opts?: {
    agentId?: string;
    maxChars?: number;
    limit?: number;
  },
): Promise<string> {
  const maxChars = opts?.maxChars || 3000;
  const memories = await searchMemory(query, {
    userId,
    agentId: opts?.agentId,
    limit: opts?.limit || 15,
  });

  if (memories.length === 0) return '';

  let context = 'Relevant memories:\n';
  let charCount = context.length;

  for (const mem of memories) {
    const line = `- ${mem.memory}\n`;
    if (charCount + line.length > maxChars) break;
    context += line;
    charCount += line.length;
  }

  return context;
}
