# VDR Standard — Living Document Protocol

*The VDR is a living operating system, not a file dump.*

---

## Principle

Every document in the VDR is **canonical**. There is ONE file per concern, and it evolves over time. Agents don't create new versions — they UPDATE the existing file.

## Rules

1. **One file per concern.** No `v2`, `v3`, `-draft`, `-final`, `-new` suffixes. The file IS the current version.
2. **Update, don't duplicate.** When new work is done, edit the canonical file. Add a changelog entry at the bottom.
3. **Subdirectories = companies.** Each portfolio company gets a folder. Cross-company docs live at VDR root.
4. **Agents must check before creating.** Before writing a new file, search for an existing canonical file on the same topic. Update it instead.
5. **Changelog at bottom.** Every significant update appends a dated entry to `## Changelog` at the file's end.
6. **No prefix repetition.** Files inside `ottogen/` don't need `ottogen-` prefix. Just `strategy.md`, not `ottogen-strategy.md`.
7. **Archive, don't delete.** Superseded files go to `.archive/`. Nothing is lost, but the canonical tree stays clean.

## For Agents (INCLUDE IN EVERY SPAWN PROMPT)

```
IMPORTANT — LIVING DOCUMENTS: This workspace uses ~/kira/vdr/VDR-STANDARD.md.
Before creating any file:
1. Read VDR-STANDARD.md for the canonical file map
2. If a canonical file exists for your topic, UPDATE it (don't create a new one)
3. Add a ## Changelog entry at the bottom with date and what changed
4. If no canonical file exists, create one following the naming convention below
5. NO v2/v3/draft/final suffixes. The file IS the current version.
```

## Canonical File Map

```
vdr/
├── VDR-STANDARD.md              ← This file (meta-protocol)
├── brand-framework.md           ← Otto vs Oopuo brand separation & messaging
│
├── ottogen/                     ← Otto (client-facing AI studio)
│   ├── brand-positioning.md     ← Messaging, tone, taglines, personas
│   ├── website-copy.md          ← Full website content
│   ├── website-design.md        ← Wireframes, visual direction
│   ├── services.md              ← Service packages & pricing
│   ├── social-calendar.md       ← Current active content calendar
│   ├── linkedin-dm-templates.md ← DM/outreach templates
│   ├── email-sequences.md       ← Outreach email sequences
│   ├── sales-playbook.md        ← Client acquisition strategy
│   ├── call-scripts.md          ← Discovery/audit call scripts
│   ├── webinar-modules.md       ← All webinar content
│   └── strategy.md              ← Otto deep strategy
│
├── oopuo/                       ← Oopuo (holding company)
│   ├── structure.md             ← Legal, org structure
│   ├── input-output-matrix.md   ← Company I/O mapping
│   ├── roadmap-2026.md          ← Strategic roadmap
│   ├── scaling-playbook.md      ← Growth architecture
│   ├── multi-company-os.md      ← Multi-company operating system
│   ├── billion-dollar-math.md   ← Valuation modeling
│   ├── agent-scaling-architecture.md
│   ├── team-framework-per-company.md
│   ├── tools-inventory-per-company.md
│   ├── portfolio-review-w8.md   ← Weekly portfolio reviews
│   ├── portfolio-review-w9.md
│   └── KIRA-SYSTEM-DESIGN.md    ← Kira system architecture
│
├── chimera/                     ← Chimera (privacy-preserving AI)
│   ├── architecture.md
│   ├── readme.md
│   ├── strategy.md
│   ├── whitepaper.md
│   └── blog-intro.md
│
├── iam/                         ← InterActiveMove (education tech)
│   ├── strategy.md
│   ├── competitive-analysis.md
│   ├── website-copy.md
│   ├── website-audit.md
│   ├── website-refactor.md
│   ├── sales-one-pager.md
│   ├── demo-kit.md
│   ├── demo-video-script.md
│   ├── roi-calculator.md
│   ├── free-trial-package.md
│   ├── partnership-proposals.md
│   └── prospects.md
│
├── zenithcred/                  ← ZenithCred (corporate wellness)
│   ├── strategy.md
│   ├── pitch-deck.md
│   ├── business-model.md
│   ├── marketing-strategy.md
│   ├── exec-summary.md
│   ├── feasibility.md
│   ├── financials.md
│   ├── mvp-spec.md
│   ├── investor-one-pager.md
│   ├── investor-outreach.md
│   └── investor-targets.md
│
├── sentinagro/                  ← SentinAgro (drone cattle monitoring)
│   ├── strategy.md
│   ├── pitch-deck.md
│   └── financials.md
│
├── cuttingedge/                 ← CuttingEdge (interior design)
│   ├── strategy.md
│   └── ux-strategy.md
│
├── abura/                       ← Abura Cosmetics
│   ├── sales-research.md
│   └── wholesale-email-sequence.md
│
├── guides/                      ← Internal guides (non-company)
│   ├── chat-guide.md
│   ├── features.md
│   └── getting-started.md
│
└── .archive/                    ← Superseded files (never lost, just retired)
```

## Naming Convention

| Pattern | Example |
|---------|---------|
| Company strategy | `{company}/strategy.md` |
| Pitch deck | `{company}/pitch-deck.md` |
| Website content | `{company}/website-copy.md` |
| Financial projections | `{company}/financials.md` |
| Outreach/sales | `{company}/sales-playbook.md` or `email-sequences.md` |
| Cross-company | `vdr/brand-framework.md` (root level) |

## Changelog
- 2026-03-02: Created. Defined canonical structure.
- 2026-03-02: Full consolidation — 113 files → 60 canonical + archive. No data lost.
