# Client Ops Platform — Full Implementation Roadmap

**Status:** In Progress  
**Owner:** Kira  
**Execution mode:** Autonomous until complete  
**Method:** TDD-first, schema-first, service-first, UI-last

---

## 1. Product Target

Build a self-contained, self-hostable white-label client operations platform that:
- runs on VPS, local machine, or dedicated server
- persists all clients, assets, site backups, deployment records, and integrations
- supports static website hosting targets like Hostnet and Hostinger
- integrates Ghost for blogging
- provides a secure multi-tenant dashboard for clients and admins
- maintains auditability, recoverability, and professional operational hygiene

---

## 2. Non-Negotiable Engineering Rules

1. **Tenant isolation first**
   - every tenant-owned table includes `organizationId`
   - every tenant-owned query must scope by `organizationId`

2. **Secrets separated from config**
   - deployment and integration secrets must not live in general config payloads
   - secrets must be encrypted at rest

3. **Releases and backups are first-class**
   - publishing without releases is forbidden
   - backup metadata must exist before UI polish

4. **Service layer before route layer**
   - business rules go in domain services, not in route handlers

5. **Tests before implementation**
   - every module begins with failing tests

6. **UI after backend spine**
   - do not build attractive emptiness

---

## 3. Delivery Phases

### Phase 0 — Workspace Preparation
**Goal:** create a clean execution lane

Deliverables:
- roadmap document
- implementation folder target selection
- package/runtime decision
- testing strategy selection
- migration strategy selection

Exit criteria:
- target codebase chosen
- implementation roadmap committed

---

### Phase 1 — Foundation Architecture
**Goal:** establish backend structure and Prisma foundation

Deliverables:
- Prisma-based data layer
- core package structure
- env conventions
- test harness
- enum set
- tenant/auth models

Core scope:
- `Organization`
- `User`
- `OrganizationMember`
- base enums

TDD gates:
- user can belong to an org
- unique org membership enforced
- org access resolution works
- foreign org access denied

Exit criteria:
- Prisma validates
- first migration created
- first tests pass

---

### Phase 2 — Content and Branding Core
**Goal:** deliver structured white-label control layer

Deliverables:
- `Asset`
- `BrandSettings`
- `ContentBlock`
- validation layer for editable fields
- published snapshot assembler

TDD gates:
- one org cannot read/write another org’s branding
- content key unique per org
- invalid branding values rejected
- published snapshot excludes draft content

Exit criteria:
- branding CRUD works
- content block CRUD works
- snapshot generation works

---

### Phase 3 — Client Portal Operational Core
**Goal:** make the platform useful

Deliverables:
- `Service`
- `ActivityEvent`
- `SupportRequest`
- service layer logic for portal overview

TDD gates:
- service records are org-scoped
- activity events append correctly
- support request status flow works
- client/admin permissions differ correctly

Exit criteria:
- overview data can be assembled from DB
- support workflow works
- activity feed works

---

### Phase 4 — Deployment Engine
**Goal:** publishable, portable system

Deliverables:
- `DeploymentTarget`
- `DeploymentTargetSecret`
- `SiteRelease`
- `DeploymentJob`
- deployment adapter interface
- local filesystem adapter
- generic SFTP adapter scaffold

TDD gates:
- deploy target config validates by type
- secrets stored encrypted
- release version increments correctly
- failed job never marks release published
- job lifecycle transitions are enforced

Exit criteria:
- create release
- queue publish job
- run adapter
- record result

---

### Phase 5 — Integrations and Hardening
**Goal:** professional operational integrity

Deliverables:
- `IntegrationConnection`
- `IntegrationSecret`
- `Backup`
- `AuditLog`
- `HealthCheck`
- Ghost integration representation
- audit helper
- encryption helper

TDD gates:
- secrets never returned in plaintext
- audit logs created for sensitive actions
- backups link to release/assets correctly
- integration health test state is recorded

Exit criteria:
- Ghost represented as integration
- backups queryable
- audit trail exists for sensitive actions

---

### Phase 6 — API Layer
**Goal:** expose stable application surface

Deliverables:
- auth endpoints
- branding/content endpoints
- services/activity/support endpoints
- deployments endpoints
- integrations endpoints
- backups endpoints

TDD gates:
- authorization enforced at route layer
- invalid payloads rejected
- cross-tenant IDs denied

Exit criteria:
- core API surface works end-to-end with DB and service layer

---

### Phase 7 — Dashboard UI
**Goal:** usable product interface

Deliverables:
- login screen
- overview screen
- branding/content screen
- services screen
- activity screen
- support screen
- deployment screen
- integrations screen

TDD gates:
- critical user flows covered by E2E tests
- org-specific data renders correctly
- mutation flows update visible state

Exit criteria:
- admin and client can complete main workflows via UI

---

### Phase 8 — Production Hardening
**Goal:** ready for live client usage

Deliverables:
- seed strategy
- backup/restore scripts
- env template
- deployment docs
- health/status visibility
- security checklist

Exit criteria:
- local install works
- VPS install works
- basic restore path works

---

## 4. Recommended Technical Stack

### Backend
- Node + TypeScript
- Prisma + PostgreSQL
- Zod for validation
- Better Auth or equivalent auth layer
- BullMQ or lightweight job abstraction for async tasks

### Frontend
- React / Vite or Next.js if repo shifts later

### Infrastructure
- PostgreSQL
- Redis for jobs if required
- local FS or S3-compatible object storage
- reverse proxy later (Caddy/Nginx)

### Testing
- Vitest for unit/integration
- Playwright for E2E

---

## 5. Data Model Roadmap

### Wave 1
- Organization
- User
- OrganizationMember

### Wave 2
- Asset
- BrandSettings
- ContentBlock

### Wave 3
- Service
- ActivityEvent
- SupportRequest

### Wave 4
- DeploymentTarget
- DeploymentTargetSecret
- SiteRelease
- DeploymentJob

### Wave 5
- IntegrationConnection
- IntegrationSecret
- Backup
- AuditLog
- HealthCheck

---

## 6. Test Matrix Roadmap

### Foundation tests
- membership uniqueness
- org scoping
- role checks
- platform admin bypass rules

### Branding/content tests
- org-isolated reads/writes
- structured validation
- draft vs published behavior
- asset linkage

### Operations tests
- service lifecycle
- activity ordering
- support permissions and transitions

### Deployment tests
- target validation by adapter type
- encrypted secret storage
- release versioning
- publish job transitions

### Hardening tests
- audit emission
- masked secret responses
- backup record integrity
- health check persistence

### API tests
- authenticated access
- denied cross-tenant access
- payload validation
- happy path CRUD

### E2E tests
- login
- edit branding
- create support request
- view services/activity
- create release and publish job

---

## 7. Execution Order

1. choose codebase target
2. install Prisma/test stack
3. add roadmap + architecture notes
4. add schema and enums
5. add first migration
6. add test harness
7. write foundation tests
8. implement foundation models/services
9. write branding/content tests
10. implement branding/content services
11. write operations tests
12. implement operations services
13. write deployment tests
14. implement deployment engine
15. write hardening tests
16. implement integrations/backups/audit
17. add route layer
18. add UI
19. run end-to-end test pass
20. write deployment/runbook docs

---

## 8. Definition of Done

The implementation is complete when:
- Prisma schema covers all MVP entities
- migrations run cleanly on a fresh database
- seed script creates a usable demo workspace
- unit and integration tests pass for all core modules
- tenant isolation is enforced and tested
- branding/content/services/support/deployment flows work
- secrets are encrypted and never exposed in plaintext
- audit logging exists for sensitive operations
- backups and releases are represented properly
- UI supports the primary admin/client workflows
- the platform can run locally and on a VPS

---

## 9. Immediate Next Actions

- select implementation target directory
- inspect current app architecture compatibility
- introduce Prisma alongside or in place of current DB layer
- install validation and testing dependencies
- create schema draft and test harness

---

## 10. Progress Tracking

### Current status
- [x] Roadmap created
- [x] Target codebase selected
- [x] Prisma installed
- [x] Test harness installed
- [x] Schema drafted
- [x] Migration created
- [x] Foundation tests passing
- [x] Branding/content tests passing
- [x] Operations tests passing
- [x] Deployment tests passing
- [x] Hardening tests passing
- [x] API routes implemented
- [x] UI flows implemented
- [x] Production docs finished

---

## 11. Agent Delegation Policy

When using coding agents during implementation:
- use fast code-focused agents for schema, CRUD scaffolding, test boilerplate
- use architecture-strong agents for security review, tenant isolation review, deployment abstraction review
- all outputs must be verified in the main session before being accepted

---

## 12. Notes

This document is the execution source of truth. If implementation changes, update this file rather than drifting silently.
