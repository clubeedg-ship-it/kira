import { eq, and, ilike, desc, sql } from 'drizzle-orm';
import { db } from '../db/index';
import {
  entities,
  facts,
  userPreferences,
  promptLog,
  promptPatterns,
} from '../db/schema';
import { findMatchingPattern, updatePatternScore, createPattern } from './prompt-patterns';

// ── Types ────────────────────────────────────────────────────────────────────

export interface EnhancementResult {
  id: string;
  originalInput: string;
  enhancedPrompt: string;
  stages: {
    referenceResolution: string;
    intentExpansion: string;
    preferences: string[];
    chainOfThought: string[];
  };
  latencyMs: number;
}

interface ConversationMessage {
  role: string;
  content: string;
}

// ── Intent Classification ────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  fix: ['fix', 'bug', 'broken', 'error', 'crash', 'issue', 'wrong', 'fail', 'debug', 'repair'],
  create: ['create', 'build', 'make', 'generate', 'write', 'add', 'new', 'implement', 'design'],
  analyze: ['analyze', 'review', 'audit', 'check', 'inspect', 'evaluate', 'assess', 'compare'],
  explain: ['explain', 'what is', 'how does', 'why', 'describe', 'clarify', 'tell me about'],
  search: ['find', 'search', 'look up', 'where', 'locate', 'show me'],
  refactor: ['refactor', 'improve', 'optimize', 'clean up', 'simplify', 'restructure'],
  test: ['test', 'verify', 'validate', 'check if', 'assert', 'ensure'],
  summarize: ['summarize', 'summary', 'tldr', 'overview', 'recap', 'brief'],
};

const COT_SCAFFOLDS: Record<string, string[]> = {
  fix: [
    '1. Identify the specific issue from the description and context',
    '2. Analyze the root cause',
    '3. Implement the fix',
    '4. Verify the fix resolves the issue without side effects',
  ],
  create: [
    '1. Understand the requirements and constraints',
    '2. Design the approach/structure',
    '3. Implement step by step',
    '4. Review for completeness and quality',
  ],
  analyze: [
    '1. Gather the relevant information',
    '2. Identify patterns, issues, or insights',
    '3. Assess impact and implications',
    '4. Provide actionable recommendations',
  ],
  explain: [
    '1. Start with a high-level overview',
    '2. Break down key concepts',
    '3. Provide concrete examples',
    '4. Summarize the key takeaways',
  ],
  search: [
    '1. Clarify what we are looking for',
    '2. Search relevant sources',
    '3. Present findings with context',
  ],
  refactor: [
    '1. Understand the current implementation',
    '2. Identify what to improve and why',
    '3. Refactor incrementally',
    '4. Verify behavior is preserved',
  ],
  test: [
    '1. Identify what needs to be tested',
    '2. Define test cases and edge cases',
    '3. Write/run the tests',
    '4. Report results',
  ],
  summarize: [
    '1. Read and understand the full content',
    '2. Identify the key points',
    '3. Produce a concise summary',
  ],
};

// ── Stage 1: Reference Resolution ────────────────────────────────────────────

async function resolveReferences(
  userId: string,
  input: string,
  history: ConversationMessage[],
): Promise<{ resolved: string; description: string }> {
  try {
    // Extract potential entity references from input
    const words = input.toLowerCase().split(/\s+/);
    const resolvedEntities: string[] = [];

    // Query knowledge graph for mentioned entities
    const userEntities = await db
      .select({ name: entities.name, type: entities.type })
      .from(entities)
      .where(eq(entities.userId, userId))
      .limit(100);

    const matched: string[] = [];
    for (const entity of userEntities) {
      const entityLower = entity.name.toLowerCase();
      if (input.toLowerCase().includes(entityLower)) {
        matched.push(`${entity.name} (${entity.type})`);
      }
    }

    // Resolve vague references using conversation history
    const vagueRefs = ['it', 'this', 'that', 'the thing', 'them', 'those', 'these'];
    const hasVagueRef = vagueRefs.some((ref) => {
      const pattern = new RegExp(`\\b${ref}\\b`, 'i');
      return pattern.test(input);
    });

    let contextFromHistory = '';
    if (hasVagueRef && history.length > 0) {
      const recent = history.slice(-5);
      const recentContent = recent.map((m) => m.content).join(' ');
      // Get nouns/topics from recent messages (simple heuristic)
      contextFromHistory = recentContent.slice(0, 500);
    }

    // Query facts for additional context
    if (matched.length > 0) {
      const entityNames = matched.map((m) => m.split(' (')[0]);
      for (const eName of entityNames.slice(0, 3)) {
        const entityRows = await db
          .select({ id: entities.id })
          .from(entities)
          .where(and(eq(entities.userId, userId), eq(entities.name, eName)))
          .limit(1);

        if (entityRows.length > 0) {
          const entityFacts = await db
            .select({ key: facts.key, value: facts.value })
            .from(facts)
            .where(and(eq(facts.userId, userId), eq(facts.entityId, entityRows[0].id)))
            .limit(5);

          for (const f of entityFacts) {
            resolvedEntities.push(`${eName}: ${f.key} = ${f.value}`);
          }
        }
      }
    }

    const parts: string[] = [];
    if (matched.length > 0) parts.push(`Entities: ${matched.join(', ')}`);
    if (resolvedEntities.length > 0) parts.push(`Facts: ${resolvedEntities.join('; ')}`);
    if (contextFromHistory) parts.push(`Recent context available`);

    const description = parts.length > 0 ? parts.join('. ') : 'No references resolved';

    return { resolved: input, description };
  } catch {
    return { resolved: input, description: 'Reference resolution skipped (error)' };
  }
}

// ── Stage 2: Intent Classification ───────────────────────────────────────────

function classifyIntent(input: string): { intent: string; confidence: number } {
  const lower = input.toLowerCase();
  let bestIntent = 'general';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Bonus for appearing at the start (likely the verb/command)
        score += lower.indexOf(kw) < 10 ? 2 : 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return { intent: bestIntent, confidence: bestScore > 0 ? Math.min(bestScore / 3, 1) : 0 };
}

// ── Stage 3: User Preferences ────────────────────────────────────────────────

async function getUserPreferences(userId: string): Promise<{ key: string; value: string }[]> {
  try {
    const prefs = await db
      .select({ key: userPreferences.key, value: userPreferences.value })
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, userId)))
      .orderBy(desc(userPreferences.confidence))
      .limit(10);

    return prefs;
  } catch {
    return [];
  }
}

// ── Stage 4: Chain-of-Thought ────────────────────────────────────────────────

function getChainOfThought(intent: string): string[] {
  return COT_SCAFFOLDS[intent] || [
    '1. Understand the request',
    '2. Think through the approach',
    '3. Provide a thorough response',
  ];
}

// ── Stage 5: Structured Output ───────────────────────────────────────────────

function buildStructuredPrompt(
  input: string,
  intent: string,
  resolvedContext: string,
  prefs: { key: string; value: string }[],
  cot: string[],
  history: ConversationMessage[],
): string {
  const sections: string[] = [];

  // Context from knowledge graph
  if (resolvedContext && resolvedContext !== 'No references resolved') {
    sections.push(`## Context\n${resolvedContext}`);
  }

  // Conversation context (last 3 messages for continuity)
  if (history.length > 0) {
    const recent = history.slice(-3);
    const historyStr = recent
      .map((m) => `${m.role}: ${m.content.slice(0, 200)}`)
      .join('\n');
    sections.push(`## Conversation Context\n${historyStr}`);
  }

  // The task itself
  sections.push(`## Task\n${input}`);

  // User preferences as constraints
  if (prefs.length > 0) {
    const prefStr = prefs.map((p) => `- ${p.key}: ${p.value}`).join('\n');
    sections.push(`## User Preferences\n${prefStr}`);
  }

  // Chain of thought
  if (cot.length > 0) {
    sections.push(`## Approach\n${cot.join('\n')}`);
  }

  return sections.join('\n\n');
}

// ── LLM-assisted resolution (for ambiguous inputs) ──────────────────────────

async function llmResolve(
  input: string,
  history: ConversationMessage[],
  apiKey: string,
  model?: string,
): Promise<{ resolvedInput: string; intent: string } | null> {
  const targetModel = model || 'openai/gpt-4.1-nano';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const recentHistory = history.slice(-5).map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: targetModel,
        messages: [
          {
            role: 'system',
            content:
              'Given user input and conversation context, resolve references and classify intent. Return JSON: {"resolvedInput": "...", "intent": "fix|create|analyze|explain|search|refactor|test|summarize|general"}',
          },
          {
            role: 'user',
            content: `Input: "${input}"\n\nRecent conversation:\n${recentHistory || 'None'}`,
          },
        ],
        max_tokens: 200,
        temperature: 0,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) return null;

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      resolvedInput: parsed.resolvedInput || input,
      intent: parsed.intent || 'general',
    };
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ── Main Enhancement Function ────────────────────────────────────────────────

export async function enhancePrompt(
  userId: string,
  rawInput: string,
  conversationHistory: ConversationMessage[],
  apiKey: string,
  model?: string,
): Promise<EnhancementResult> {
  const start = Date.now();

  try {
    // Check for existing pattern match first
    const pattern = await findMatchingPattern(userId, rawInput);
    if (pattern && pattern.score > 0.7) {
      // Use the proven template
      const enhanced = pattern.template.replace('{{input}}', rawInput);
      const logId = await logEnhancement(userId, rawInput, enhanced, Date.now() - start);
      return {
        id: logId,
        originalInput: rawInput,
        enhancedPrompt: enhanced,
        stages: {
          referenceResolution: 'Pattern match used',
          intentExpansion: pattern.intentType || 'pattern',
          preferences: [],
          chainOfThought: [],
        },
        latencyMs: Date.now() - start,
      };
    }

    // Stage 1: Reference Resolution
    const { resolved, description: refDesc } = await resolveReferences(
      userId,
      rawInput,
      conversationHistory,
    );

    // Stage 2: Intent Classification (keyword-based first)
    let { intent, confidence } = classifyIntent(rawInput);

    // If confidence is low and we have an API key, try LLM
    if (confidence < 0.3 && apiKey) {
      const llmResult = await llmResolve(rawInput, conversationHistory, apiKey, model);
      if (llmResult) {
        intent = llmResult.intent;
      }
    }

    // Stage 3: User Preferences
    const prefs = await getUserPreferences(userId);
    const prefDescriptions = prefs.map((p) => `${p.key}: ${p.value}`);

    // Stage 4: Chain-of-Thought
    const cot = getChainOfThought(intent);

    // Stage 5: Structured Output
    const enhancedPrompt = buildStructuredPrompt(
      resolved,
      intent,
      refDesc,
      prefs,
      cot,
      conversationHistory,
    );

    const latencyMs = Date.now() - start;

    // Log the enhancement
    const logId = await logEnhancement(userId, rawInput, enhancedPrompt, latencyMs);

    return {
      id: logId,
      originalInput: rawInput,
      enhancedPrompt,
      stages: {
        referenceResolution: refDesc,
        intentExpansion: intent,
        preferences: prefDescriptions,
        chainOfThought: cot,
      },
      latencyMs,
    };
  } catch {
    // Never block — fall through to raw input
    const latencyMs = Date.now() - start;
    const logId = await logEnhancement(userId, rawInput, rawInput, latencyMs).catch(() => 'error');
    return {
      id: logId,
      originalInput: rawInput,
      enhancedPrompt: rawInput,
      stages: {
        referenceResolution: 'Skipped (error)',
        intentExpansion: 'general',
        preferences: [],
        chainOfThought: [],
      },
      latencyMs,
    };
  }
}

// ── Stage 6: Scoring ─────────────────────────────────────────────────────────

export async function scorePrompt(
  logId: string,
  outcome: 'accepted' | 'edited' | 'reprompted' | 'rejected',
  feedback?: string,
): Promise<void> {
  try {
    await db
      .update(promptLog)
      .set({
        outcome,
        feedback: feedback || null,
      })
      .where(eq(promptLog.id, logId));

    // Update pattern scores based on outcome
    const logEntry = await db
      .select()
      .from(promptLog)
      .where(eq(promptLog.id, logId))
      .limit(1);

    if (logEntry.length > 0) {
      const entry = logEntry[0];
      const success = outcome === 'accepted' || outcome === 'edited';

      // Find matching patterns and update their scores
      const matchingPattern = await findMatchingPattern(entry.userId, entry.rawInput);
      if (matchingPattern) {
        await updatePatternScore(matchingPattern.id, success);
      }

      // If successful and no pattern exists, create one
      if (success && !matchingPattern) {
        const { intent } = classifyIntent(entry.rawInput);
        await createPattern(entry.userId, intent, entry.rawInput, entry.enhancedPrompt);
      }
    }
  } catch {
    // Scoring is best-effort, never throw
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function logEnhancement(
  userId: string,
  rawInput: string,
  enhancedPrompt: string,
  latencyMs: number,
): Promise<string> {
  const [row] = await db
    .insert(promptLog)
    .values({
      userId,
      rawInput,
      enhancedPrompt,
      latencyMs,
    })
    .returning({ id: promptLog.id });

  return row.id;
}
