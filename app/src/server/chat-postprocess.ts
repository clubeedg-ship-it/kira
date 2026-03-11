import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index';
import { conversations, messages } from '../db/schema';
import { addToMemory } from './memory/mem0-service';
import { extractTasksLLM } from './task-extractor';

/**
 * Post-process assistant messages after they're stored.
 * Fire-and-forget — never block the chat response.
 *
 * Uses Mem0 for intelligent memory extraction (replaces heuristic NLP).
 * Uses Kimi K2.5 for LLM-powered task extraction.
 */
export async function postProcessMessage(
  userId: string,
  conversationId: string,
  content: string,
  userContent?: string,
): Promise<void> {
  await Promise.allSettled([
    autoTitle(userId, conversationId),
    extractTasksLLM(userId, conversationId, content, userContent),
    mem0Extract(userId, conversationId, content, userContent),
  ]);
}

/**
 * Mem0 extraction: send the conversation turn to Mem0 for intelligent
 * entity/fact/relation extraction, deduplication, and storage.
 * Replaces the old heuristic nlpExtractAndStore.
 */
async function mem0Extract(
  userId: string,
  conversationId: string,
  assistantContent: string,
  userContent?: string,
): Promise<void> {
  const msgs: Array<{ role: string; content: string }> = [];
  if (userContent) msgs.push({ role: 'user', content: userContent });
  msgs.push({ role: 'assistant', content: assistantContent });

  if (msgs.length === 0) return;

  await addToMemory(msgs, {
    userId,
    agentId: 'kira',
    sessionId: conversationId,
    metadata: { conversationId, source: 'chat' },
  });
}

/**
 * Auto-title: If the conversation title is still "New conversation",
 * generate a short title from the first user message (heuristic, no LLM).
 */
async function autoTitle(userId: string, conversationId: string): Promise<void> {
  // Check if title is still default
  const [conv] = await db
    .select({ title: conversations.title })
    .from(conversations)
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
    .limit(1);

  const defaultTitles = ['New conversation', 'New Chat'];
  if (!conv || !defaultTitles.includes(conv.title)) return;

  // Get first user message
  const [firstMsg] = await db
    .select({ content: messages.content })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.role, 'user')))
    .orderBy(messages.createdAt)
    .limit(1);

  if (!firstMsg?.content) return;

  // Take first sentence, truncate to 40 chars
  let title = firstMsg.content
    .replace(/\n+/g, ' ')
    .trim()
    .split(/[.!?]/)[0]
    .trim();

  if (title.length > 40) {
    title = title.substring(0, 37) + '...';
  }

  // Cap at 6 words
  const words = title.split(/\s+/);
  if (words.length > 6) {
    title = words.slice(0, 6).join(' ') + '...';
  }

  if (!title) return;

  await db
    .update(conversations)
    .set({ title })
    .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
}

// Old extractTasks (regex) and extractEntities removed — replaced by:
// - extractTasksLLM (GPT-4.1-nano, ~3s, accurate)
// - Mem0 (handles entity/fact extraction automatically)
