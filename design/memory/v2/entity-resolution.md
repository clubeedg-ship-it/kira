# Entity Resolution

> **Status:** ✅ DESIGNED | **Phase:** 4
> **Purpose:** Disambiguation pipeline for pronouns and references. When the user says "the client" or "he mentioned", Kira resolves which entity is meant using conversation context, recency, and the knowledge graph.

---

## 1. The Problem

In conversation: "Can you check what the client said about pricing?" — which client? Kira may have 15 clients in the knowledge graph. Current NLP does basic extraction but no coreference resolution against known entities.

---

## 2. Resolution Pipeline

```
AMBIGUOUS REFERENCE
    │
    ├─ 1. Extract reference type (pronoun, definite article, partial name)
    ├─ 2. Gather candidates from knowledge graph
    ├─ 3. Score candidates by:
    │      ├─ Recency (mentioned in current conversation = +5)
    │      ├─ Context (same area as current task = +3)
    │      ├─ Frequency (most-referenced entity of this type = +2)
    │      ├─ Proximity (mentioned recently in any conversation = +1)
    │      └─ Explicit match (partial name match = +4)
    ├─ 4. If top candidate score > threshold (7): auto-resolve
    ├─ 5. If score 4-7: resolve but note uncertainty in response
    └─ 6. If score < 4: ask for clarification
```

---

## 3. Reference Types

| Type | Examples | Resolution Strategy |
|------|----------|--------------------|
| Pronoun | "he", "they", "it" | Last mentioned entity of matching type |
| Definite article | "the client", "the project" | Most relevant entity of that type in context |
| Partial name | "Jan's practice", "the dentist" | Fuzzy match against entity names + attributes |
| Role reference | "my designer", "the developer" | Match role attribute in people entities |
| Possessive | "their email", "his company" | Resolve possessor first, then attribute |

---

## 4. Context Window

The resolver considers:
1. **Current conversation** (highest weight) — entities mentioned in this chat session
2. **Current task/project** — entities linked to the active SOP context
3. **Recent conversations** (last 7 days) — frequently discussed entities
4. **Area scope** — entities tagged to the same area

---

## 5. Learning Loop

When the user corrects a resolution ("No, I meant Client Y"), the system:
1. Updates the resolution score weights
2. Strengthens the association between the corrected entity and current context
3. Logs the correction for pattern learning

---

## 6. Implementation

Runs as part of the conversation processing pipeline (before task extraction, after message parsing). Uses Haiku for speed. Falls back to explicit clarification rather than guessing wrong.

---

*Entity resolution makes Kira conversationally fluent. Say "the client" and Kira knows which one — from context, recency, and the graph.*