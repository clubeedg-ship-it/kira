export interface ParsedQuickAdd {
  title: string;
  priority: number | null;    // 0=critical, 1=high, 2=medium, 3=low
  tags: string[];
  executorType: string | null; // 'agent' | 'human'
  dueDate: string | null;     // YYYY-MM-DD
  projectQuery: string | null; // raw text after >
  durationEst: number | null;  // minutes
}

const PRIORITY_MAP: Record<string, number> = {
  critical: 0,
  crit: 0,
  high: 1,
  hi: 1,
  medium: 2,
  med: 2,
  low: 3,
  lo: 3,
};

const EXECUTOR_MAP: Record<string, string> = {
  agent: 'agent',
  code: 'agent',
  research: 'agent',
  comms: 'agent',
  me: 'human',
  human: 'human',
};

function parseDueDate(raw: string): string | null {
  const lower = raw.toLowerCase();
  const today = new Date();

  if (lower === 'today' || lower === 'eod') {
    return formatDate(today);
  }

  if (lower === 'tomorrow' || lower === 'tmrw') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const shortDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  let dayIndex = dayNames.indexOf(lower);
  if (dayIndex === -1) dayIndex = shortDays.indexOf(lower);

  if (dayIndex !== -1) {
    const d = new Date(today);
    const currentDay = d.getDay();
    let diff = dayIndex - currentDay;
    if (diff <= 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return formatDate(d);
  }

  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  // Try mon15, mar1, etc.
  const monthMatch = raw.match(/^([a-z]{3})(\d{1,2})$/i);
  if (monthMatch) {
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const mi = months.indexOf(monthMatch[1].toLowerCase());
    if (mi !== -1) {
      const year = today.getFullYear();
      const d = new Date(year, mi, parseInt(monthMatch[2], 10));
      if (d < today) d.setFullYear(year + 1);
      return formatDate(d);
    }
  }

  return null;
}

function parseDuration(raw: string): number | null {
  const match = raw.match(/^(\d+)(m|h)$/i);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  return match[2].toLowerCase() === 'h' ? value * 60 : value;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseQuickAddSyntax(input: string): ParsedQuickAdd {
  const result: ParsedQuickAdd = {
    title: '',
    priority: null,
    tags: [],
    executorType: null,
    dueDate: null,
    projectQuery: null,
    durationEst: null,
  };

  const titleParts: string[] = [];
  const tokens = input.split(/\s+/);

  for (const token of tokens) {
    if (!token) continue;

    // Priority: !critical, !high, etc.
    if (token.startsWith('!') && token.length > 1) {
      const key = token.slice(1).toLowerCase();
      if (key in PRIORITY_MAP) {
        result.priority = PRIORITY_MAP[key];
        continue;
      }
    }

    // Tags: #tagname
    if (token.startsWith('#') && token.length > 1) {
      result.tags.push(token.slice(1).toLowerCase());
      continue;
    }

    // Executor: @agent, @me
    if (token.startsWith('@') && token.length > 1) {
      const key = token.slice(1).toLowerCase();
      if (key in EXECUTOR_MAP) {
        result.executorType = EXECUTOR_MAP[key];
        continue;
      }
    }

    // Due date: due:friday, due:2026-03-01, etc.
    if (token.toLowerCase().startsWith('due:') && token.length > 4) {
      const dateStr = token.slice(4);
      const parsed = parseDueDate(dateStr);
      if (parsed) {
        result.dueDate = parsed;
        continue;
      }
    }

    // Project: >projectname
    if (token.startsWith('>') && token.length > 1) {
      result.projectQuery = token.slice(1);
      continue;
    }

    // Duration: ~30m, ~2h
    if (token.startsWith('~') && token.length > 1) {
      const dur = parseDuration(token.slice(1));
      if (dur !== null) {
        result.durationEst = dur;
        continue;
      }
    }

    titleParts.push(token);
  }

  result.title = titleParts.join(' ').trim();
  return result;
}
