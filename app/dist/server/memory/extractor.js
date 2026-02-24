/**
 * Heuristic fact/entity extraction — no LLM calls.
 * Designed to run in <5ms on typical messages.
 */
// ── Patterns ──
const NAME_PATTERN = /\b(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/gi;
const PREFERENCE_PATTERN = /\b(?:i (?:prefer|like|love|hate|dislike|want|need|always use|usually))\s+(.{3,80}?)(?:\.|,|!|\?|$)/gi;
const DECISION_PATTERN = /\b(?:(?:i|we) (?:decided|chose|picked|went with|will go with|settled on))\s+(.{3,80}?)(?:\.|,|!|\?|$)/gi;
const DATE_PATTERN = /\b(?:on|by|before|after|due|deadline|scheduled for|meeting on)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\w+ \d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4})/gi;
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const LOCATION_PATTERN = /\b(?:i (?:live|work|am based|am located) (?:in|at|near))\s+(.{3,60}?)(?:\.|,|!|\?|$)/gi;
export function extractFacts(userMessage, assistantMessage) {
    const facts = [];
    const combined = userMessage + ' ' + assistantMessage;
    // Names (from user message only — more reliable)
    for (const match of userMessage.matchAll(NAME_PATTERN)) {
        facts.push({ type: 'name', content: `User's name: ${match[1].trim()}`, importance: 0.9 });
    }
    // Preferences
    for (const match of userMessage.matchAll(PREFERENCE_PATTERN)) {
        facts.push({ type: 'preference', content: match[0].trim(), importance: 0.7 });
    }
    // Decisions
    for (const match of userMessage.matchAll(DECISION_PATTERN)) {
        facts.push({ type: 'decision', content: match[0].trim(), importance: 0.8 });
    }
    // Dates/deadlines
    for (const match of combined.matchAll(DATE_PATTERN)) {
        facts.push({ type: 'date', content: match[0].trim(), importance: 0.6 });
    }
    // Emails
    for (const match of userMessage.matchAll(EMAIL_PATTERN)) {
        facts.push({ type: 'contact', content: `Email: ${match[0]}`, importance: 0.8 });
    }
    // Locations
    for (const match of userMessage.matchAll(LOCATION_PATTERN)) {
        facts.push({ type: 'location', content: match[0].trim(), importance: 0.7 });
    }
    // Deduplicate by content
    const seen = new Set();
    return facts.filter(f => {
        const key = f.content.toLowerCase();
        if (seen.has(key))
            return false;
        seen.add(key);
        return true;
    });
}
//# sourceMappingURL=extractor.js.map