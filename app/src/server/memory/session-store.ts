/**
 * Working memory: in-memory per-session store.
 * Promotes important items to short-term (DB) asynchronously.
 */

import { remember } from './short-term';
import { ExtractedFact } from './extractor';

interface SessionEntry {
  fact: ExtractedFact;
  timestamp: number;
}

// conversationId → entries
const sessions = new Map<string, SessionEntry[]>();

const MAX_PER_SESSION = 50;
const PROMOTE_THRESHOLD = 0.7;

export function storeInWorking(conversationId: string, facts: ExtractedFact[]): void {
  if (facts.length === 0) return;
  let entries = sessions.get(conversationId);
  if (!entries) {
    entries = [];
    sessions.set(conversationId, entries);
  }
  const now = Date.now();
  for (const f of facts) {
    entries.push({ fact: f, timestamp: now });
  }
  // Evict oldest if over limit
  if (entries.length > MAX_PER_SESSION) {
    sessions.set(conversationId, entries.slice(-MAX_PER_SESSION));
  }
}

/**
 * Promote important working memory items to short-term DB.
 * Fire-and-forget — never blocks.
 */
export async function promoteToShortTerm(
  userId: string,
  conversationId: string,
  facts: ExtractedFact[],
): Promise<void> {
  for (const f of facts) {
    if (f.importance >= PROMOTE_THRESHOLD) {
      await remember(userId, f.type, f.content, conversationId, f.importance);
    }
  }
}

export function getWorkingFacts(conversationId: string): ExtractedFact[] {
  return (sessions.get(conversationId) || []).map(e => e.fact);
}

export function clearSession(conversationId: string): void {
  sessions.delete(conversationId);
}
