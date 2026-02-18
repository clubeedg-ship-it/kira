# 08 — Chat System

---

## Layout

Discord-style. No bubbles. No left/right alignment.

```
┌──────────────────────────────────────┐
│  Session tabs / selector             │
├──────────────────────────────────────┤
│                                      │
│  ┌─ assistant ─────────────────────┐ │
│  │ [avatar] Kira            12:04  │ │
│  │                                 │ │
│  │ ▸ Thinking (collapsed)          │ │
│  │ ▸ Tool: search_web (collapsed)  │ │
│  │                                 │ │
│  │ Here's what I found...          │ │
│  └─────────────────────────────────┘ │
│                                      │
│  ┌─ user ──────────────────────────┐ │
│  │ [avatar] Mark            12:05  │ │
│  │ Thanks, can you update the task?│ │
│  └─────────────────────────────────┘ │
│                                      │
│  gradient fade at top ↑              │
├──────────────────────────────────────┤
│  [model ▾] [Type a message...] [→]  │
├──────────────────────────────────────┤
│  Connected · claude-sonnet-4 · 1.2k  │
└──────────────────────────────────────┘
```

## Messages

### User Message
- Avatar + display name + timestamp
- Plain text content
- Optional file attachments

### Assistant Message
- Kira avatar + "Kira" + timestamp + model badge
- **Thinking block** — collapsible, dimmed text, shows the model's reasoning
- **Tool use blocks** — collapsible, shows tool name + input + output
- **Text content** — markdown rendered (code blocks, lists, links, bold, italic)
- All blocks present in the message, not filtered. User sees everything the AI produced.

### Streaming

Messages stream in via SSE:
1. `thinking` chunks appear in a collapsible thinking block (auto-expanded while streaming)
2. `tool_use` events show as collapsible tool blocks
3. `text` chunks append to the main content area
4. `done` event finalizes the message (adds token count badge)

### Sessions

- Users can have multiple chat sessions
- Session selector at top (tabs or dropdown)
- "New Chat" button creates a new session
- Each session has independent conversation history
- Sessions persist across page refreshes

## Input Bar

- Text input (auto-growing textarea, max 6 lines)
- Model selector dropdown (shows available models from user's provider)
- Send button (Enter to send, Shift+Enter for newline)
- File upload button (future)

## Status Bar

Bottom bar showing:
- Connection status (🟢 Connected / 🔴 Disconnected)
- Current model name
- Token count for current session

## System Prompt

Generated per-user, per-session:
```
You are Kira, a personal AI partner.

User: {displayName}
Context: {relevant memory snippets}
Active tasks: {top 3 tasks}
Current goals: {active goals}

Be helpful, direct, and remember context from previous conversations.
```

Memory snippets are retrieved from the user's memory.db based on conversation context.
