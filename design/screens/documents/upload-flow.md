# Upload Flow

> **Status:** 🔴 SCAFFOLD | **Phase:** 3

How documents enter the system.

## Entry Points
1. Manual upload (drag-and-drop, file picker)
2. Agent output (auto-saved to VDR with project tag)
3. Email attachment (extracted by triage engine)
4. Chat attachment (user sends file in conversation)
5. API upload (external integrations)

## Auto-enrichment on Upload
- Generate summary
- Extract entities
- Link to project (if context available)
- Generate thumbnail
