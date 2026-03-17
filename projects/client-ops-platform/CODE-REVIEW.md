# Code Review — Client Ops Platform

**Reviewed:** 2026-03-13  
**Scope:** Prisma schema, src/core/*, src/shared/*, src/db/*, tests/*, seed, infra files  
**Roadmap phase:** Phases 1–5 (Foundation through Hardening) — service layer complete, API/UI not started

---

## Summary

Solid foundation. The codebase covers Phases 1–5 of the roadmap with clean service-layer abstractions, proper tenant isolation, encrypted secret storage, and good test coverage for the happy paths. The schema is well-designed with appropriate indexes and constraints. The code is consistent, idiomatic TypeScript, and follows the roadmap's "service layer before route layer" and "TDD first" principles faithfully.

The main gaps are: missing cross-tenant isolation enforcement in several transition methods, duplicated access-check boilerplate across services, no `canEditContent` permission level being used anywhere, and the `.env` file being committed with real-ish credentials.

---

## Architecture Coherence

**Strong alignment with roadmap.** The delivery phases map cleanly to what's implemented:

- ✅ Phase 1 (Foundation): Organization, User, OrganizationMember — working with tests
- ✅ Phase 2 (Branding/Content): BrandSettings, ContentBlock, validation, snapshots — working
- ✅ Phase 3 (Operations): Service, ActivityEvent, SupportRequest — working
- ✅ Phase 4 (Deployment): DeploymentTarget, secrets, releases, jobs, state machines — working
- ✅ Phase 5 (Hardening): Integrations, Backup, AuditLog, HealthCheck, encryption — partially working
- ⬜ Phase 6 (API): Not started — `src/server/index.ts` is a placeholder
- ⬜ Phase 7 (UI): Not started
- ⬜ Phase 8 (Production): Partial — docker-compose and seed exist

**Roadmap compliance:** "Service layer before route layer" ✅. "Tests before implementation" ✅. "Secrets separated from config" ✅. "Tenant isolation first" — mostly, with gaps noted below.

---

## Code Quality

**Strengths:**
- Consistent patterns across all services (constructor injection, `getAccess` helper, Prisma calls)
- Zod validation for branding input and deployment target configs
- State machine transitions with explicit allow-lists for releases, jobs, and backups
- Clean separation: `src/shared/roles.ts` for pure permission logic, `src/core/organization-access.ts` for assertions
- Proper use of `@@unique`, `@@index`, cascading deletes in schema

**Issues:**

1. **DRY violation — `getAccess` pattern duplicated in 5 services.** `BackupService`, `DeploymentService`, `IntegrationService`, `ServiceCatalogService`, and `SupportService` all have nearly identical `getAccess()` methods. This should be a shared utility (e.g., in `organization-access.ts`).

2. **`BrandingService` doesn't use `getAccess` helper** — it inlines the same Promise.all pattern twice (in `upsertBrandSettings` and `upsertContentBlock`). Triple duplication within one file.

3. **`canEditContent` is defined but never used.** The `editor` role can edit content per `roles.ts`, but `BrandingService.upsertContentBlock` requires `canManageOrganization` (owner/admin only). Either the permission model is wrong or the role function is dead code. This is a **functional bug** — editors can't edit content blocks despite the role being designed for it.

4. **`ActivityService` and `AuditService` have no access control.** They're internal-only now, but if exposed via API without a wrapper, anyone could write audit logs. Fine for now, worth noting for Phase 6.

5. **Content block version increment has a race condition.** In `upsertContentBlock`, the version is read then incremented non-atomically. Two concurrent updates could produce the same version number. Use Prisma's `increment` or a DB-level sequence.

---

## Security Review

**Encryption — Good:**
- AES-256-GCM with scrypt key derivation, random salt per encryption
- Secrets never returned in plaintext from service methods (masked output)
- Encryption master key validated for minimum length

**Tenant isolation — Mostly Good, With Gaps:**

1. **`transitionReleaseStatus` doesn't verify organizationId.** It takes `organizationId` as a parameter but never uses it — it fetches the release by ID alone. An attacker with a valid release ID from another org could transition it. Same issue in `transitionJobStatus` and `transitionBackupStatus`. **This is the most serious security issue.**

   Fix: Add `where: { id: params.releaseId, organizationId: params.organizationId }` or verify after fetch.

2. **`getTargetSecretDecrypted` and `getSecretDecrypted` have no access control.** They take an entity ID and return the decrypted secret. No actor check, no org scoping. Currently internal, but dangerous if any API route calls them without proper gating.

3. **`updateStatus` on IntegrationService has no access control or org scoping.** Takes a connection ID directly. Anyone who knows the ID can change the status.

4. **`DeploymentService.updateServiceStatus` doesn't verify the service belongs to the org.** It updates by `serviceId` alone — cross-tenant mutation possible if the service ID is known.

**Credentials:**
- `.env` is present in the repo with database credentials. The `.env.example` exists but doesn't include `ENCRYPTION_MASTER_KEY`. Should add it and `.gitignore` the `.env`.
- `passwordHash: 'dev-only-placeholder'` in seed is fine for dev, but no actual auth implementation exists yet.

---

## Test Coverage

**What's covered well:**
- Role permissions (unit)
- Branding validation (unit)
- Schema shape verification (unit)
- Organization access control (unit)
- Encryption round-trip (unit)
- All core services have integration tests with real DB
- State machine transitions tested for valid and invalid paths
- Cross-role permission checks (viewer can't create, client can't manage)

**Gaps:**

1. **No cross-tenant isolation tests.** No test verifies that Org A's owner can't read/modify Org B's data. This is the roadmap's #1 non-negotiable and it's untested.

2. **No test for platform admin bypass across services.** Only `organization-access.test.ts` tests it at the assertion level. No integration test proves a platform admin can actually operate on an org they're not a member of.

3. **No test for concurrent release version creation** (race condition).

4. **No test for `IntegrationService.listConnections`** with unauthorized users.

5. **No tests for `HealthCheck` model** — no service exists for it yet.

6. **No negative tests for encryption** (wrong master key, tampered ciphertext, etc.).

7. **`ActivityService` has no dedicated test file** — only tested as a side effect of other services.

---

## Issues Found

| # | Severity | Description |
|---|----------|-------------|
| 1 | **Critical** | `transitionReleaseStatus`, `transitionJobStatus`, `transitionBackupStatus` don't enforce org scoping — cross-tenant state manipulation possible |
| 2 | **High** | `getTargetSecretDecrypted` and `getSecretDecrypted` have no access control — decrypted secrets accessible without authorization |
| 3 | **High** | `IntegrationService.updateStatus` has no access control or org verification |
| 4 | **Medium** | `canEditContent` role is defined but unused — editors can't edit content blocks (likely a bug) |
| 5 | **Medium** | `getAccess()` duplicated across 5 service files — maintenance risk |
| 6 | **Medium** | Content block version increment is not atomic — race condition |
| 7 | **Low** | `.env` with credentials present in project (should be gitignored) |
| 8 | **Low** | `.env.example` missing `ENCRYPTION_MASTER_KEY` entry |
| 9 | **Low** | No `HealthCheck` service implemented yet (schema exists, no logic) |
| 10 | **Low** | `DeploymentTarget.status` is `String` instead of an enum — inconsistent with the rest of the schema |

---

## Recommendations

1. **Fix cross-tenant enforcement immediately.** Every `findUniqueOrThrow` in transition methods must include `organizationId` in the where clause. Add integration tests that create two orgs and verify isolation.

2. **Extract `getAccess` into a shared function** in `organization-access.ts`:
   ```ts
   export async function resolveAccess(prisma: PrismaClient, actorUserId: string, organizationId: string): Promise<AccessContext>
   ```

3. **Gate secret decryption methods** — either add access control directly or mark them as `/** @internal */` and ensure API routes never expose them without auth.

4. **Use `canEditContent` in `upsertContentBlock`** instead of `canManageOrganization` — this is what the `editor` role is for.

5. **Add cross-tenant integration tests** — create two orgs, verify one can't read/modify the other's resources. This should be a dedicated test file.

6. **Fix version increment race** — use `prisma.contentBlock.update({ data: { version: { increment: 1 } } })` pattern.

7. **Add `.env` to `.gitignore`** and add `ENCRYPTION_MASTER_KEY` to `.env.example`.

8. **Create a `HealthCheckService`** — the model exists in the schema but has no service layer.

9. **Change `DeploymentTarget.status` to an enum** for consistency with the rest of the schema.

10. **Consider a base service class or mixin** for the repeated activity+audit logging pattern used in BackupService, DeploymentService, IntegrationService, etc.

---

## Overall Assessment

**Grade: B+**

This is a well-structured, well-tested codebase that follows its own roadmap faithfully. The schema design is thorough, the service layer is clean, and the test coverage hits the important happy paths and permission checks. The encryption implementation is production-quality.

The critical gap is cross-tenant enforcement in state transition methods — the `organizationId` parameter is accepted but not actually used for scoping, which creates a real security hole. This must be fixed before any API layer is built on top. The secondary issue is the unused `canEditContent` permission, which means the editor role doesn't work as designed.

Once those issues are addressed, this is a solid backend spine ready for Phase 6 (API layer). The code quality and consistency suggest disciplined execution — the remaining issues are more about completing the security story than fixing bad patterns.
