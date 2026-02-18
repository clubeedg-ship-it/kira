# Upload Flow

> **Status:** 🔴 SCAFFOLD | **Phase:** 3

How documents enter the system.

## Entry Points
1. Manual upload (drag-and-drop, file picker)
2. Agent output (saved to VDR during task execution)
3. Email attachment (extracted by triage engine)
4. Chat attachment (user sends file in conversation)
5. API upload (external integrations)

## Processing Pipeline
- Auto-tag with project context (if uploaded during task/project context)
- AI metadata extraction (summary, entities, type classification)
- Thumbnail generation
- Full-text indexing for search

## TODO
- Upload UI wireframe
- Progress indicators
- Duplicate detection
- Storage limits and quotas
