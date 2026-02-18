# Widget Agent Design

## Overview

The Widget Agent is a specialist agent that generates structured JSON for visual UI components. It's optimized for speed and cost — using a fast/cheap model, strict output schemas, and a single-turn execution model.

---

## 1. Role & Architecture

```
User message → Main Agent → detects widget need → spawns Widget Agent
                                                        │
                                                        ▼
                                              ┌──────────────────┐
                                              │  Widget Agent     │
                                              │  Model: flash     │
                                              │  Timeout: 10s     │
                                              │  Turns: 1         │
                                              └────────┬─────────┘
                                                       │
                                                       ▼
                                              Structured JSON
                                                       │
                                                       ▼
                                              Main Agent → Canvas render
```

**Key properties:**
- **Fast:** Must respond in <10 seconds
- **Cheap:** Uses fastest available model (gemini-flash, haiku, etc.)
- **Strict:** Output must match widget schema exactly
- **Stateless:** No memory, no context beyond the current request
- **Fallible:** If it fails, main agent produces text alternative

---

## 2. Input Format

The main agent sends a structured request:

```typescript
interface WidgetRequest {
  widget_type: string;              // from schema registry
  data: any;                        // the actual data to visualize
  options?: Record<string, any>;    // display preferences
  context?: string;                 // brief context for the agent
  user_preferences?: {
    theme?: 'light' | 'dark';
    color_scheme?: string;
    locale?: string;
  };
}
```

**Example request:**

```json
{
  "widget_type": "bar_chart",
  "data": {
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "values": [12, 8, 15, 22, 18]
  },
  "options": {
    "title": "Git Commits This Week",
    "y_axis_label": "Commits",
    "color": "#4CAF50"
  },
  "context": "User asked to see their git activity this week"
}
```

---

## 3. Output Format

Widget agent returns JSON matching the requested widget schema:

```typescript
interface WidgetResponse {
  widget: string;                   // widget type name
  version: string;                  // schema version
  data: any;                        // widget-specific data
  options: Record<string, any>;     // rendering options
  metadata?: {
    generated_at: string;
    description: string;            // alt-text for accessibility
  };
}
```

---

## 4. Invocation

### Invocation Protocol

The widget system has three layers:

1. **Agent-facing directive:** `@widget:TYPE` — what Kira types in conversation to trigger a widget
2. **Wire format:** `<!-- kira-widget:TYPE { JSON } -->` — what gets stored in the transcript
3. **Dashboard rendering:** The React frontend parses HTML comments and renders the appropriate component

**Compilation flow:**
```
@widget:bar_chart "git commits this week"
    │
    ▼
Main Agent detects @widget directive
    │
    ▼
Widget Agent spawned → generates structured JSON
    │
    ▼
Stored in transcript as:
<!-- kira-widget:bar_chart {"data":{"labels":["Mon","Tue"],...},"options":{...}} -->
    │
    ▼
Dashboard parses HTML comment → renders <BarChart> component
```

The `@widget:TYPE` directive is the agent-facing API. The `<!-- kira-widget:TYPE { JSON } -->` HTML comment is the wire format that persists in conversation history. The dashboard's message renderer extracts these comments and replaces them with live React components.

### Explicit: @widget Directive

```
User: "@widget:bar_chart git commits this week"
```

Main agent intercepts `@widget:TYPE`, gathers data, spawns widget agent.

### Auto-Detection

Main agent detects when a visual response would be better:

```typescript
const WIDGET_TRIGGERS = {
  bar_chart: /\b(chart|graph|bar|histogram)\b.*\b(show|display|visualize)\b/i,
  table: /\b(table|compare|comparison|versus|vs)\b/i,
  timeline: /\b(timeline|history|chronolog|over time)\b/i,
  code_block: /\b(code|snippet|function|class)\b.*\b(show|display|highlight)\b/i,
  status_board: /\b(status|health|dashboard|overview)\b/i,
  kanban: /\b(board|kanban|tasks|progress)\b/i,
};
```

### Programmatic (from other agents)

```typescript
// Any agent can request a widget
const widget = await spawnSpecialist('widget', {
  widget_type: 'bar_chart',
  data: chartData,
  options: chartOptions
});
```

---

## 5. Schema Registry

All supported widget types and their JSON schemas.

### 5.1 Bar Chart

```json
{
  "$id": "widget:bar_chart:v1",
  "type": "object",
  "required": ["widget", "data"],
  "properties": {
    "widget": { "const": "bar_chart" },
    "version": { "const": "1" },
    "data": {
      "type": "object",
      "required": ["labels", "datasets"],
      "properties": {
        "labels": { "type": "array", "items": { "type": "string" } },
        "datasets": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["values"],
            "properties": {
              "label": { "type": "string" },
              "values": { "type": "array", "items": { "type": "number" } },
              "color": { "type": "string" }
            }
          }
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "x_axis_label": { "type": "string" },
        "y_axis_label": { "type": "string" },
        "stacked": { "type": "boolean" },
        "horizontal": { "type": "boolean" }
      }
    }
  }
}
```

### 5.2 Table

```json
{
  "$id": "widget:table:v1",
  "type": "object",
  "required": ["widget", "data"],
  "properties": {
    "widget": { "const": "table" },
    "data": {
      "type": "object",
      "required": ["columns", "rows"],
      "properties": {
        "columns": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["key", "label"],
            "properties": {
              "key": { "type": "string" },
              "label": { "type": "string" },
              "align": { "enum": ["left", "center", "right"] },
              "format": { "enum": ["text", "number", "currency", "date", "badge"] }
            }
          }
        },
        "rows": {
          "type": "array",
          "items": { "type": "object" }
        }
      }
    },
    "options": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "sortable": { "type": "boolean" },
        "page_size": { "type": "number" }
      }
    }
  }
}
```

### 5.3 Timeline

```json
{
  "$id": "widget:timeline:v1",
  "properties": {
    "widget": { "const": "timeline" },
    "data": {
      "type": "object",
      "required": ["events"],
      "properties": {
        "events": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["date", "title"],
            "properties": {
              "date": { "type": "string" },
              "title": { "type": "string" },
              "description": { "type": "string" },
              "icon": { "type": "string" },
              "color": { "type": "string" }
            }
          }
        }
      }
    }
  }
}
```

### 5.4 Status Board

```json
{
  "$id": "widget:status_board:v1",
  "properties": {
    "widget": { "const": "status_board" },
    "data": {
      "type": "object",
      "required": ["items"],
      "properties": {
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "status"],
            "properties": {
              "name": { "type": "string" },
              "status": { "enum": ["ok", "warning", "error", "unknown"] },
              "detail": { "type": "string" },
              "last_checked": { "type": "string" }
            }
          }
        }
      }
    },
    "options": {
      "properties": {
        "title": { "type": "string" }
      }
    }
  }
}
```

### 5.5 Code Block

```json
{
  "$id": "widget:code_block:v1",
  "properties": {
    "widget": { "const": "code_block" },
    "data": {
      "type": "object",
      "required": ["code", "language"],
      "properties": {
        "code": { "type": "string" },
        "language": { "type": "string" },
        "filename": { "type": "string" },
        "highlights": {
          "type": "array",
          "items": { "type": "number" },
          "description": "Line numbers to highlight"
        }
      }
    }
  }
}
```

### 5.6 Kanban Board

```json
{
  "$id": "widget:kanban:v1",
  "properties": {
    "widget": { "const": "kanban" },
    "data": {
      "type": "object",
      "required": ["columns"],
      "properties": {
        "columns": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["title", "cards"],
            "properties": {
              "title": { "type": "string" },
              "color": { "type": "string" },
              "cards": {
                "type": "array",
                "items": {
                  "type": "object",
                  "required": ["title"],
                  "properties": {
                    "title": { "type": "string" },
                    "description": { "type": "string" },
                    "tags": { "type": "array", "items": { "type": "string" } },
                    "priority": { "enum": ["low", "medium", "high"] }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 6. Widget Agent System Prompt

```markdown
# Widget Agent

You generate structured JSON for visual widgets. Nothing else.

## Rules
1. Output ONLY valid JSON — no markdown, no explanation, no code fences
2. Match the schema for the requested widget type exactly
3. Use the provided data as-is — do not invent or modify data
4. Apply sensible defaults for any missing optional fields
5. Keep descriptions/alt-text concise and descriptive

## Available Widget Types
- bar_chart: Bar/column charts with labels and datasets
- table: Structured data tables with columns and rows
- timeline: Chronological event sequences
- status_board: Service/system status overview
- code_block: Syntax-highlighted code with optional line highlights
- kanban: Task board with columns and cards

## Input Format
You receive a JSON object with:
- widget_type: which widget to generate
- data: the raw data to structure
- options: display preferences (optional)
- context: brief description of what user wants (optional)

## Output Format
Return a single JSON object matching the widget schema. Nothing else.
```

---

## 7. Performance Requirements

| Metric | Target | Hard Limit |
|--------|--------|------------|
| Response time | <5s | 10s |
| Token usage | <2000 | 5000 |
| Cost per call | <$0.005 | $0.01 |
| Success rate | >95% | — |

**Model selection priority:**
1. `google/gemini-2.0-flash-001` (fastest, cheapest)
2. `anthropic/claude-haiku-3` (fallback)
3. `anthropic/claude-sonnet-4-20250514` (if schema complexity requires it)

---

## 8. Fallback Behavior

When the widget agent fails (timeout, invalid JSON, schema mismatch):

```typescript
async function generateWidget(request: WidgetRequest): Promise<WidgetResponse | string> {
  try {
    const result = await spawnSpecialist('widget', request, { timeout: 10_000 });
    const parsed = JSON.parse(result);
    
    // Validate against schema
    if (!validateSchema(parsed, request.widget_type)) {
      throw new Error('Schema validation failed');
    }
    
    return parsed;
  } catch (error) {
    // Fallback: main agent generates text representation
    console.log(`Widget agent failed: ${error.message}`);
    return generateTextFallback(request);
  }
}

function generateTextFallback(request: WidgetRequest): string {
  switch (request.widget_type) {
    case 'bar_chart':
      // Render as ASCII bar chart or bullet list
      return request.data.labels.map((l, i) => 
        `${l}: ${'█'.repeat(request.data.values[i])} (${request.data.values[i]})`
      ).join('\n');
      
    case 'table':
      // Render as markdown table (or bullets for Discord)
      return markdownTable(request.data);
      
    case 'status_board':
      // Render as emoji status list
      return request.data.items.map(i => 
        `${STATUS_EMOJI[i.status]} ${i.name}: ${i.detail || i.status}`
      ).join('\n');
      
    default:
      return JSON.stringify(request.data, null, 2);
  }
}
```

**Fallback renders:**

```
# Bar chart fallback (text)
Mon: ████████████ (12)
Tue: ████████ (8)
Wed: ███████████████ (15)
Thu: ██████████████████████ (22)
Fri: ██████████████████ (18)

# Status board fallback (text)
✅ API Server: healthy (response time 45ms)
✅ Database: healthy (connections: 12/100)
⚠️ Disk Space: warning (85% used)
❌ Email Service: error (timeout after 30s)
```
