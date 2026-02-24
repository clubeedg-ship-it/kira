import { eq, and } from 'drizzle-orm';
import { db } from '../db/index';
import { conversations, messages, entities, extractedSuggestions } from '../db/schema';
import { extractFromText, mergeExtractions } from './nlp-extract';
import { storeExtractions } from './nlp-store';
/**
 * Post-process assistant messages after they're stored.
 * Fire-and-forget — never block the chat response.
 */
export async function postProcessMessage(userId, conversationId, content, userContent) {
    await Promise.allSettled([
        autoTitle(userId, conversationId),
        extractTasks(userId, conversationId, content),
        extractEntities(userId, conversationId, content),
        nlpExtractAndStore(userId, content, userContent),
    ]);
}
/**
 * NLP extraction: extract entities, facts, relations from both user and assistant
 * messages, merge, and store to the knowledge graph.
 */
async function nlpExtractAndStore(userId, assistantContent, userContent) {
    const assistantResult = extractFromText(assistantContent);
    const userResult = userContent ? extractFromText(userContent) : { entities: [], facts: [], relations: [] };
    const merged = mergeExtractions(assistantResult, userResult);
    if (merged.entities.length || merged.facts.length || merged.relations.length) {
        await storeExtractions(userId, merged);
    }
}
/**
 * Auto-title: If the conversation title is still "New conversation",
 * generate a short title from the first user message (heuristic, no LLM).
 */
async function autoTitle(userId, conversationId) {
    // Check if title is still default
    const [conv] = await db
        .select({ title: conversations.title })
        .from(conversations)
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
        .limit(1);
    const defaultTitles = ['New conversation', 'New Chat'];
    if (!conv || !defaultTitles.includes(conv.title))
        return;
    // Get first user message
    const [firstMsg] = await db
        .select({ content: messages.content })
        .from(messages)
        .where(and(eq(messages.conversationId, conversationId), eq(messages.role, 'user')))
        .orderBy(messages.createdAt)
        .limit(1);
    if (!firstMsg?.content)
        return;
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
    if (!title)
        return;
    await db
        .update(conversations)
        .set({ title })
        .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));
}
/**
 * Extract task-like patterns from assistant message.
 */
async function extractTasks(userId, conversationId, content) {
    const taskPatterns = [
        /Created task[:\s]+["']?(.+?)["']?\s*$/gim,
        /(?:TODO|TASK|Action item)[:\s]+(.+?)$/gim,
        /(?:You should|I recommend|I suggest|Consider)\s+(.{10,80}?)(?:\.|$)/gim,
    ];
    const extracted = new Set();
    for (const pattern of taskPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const task = match[1].trim();
            if (task.length >= 5 && task.length <= 200) {
                extracted.add(task);
            }
        }
    }
    if (extracted.size === 0)
        return;
    const values = Array.from(extracted).map((task) => ({
        userId,
        conversationId,
        type: 'task',
        content: task,
        metadata: { source: 'auto-extract' },
        status: 'pending',
    }));
    await db.insert(extractedSuggestions).values(values);
}
/**
 * Extract entities (capitalized multi-word phrases) from assistant message.
 */
async function extractEntities(userId, conversationId, content) {
    // Match capitalized multi-word phrases (2-4 words, likely names/companies)
    const entityPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g;
    // Common false positives to skip
    const skipList = new Set([
        'New York', 'United States', 'The End', 'Thank You',
        'Good Morning', 'Good Evening', 'Good Night', 'No Problem',
        'Of Course', 'For Example', 'In Addition', 'On The',
        'Created Task', 'Action Item',
    ]);
    const extracted = new Set();
    let match;
    while ((match = entityPattern.exec(content)) !== null) {
        const entity = match[1].trim();
        if (!skipList.has(entity) && entity.length >= 4) {
            extracted.add(entity);
        }
    }
    if (extracted.size === 0)
        return;
    for (const name of extracted) {
        // Check if entity already exists for this user
        const [existing] = await db
            .select({ id: entities.id })
            .from(entities)
            .where(and(eq(entities.userId, userId), eq(entities.name, name)))
            .limit(1);
        if (!existing) {
            // Insert into knowledge graph
            await db.insert(entities).values({
                userId,
                type: 'auto-extracted',
                name,
                properties: { source: 'chat', conversationId },
            });
        }
        // Also store as suggestion
        await db.insert(extractedSuggestions).values({
            userId,
            conversationId,
            type: 'entity',
            content: name,
            metadata: { source: 'auto-extract' },
            status: 'pending',
        });
    }
}
//# sourceMappingURL=chat-postprocess.js.map