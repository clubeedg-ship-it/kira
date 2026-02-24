import { getWorkingMemory } from './working';
import { recall } from './short-term';
import { queryContextForText } from './graph-query';
import { getUserPreferences, getRelevantPatterns } from './procedural';

export interface MemoryContext {
  workingMemory: string;
  shortTermMemory: string;
  relevantKnowledge: string;
  proceduralHints: string;
  totalTokensEstimate: number;
}

const MAX_CHARS = 4000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars - 3) + '...';
}

export async function buildMemoryContext(
  userId: string,
  conversationId: string,
  currentInput: string,
): Promise<MemoryContext> {
  // L1: Working Memory (highest priority)
  let workingMemoryText = '';
  try {
    const wm = await getWorkingMemory(userId, conversationId);
    workingMemoryText = `Active Tasks:\n${wm.activeTasksSummary}\n\nConversation:\n${wm.currentConversationSummary}`;
  } catch {
    workingMemoryText = 'Working memory unavailable.';
  }

  // L3: Knowledge Graph (second priority)
  let relevantKnowledgeText = '';
  try {
    const ctx = await queryContextForText(userId, currentInput);
    const parts: string[] = [];
    if (ctx.entities.length > 0) {
      parts.push('Entities: ' + ctx.entities.map((e) => `${e.name} (${e.type})`).join(', '));
    }
    if (ctx.facts.length > 0) {
      parts.push(
        'Facts:\n' + ctx.facts.map((f) => `- ${f.key}: ${f.value}`).slice(0, 10).join('\n'),
      );
    }
    if (ctx.relations.length > 0) {
      parts.push(`${ctx.relations.length} relationship(s) found.`);
    }
    relevantKnowledgeText = parts.join('\n') || 'No relevant knowledge found.';
  } catch {
    relevantKnowledgeText = 'Knowledge graph unavailable.';
  }

  // L2: Short-Term Memory (third priority)
  let shortTermText = '';
  try {
    const memories = await recall(userId, undefined, 10);
    if (memories.length > 0) {
      shortTermText = memories
        .map((m) => `- [${m.type}] ${m.content.slice(0, 150)}`)
        .join('\n');
    } else {
      shortTermText = 'No recent memories.';
    }
  } catch {
    shortTermText = 'Short-term memory unavailable.';
  }

  // L4: Procedural (lowest priority)
  let proceduralText = '';
  try {
    const prefs = await getUserPreferences(userId);
    const prefEntries = Object.entries(prefs).slice(0, 10);
    if (prefEntries.length > 0) {
      proceduralText = 'Preferences:\n' + prefEntries.map(([k, v]) => `- ${k}: ${v}`).join('\n');
    }

    const patterns = await getRelevantPatterns(userId, currentInput);
    if (patterns.length > 0) {
      proceduralText +=
        '\nPatterns:\n' + patterns.map((p) => `- ${p.intentType}: ${p.template.slice(0, 100)}`).join('\n');
    }

    if (!proceduralText) proceduralText = 'No procedural hints.';
  } catch {
    proceduralText = 'Procedural memory unavailable.';
  }

  // Budget allocation: L1 40%, L3 30%, L2 20%, L4 10%
  workingMemoryText = truncate(workingMemoryText, Math.floor(MAX_CHARS * 0.4));
  relevantKnowledgeText = truncate(relevantKnowledgeText, Math.floor(MAX_CHARS * 0.3));
  shortTermText = truncate(shortTermText, Math.floor(MAX_CHARS * 0.2));
  proceduralText = truncate(proceduralText, Math.floor(MAX_CHARS * 0.1));

  const totalText = workingMemoryText + relevantKnowledgeText + shortTermText + proceduralText;

  return {
    workingMemory: workingMemoryText,
    shortTermMemory: shortTermText,
    relevantKnowledge: relevantKnowledgeText,
    proceduralHints: proceduralText,
    totalTokensEstimate: estimateTokens(totalText),
  };
}
