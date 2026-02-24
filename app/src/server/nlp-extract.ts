/**
 * Lightweight NLP extraction — heuristic + regex, no external dependencies.
 * Designed for <10ms on typical chat messages.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExtractedEntity {
  name: string;
  type: 'person' | 'company' | 'project' | 'tool' | 'concept' | 'date' | 'money' | 'unknown';
  confidence: number;
}

export interface ExtractedFact {
  subject: string;
  key: string;
  value: string;
  confidence: number;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
  confidence: number;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  facts: ExtractedFact[];
  relations: ExtractedRelation[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_TEXT_LENGTH = 5000;

const FALSE_POSITIVE_PHRASES = new Set([
  'let me', 'i think', 'here is', 'there is', 'it is', 'this is',
  'that is', 'how to', 'what is', 'who is', 'can you', 'would you',
  'could you', 'should you', 'will you', 'do you', 'are you',
  'thank you', 'of course', 'for example', 'in addition', 'on the',
  'the end', 'no problem', 'good morning', 'good evening', 'good night',
  'new york', 'united states', 'action item', 'created task',
  'i am', 'i have', 'i was', 'we are', 'we have', 'they are',
  'you are', 'he is', 'she is', 'it was', 'here are', 'there are',
]);

const COMMON_SENTENCE_STARTERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'my', 'your',
  'his', 'her', 'its', 'our', 'their', 'some', 'any', 'each', 'every',
  'all', 'both', 'few', 'more', 'most', 'other', 'such', 'no', 'not',
  'only', 'same', 'so', 'than', 'too', 'very', 'just', 'because',
  'but', 'and', 'or', 'if', 'when', 'while', 'after', 'before',
  'however', 'also', 'then', 'first', 'next', 'finally', 'sure',
  'yes', 'no', 'ok', 'okay', 'well', 'now', 'here', 'there',
  'please', 'thanks', 'sorry', 'maybe', 'perhaps', 'actually',
  'basically', 'currently', 'generally', 'specifically', 'unfortunately',
]);

const KEYWORD_TO_TYPE: Record<string, ExtractedEntity['type']> = {
  project: 'project',
  company: 'company',
  person: 'person',
  tool: 'tool',
  using: 'tool',
  framework: 'tool',
  library: 'tool',
  platform: 'tool',
  app: 'tool',
  application: 'tool',
  service: 'tool',
  organization: 'company',
  org: 'company',
  team: 'company',
};

// ─── Entity Extraction ──────────────────────────────────────────────────────

function extractEntities(text: string): ExtractedEntity[] {
  const entities: Map<string, ExtractedEntity> = new Map();

  const add = (name: string, type: ExtractedEntity['type'], confidence: number) => {
    const key = name.toLowerCase();
    const existing = entities.get(key);
    if (!existing || existing.confidence < confidence) {
      entities.set(key, { name, type, confidence });
    }
  };

  // 1. Capitalized multi-word phrases (2-4 words)
  const capitalizedPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3})\b/g;
  let m: RegExpExecArray | null;
  while ((m = capitalizedPattern.exec(text)) !== null) {
    const phrase = m[1].trim();
    const lower = phrase.toLowerCase();
    if (FALSE_POSITIVE_PHRASES.has(lower)) continue;

    // Check if it's at the start of a sentence
    const before = text.substring(Math.max(0, m.index - 2), m.index);
    const atSentenceStart = m.index === 0 || /[.!?\n]\s*$/.test(before);

    // Single capitalized word at sentence start is likely just grammar
    const words = phrase.split(/\s+/);
    if (atSentenceStart && words.length <= 1) continue;

    // Even multi-word at sentence start, lower confidence
    const conf = atSentenceStart ? 0.5 : 0.7;

    // Guess type from word count and patterns
    let type: ExtractedEntity['type'] = 'unknown';
    if (words.length === 2 && /^[A-Z][a-z]+$/.test(words[0]) && /^[A-Z][a-z]+$/.test(words[1])) {
      type = 'person'; // "Otto Schmidt" pattern
    }

    add(phrase, type, conf);
  }

  // 2. Single capitalized words that look like proper nouns (not at sentence start)
  const singleCapPattern = /(?<=[.!?\n]\s+\S+\s+|,\s+|;\s+|\band\s+|\bor\s+|\bwith\s+|\bfor\s+|\bat\s+|\bby\s+)([A-Z][a-zA-Z]{2,})\b/g;
  while ((m = singleCapPattern.exec(text)) !== null) {
    const word = m[1];
    if (COMMON_SENTENCE_STARTERS.has(word.toLowerCase())) continue;
    add(word, 'unknown', 0.4);
  }

  // 3. Emails
  const emailPattern = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  while ((m = emailPattern.exec(text)) !== null) {
    add(m[1], 'person', 0.9);
  }

  // 4. URLs
  const urlPattern = /https?:\/\/[^\s<>)"']+/g;
  while ((m = urlPattern.exec(text)) !== null) {
    add(m[0], 'tool', 0.6);
  }

  // 5. Dates
  const datePatterns = [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?)\b/gi,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)\b/gi,
  ];
  for (const pat of datePatterns) {
    while ((m = pat.exec(text)) !== null) {
      add(m[1], 'date', 0.9);
    }
  }

  // 6. Money amounts
  const moneyPattern = /(?:\$|€|£|¥)\s*[\d,]+(?:\.\d{1,2})?(?:\s*(?:k|m|b|million|billion|thousand))?|\b[\d,]+(?:\.\d{1,2})?\s*(?:USD|EUR|GBP|BRL|dollars?|euros?|pounds?|reais?)\b/gi;
  while ((m = moneyPattern.exec(text)) !== null) {
    add(m[0].trim(), 'money', 0.9);
  }

  // 7. Percentages
  const pctPattern = /\b(\d+(?:\.\d+)?%)\b/g;
  while ((m = pctPattern.exec(text)) !== null) {
    add(m[1], 'concept', 0.8);
  }

  // 8. @mentions and #hashtags
  const mentionPattern = /@([a-zA-Z0-9_]+)/g;
  while ((m = mentionPattern.exec(text)) !== null) {
    add('@' + m[1], 'person', 0.8);
  }
  const hashtagPattern = /#([a-zA-Z0-9_]+)/g;
  while ((m = hashtagPattern.exec(text)) !== null) {
    add('#' + m[1], 'concept', 0.7);
  }

  // 9. Words after keywords: "project X", "company Y", etc.
  for (const [keyword, type] of Object.entries(KEYWORD_TO_TYPE)) {
    const kwPattern = new RegExp(`\\b${keyword}\\s+([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)`, 'gi');
    while ((m = kwPattern.exec(text)) !== null) {
      const val = m[1].trim();
      if (val.length >= 2 && !FALSE_POSITIVE_PHRASES.has(val.toLowerCase())) {
        add(val, type, 0.8);
      }
    }
  }

  return Array.from(entities.values());
}

// ─── Fact Extraction ─────────────────────────────────────────────────────────

function extractFacts(text: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  const seen = new Set<string>();

  const addFact = (subject: string, key: string, value: string, confidence: number) => {
    subject = subject.trim();
    value = value.trim().replace(/[.!?,;:]+$/, '').trim();
    if (!subject || !value || value.length < 2 || value.length > 200) return;
    const dedup = `${subject.toLowerCase()}|${key}|${value.toLowerCase()}`;
    if (seen.has(dedup)) return;
    seen.add(dedup);
    facts.push({ subject, key, value, confidence });
  };

  // "X is Y" — but filter out common non-fact patterns
  const isPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+is\s+(?:a\s+|an\s+|the\s+)?(.{3,80}?)(?:\.|,|\band\b|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = isPattern.exec(text)) !== null) {
    const subj = m[1].trim();
    if (FALSE_POSITIVE_PHRASES.has(subj.toLowerCase())) continue;
    if (COMMON_SENTENCE_STARTERS.has(subj.toLowerCase())) continue;
    addFact(subj, 'is', m[2], 0.6);
  }

  // "X uses Y"
  const usesPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+uses?\s+(.{3,80}?)(?:\.|,|$)/gi;
  while ((m = usesPattern.exec(text)) !== null) {
    addFact(m[1].trim(), 'uses', m[2], 0.7);
  }

  // "X costs Y" / "X is worth Y"
  const costPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:costs?|is\s+worth)\s+(.{3,60}?)(?:\.|,|$)/gi;
  while ((m = costPattern.exec(text)) !== null) {
    addFact(m[1].trim(), 'cost', m[2], 0.8);
  }

  // "X prefers Y"
  const prefPattern = /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+prefers?\s+(.{3,80}?)(?:\.|,|$)/gi;
  while ((m = prefPattern.exec(text)) !== null) {
    addFact(m[1].trim(), 'preference', m[2], 0.7);
  }

  // "deadline is Y" / "due by Y"
  const deadlinePattern = /\b(?:deadline\s+is|due\s+(?:by|on|at))\s+(.{3,60}?)(?:\.|,|$)/gi;
  while ((m = deadlinePattern.exec(text)) !== null) {
    addFact('context', 'deadline', m[1], 0.8);
  }

  // Task creation: "Created task: X" / "Task X created"
  const taskPattern = /(?:created?\s+task[:\s]+["']?(.+?)["']?(?:\.|$)|task\s+["']?(.+?)["']?\s+(?:was\s+)?created)/gi;
  while ((m = taskPattern.exec(text)) !== null) {
    const taskName = (m[1] || m[2]).trim();
    if (taskName.length >= 3) {
      addFact(taskName, 'status', 'created', 0.9);
    }
  }

  return facts;
}

// ─── Relation Extraction ─────────────────────────────────────────────────────

function extractRelations(text: string): ExtractedRelation[] {
  const relations: ExtractedRelation[] = [];
  const seen = new Set<string>();

  const addRel = (source: string, target: string, type: string, confidence: number) => {
    source = source.trim();
    target = target.trim().replace(/[.!?,;:]+$/, '').trim();
    if (!source || !target || target.length < 2) return;
    const dedup = `${source.toLowerCase()}|${type}|${target.toLowerCase()}`;
    if (seen.has(dedup)) return;
    seen.add(dedup);
    relations.push({ source, target, type, confidence });
  };

  const cap = `([A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)*)`;

  const patterns: [RegExp, string, number][] = [
    [new RegExp(`\\b${cap}\\s+works?\\s+(?:at|for)\\s+${cap}`, 'gi'), 'works_at', 0.8],
    [new RegExp(`\\b${cap}\\s+(?:created|built|made|developed)\\s+${cap}`, 'gi'), 'created', 0.7],
    [new RegExp(`\\b${cap}\\s+depends?\\s+on\\s+${cap}`, 'gi'), 'depends_on', 0.7],
    [new RegExp(`\\b${cap}\\s+is\\s+part\\s+of\\s+${cap}`, 'gi'), 'part_of', 0.7],
    [new RegExp(`\\b${cap}\\s+(?:manages?|leads?)\\s+${cap}`, 'gi'), 'manages', 0.7],
    [new RegExp(`\\b${cap}\\s+(?:owns?|founded)\\s+${cap}`, 'gi'), 'owns', 0.7],
    [new RegExp(`\\b${cap}\\s+reports?\\s+to\\s+${cap}`, 'gi'), 'reports_to', 0.7],
    [new RegExp(`\\b${cap}\\s+(?:is\\s+(?:a\\s+)?member\\s+of|belongs?\\s+to)\\s+${cap}`, 'gi'), 'member_of', 0.7],
  ];

  for (const [pattern, type, confidence] of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      if (!FALSE_POSITIVE_PHRASES.has(m[1].toLowerCase()) && !COMMON_SENTENCE_STARTERS.has(m[1].toLowerCase())) {
        addRel(m[1], m[2], type, confidence);
      }
    }
  }

  return relations;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export function extractFromText(text: string): ExtractionResult {
  if (!text || typeof text !== 'string') {
    return { entities: [], facts: [], relations: [] };
  }

  // Truncate for performance
  const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

  return {
    entities: extractEntities(truncated),
    facts: extractFacts(truncated),
    relations: extractRelations(truncated),
  };
}

// ─── Merge Helper ────────────────────────────────────────────────────────────

export function mergeExtractions(...results: ExtractionResult[]): ExtractionResult {
  const entityMap = new Map<string, ExtractedEntity>();
  const factSet = new Map<string, ExtractedFact>();
  const relSet = new Map<string, ExtractedRelation>();

  for (const r of results) {
    for (const e of r.entities) {
      const key = e.name.toLowerCase();
      const existing = entityMap.get(key);
      if (!existing || existing.confidence < e.confidence) {
        entityMap.set(key, e);
      }
    }
    for (const f of r.facts) {
      const key = `${f.subject.toLowerCase()}|${f.key}|${f.value.toLowerCase()}`;
      const existing = factSet.get(key);
      if (!existing || existing.confidence < f.confidence) {
        factSet.set(key, f);
      }
    }
    for (const rel of r.relations) {
      const key = `${rel.source.toLowerCase()}|${rel.type}|${rel.target.toLowerCase()}`;
      const existing = relSet.get(key);
      if (!existing || existing.confidence < rel.confidence) {
        relSet.set(key, rel);
      }
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    facts: Array.from(factSet.values()),
    relations: Array.from(relSet.values()),
  };
}

// ─── Optional: LLM-Enhanced Extraction ───────────────────────────────────────

export async function extractWithLLM(
  text: string,
  apiKey: string,
  model: string,
  baseUrl = 'https://api.openai.com/v1',
): Promise<ExtractionResult> {
  if (!text || !apiKey) {
    return extractFromText(text);
  }

  const truncated = text.length > MAX_TEXT_LENGTH ? text.substring(0, MAX_TEXT_LENGTH) : text;

  const prompt = `Extract entities, facts, and relations from this text. Return ONLY valid JSON.

Text: "${truncated}"

Return format:
{
  "entities": [{"name": "...", "type": "person|company|project|tool|concept|date|money|unknown", "confidence": 0.0-1.0}],
  "facts": [{"subject": "...", "key": "...", "value": "...", "confidence": 0.0-1.0}],
  "relations": [{"source": "...", "target": "...", "type": "...", "confidence": 0.0-1.0}]
}

Entity types: person, company, project, tool, concept, date, money, unknown.
Relation types: works_at, created, depends_on, part_of, manages, owns, reports_to, member_of, uses.
Fact keys: is, uses, cost, preference, deadline, status, location, role.

Be selective — only extract clear, confident items.`;

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You extract structured data from text. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 1000,
      }),
    });

    if (!resp.ok) {
      console.error(`LLM extraction failed: ${resp.status}`);
      return extractFromText(text);
    }

    const data = (await resp.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
    const parsed = JSON.parse(jsonMatch[1]!.trim()) as ExtractionResult;

    // Merge with heuristic results for better coverage
    const heuristic = extractFromText(text);
    return mergeExtractions(heuristic, {
      entities: parsed.entities ?? [],
      facts: parsed.facts ?? [],
      relations: parsed.relations ?? [],
    });
  } catch (err) {
    console.error('LLM extraction error:', err);
    return extractFromText(text);
  }
}
