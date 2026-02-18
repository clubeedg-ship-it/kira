# Quick Add — Keyboard-Driven Task Creation

> **Status:** ✅ DESIGNED | **Phase:** 3
> **Purpose:** Command palette-style task creation. Triggered from anywhere with a global shortcut. Natural language input with inline syntax for metadata. The fastest path from thought to captured task.

---

## 1. Trigger

**Global shortcut:** `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux). Works from any screen.

Also accessible: `q` key when focus is on a task list, or `+` button in any view toolbar.

---

## 2. UI — Modal Overlay

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  ┌─ QUICK ADD ─────────────────────────────────────────┐ │
│  │                                                      │ │
│  │ > Research email platforms for dental practices_      │ │
│  │                                                      │ │
│  │ ┌─ PARSED ────────────────────────────────────────┐  │ │
│  │ │ Project: [Email Campaign ▾]  Area: [AI Recept.] │  │ │
│  │ │ Priority: [medium ▾]  Due: [none ▾]             │  │ │
│  │ │ Executor: [🤖 agent ▾]  Tags: []                │  │ │
│  │ └─────────────────────────────────────────────────┘  │ │
│  │                                                      │ │
│  │ [Create (↵)]  [Create & Add Another (⇧↵)]  [Cancel] │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Inline Syntax

Type metadata directly in the task title. Parsed tokens are highlighted and removed from the title.

| Syntax | Effect | Example |
|--------|--------|---------|
| `!critical` `!high` `!med` `!low` | Set priority | `Fix bug !high` |
| `@agent` `@human` `@code` `@research` `@comms` | Set executor | `Draft email @comms` |
| `#tag` | Add tag | `Setup DNS #infrastructure` |
| `>project-name` | Assign to project | `Test emails >email-campaign` |
| `due:friday` `due:mar15` `due:tomorrow` | Set due date | `Send report due:friday` |
| `~30m` `~2h` | Set duration estimate | `Review docs ~20m` |

**Parsing:** Real-time as you type. Matched tokens change color and move to the parsed metadata section below.

---

## 4. Smart Suggestions

As you type, the system suggests:
- **Project match:** If title contains words matching a project name, auto-suggest that project
- **Area match:** If project is set, auto-populate area
- **Executor suggestion:** Based on task classification patterns (e.g., "research" → agent)
- **Recent projects:** Dropdown shows your 5 most-used projects

Tab to accept suggestion. Arrow keys to navigate suggestions.

---

## 5. Behavior

| Action | Key | Effect |
|--------|-----|--------|
| Create task | `Enter` | Creates task, closes modal |
| Create & add another | `Shift+Enter` | Creates task, clears input, keeps modal open |
| Cancel | `Escape` | Closes modal without creating |
| Navigate suggestions | `↑`/`↓` | Move through autocomplete |
| Accept suggestion | `Tab` | Fill in suggested value |

**After creation:** Task flows through classification engine (SOP ENGINE doc Section 4.2). If no project assigned → goes to inbox. If agent-executable → enters agent queue. Flash notification: "✅ Task created: [title]"

---

## 6. Context-Aware Defaults

When Quick Add is triggered from within a specific view, it inherits context:

| Triggered From | Pre-populated |
|---------------|---------------|
| Area View | Area = current area |
| Project Detail | Project + area |
| Today View (in a time block) | Time block's area + scheduled_date = today |
| Board View (in a column) | Project + status = column's status |
| List View (with filters active) | Active filter values |

---

## 7. Mobile

Bottom sheet modal with large touch-friendly input. Suggestion chips below input. No inline syntax on mobile — instead, tappable metadata pills below the input field.

---

*Quick Add is capture speed. Thought to task in 3 seconds. Inline syntax for power users, smart defaults for everyone. Never lose an idea.*