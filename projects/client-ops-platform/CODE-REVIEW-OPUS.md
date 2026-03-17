# Code Review — Client Ops Platform

**Reviewer:** Kira (Opus)  
**Date:** 2026-03-13  
**Scope:** All source in `src/`, `prisma/`, `tests/`, config files  
**Roadmap reference:** `docs/client-ops-platform-implementation-roadmap.md`

---

## Summary

The codebase implements Phases 0–5 of the roadmap (Foundation through Hardening) with solid fidelity to the intended design. The service layer is clean, tenant isolation is present, secrets are encrypted with AES-256-GCM, and state machine transitions are enforced for releases, jobs, and backups. Tests cover the happy paths and key denial scenarios against a real Postgres database.

The main gaps are: **cross-tenant write protection is incomplete in several services**, **the `getAccess` pattern is duplicated across 5 files**, **`canEditContent` exists but is never used**, and **there is no API layer yet to validate that authorization actually holds at the HTTP boundary**. The foundation is sound — what follows are the real issues that need fixing before this ships.

---

## Architecture Coherence

**Alignment with roadmap: Strong.**

| Roadmap Requirement | Status | Notes |
|---|---|---|
| Prisma + PostgreSQL foundation | ✅ Done | Schema covers all Wave 1–5 models |
| Tenant isolation via organizationId | ⚠️ Partial | Present on all tables, but not enforced on all writes (see Security section) |
| Secrets separated from config | ✅ Done | Separate `DeploymentTargetSecret` and `IntegrationSecret` tables, encrypted at rest |
| Releases and backups first-class | ✅ Done | State machines, version auto-increment, backup lifecycle |
| Service layer before route layer | ✅ Done | All business logic in domain services |
| Tests before implementation | ✅ Done | Test files match all service files |
| TDD gates from roadmap | ✅ Done | All specified gates have corresponding test cases |

**What's missing from the roadmap that should exist by now:**
- No `HealthCheck` service (model exists in schema, no service file)
- No deployment adapter interface (roadmap Phase 4 deliverable)
- `src/server/index.ts` is a placeholder — no Express routes, no middleware

---

## Code Quality

### Strengths
- **Consistent service pattern.** Constructor DI of PrismaClient, private `getAccess()` helper, clear method signatures with typed params objects.
- **Zod validation** for branding input and deployment target configs is well-structured. Type-indexed schema map (`contentBlockValueSchemaByType`, `deploymentTargetConfigSchemas`) is a good pattern.
- **State machines** for releases, jobs, and backups use explicit transition maps — readable and testable.
- **Error classes** are minimal and purposeful. `AuthorizationError` and `NotFoundError` are the right abstractions for this stage.
- **Prisma client singleton** correctly uses the `globalForPrisma` pattern to avoid connection pool exhaustion in dev.

### Issues

**1. Massive `getAccess` duplication (DRY violation — HIGH)**

The following pattern is copy-pasted across 5 service files (`SupportService`, `ServiceCatalogService`, `DeploymentService`, `IntegrationService`, `BackupService`):

```typescript
private async getAccess(actorUserId: string, organizationId: string) {
  const [user, membership] = await Promise.all([
    this.prisma.user.findUniqueOrThrow({ ... }),
    this.prisma.organizationMember.findUnique({ ... }),
  ]);
  return { user, membership };
}
```

This should be extracted to a shared `AccessResolver` or added to `organization-access.ts` as a function that takes a PrismaClient.

**2. `canEditContent` is defined but never called (MEDIUM)**

`src/shared/roles.ts` exports `canEditContent` and `organization-access.ts` has `assertCanManageOrganization` and `assertCanViewOrganization`, but there is no `assertCanEditContent`. The branding service requires management-level access for content block operations, but the roadmap suggests editors should be able to edit content. This is either a missing permission tier or dead code.

**3. ActivityService instantiation in constructors (MEDIUM)**

Several services create their own `ActivityService` instance in the constructor default parameter:
```typescript
constructor(
  private readonly prisma: PrismaClient,
  private readonly activityService = new ActivityService(prisma),
)
```

This works but is slightly fragile — if someone passes a custom PrismaClient but forgets to also pass a matching ActivityService, the default still uses the constructor's `prisma` parameter, which is fine. But it makes testing with mocked activity services awkward and couples service construction. Prefer explicit factory or a shared service container.

**4. No input validation on several service methods (MEDIUM)**

- `SupportService.createRequest` has no length validation on `subject` or `message`
- `ServiceCatalogService.createService` has no validation on `name` or `description`
- `ActivityService.appendEvent` accepts any string for `source` and `eventType` — these should be enums or at least validated

**5. `OrganizationService` duplicates the access-check pattern differently (LOW)**

Unlike the other services, `OrganizationService` inlines the `findUniqueOrThrow` + `findUnique` calls directly rather than using a `getAccess` helper. Consistent pattern would help.

---

## Security Review

### Good
- **Encryption:** AES-256-GCM with per-secret salt, scrypt key derivation, random IV. Auth tags verified. This is production-grade.
- **Secret masking:** `maskSecret()` returns only last 4 chars. Set/get endpoints return masked values, not plaintext.
- **Platform admin bypass:** Correctly checked in all `assert*` functions before role evaluation.
- **Unique constraints:** `@@unique([organizationId, userId])` prevents duplicate memberships. `@@unique([organizationId, key])` prevents content key collisions.

### Critical Issues

**6. Cross-tenant write protection missing on `updateRequestStatus` (CRITICAL)**

`SupportService.updateRequestStatus` verifies the actor can manage `params.organizationId`, then updates the request by `params.requestId` alone — without verifying the request actually belongs to that organization:

```typescript
const request = await this.prisma.supportRequest.update({
  where: { id: params.requestId },  // No organizationId check!
  data: { ... },
});
```

An admin of org A could update a support request belonging to org B by passing org A's `organizationId` (passes the access check) and org B's `requestId`. Same pattern exists in:

- `DeploymentService.transitionReleaseStatus` — fetches release by ID only
- `DeploymentService.transitionJobStatus` — fetches job by ID only
- `BackupService.transitionBackupStatus` — fetches backup by ID only
- `ServiceCatalogService.updateServiceStatus` — updates service by ID only

**Fix:** Add `organizationId` to the `where` clause on all cross-tenant-sensitive updates, or verify after fetch that the entity's `organizationId` matches.

**7. `getTargetSecretDecrypted` and `getSecretDecrypted` have no access control (HIGH)**

```typescript
async getTargetSecretDecrypted(deploymentTargetId: string, secretKey: string): Promise<string> {
  const secret = await this.prisma.deploymentTargetSecret.findUniqueOrThrow({ ... });
  return decrypt(secret.encryptedValue);
}
```

No `actorUserId`, no `organizationId`, no access check. Anyone who can call this method gets the plaintext secret. This is presumably for internal/system use during deployments, but it should still verify the caller's access or at minimum require the `organizationId` to scope the query.

**8. `IntegrationService.updateStatus` has no access control (HIGH)**

```typescript
async updateStatus(params: {
  integrationConnectionId: string;
  status: IntegrationStatus;
  lastError?: string;
}) {
```

No `actorUserId`, no `organizationId`. Any caller can change any integration's status. Needs either access control or explicit documentation that this is a system-only method.

**9. No rate limiting or request size limits (MEDIUM)**

No middleware exists yet (server is a placeholder), but when the API layer is built, there's no foundation for rate limiting, request body size limits, or CORS configuration. The `package.json` includes `cors` and `cookie-parser` as dependencies — good that they're ready, but nothing is wired up.

**10. ENCRYPTION_MASTER_KEY validation is runtime-only (LOW)**

If `ENCRYPTION_MASTER_KEY` is missing or too short, the error only fires when `encrypt`/`decrypt` is first called, not at startup. For a system where secrets are critical, validate this at boot time.

---

## Test Coverage

### What's well-covered
- Organization membership CRUD and access control (unit + integration)
- Role permission matrix (all 5 roles, all 3 permission levels)
- Branding validation (colors, emails, content block types)
- Published vs draft snapshot filtering
- Secret encryption round-trip + ciphertext uniqueness
- State machine transitions (releases, jobs, backups) including invalid transitions
- Activity event creation as side effect
- Audit log creation as side effect
- Cross-role denial (viewer can't manage, client can't update status)

### Gaps

**11. No cross-tenant isolation tests (CRITICAL)**

No test verifies that org A's admin cannot access org B's resources. This is the #1 invariant of the system and has zero test coverage. Specifically needed:
- Org A admin tries to read org B's branding → denied
- Org A admin tries to update org B's support request → denied
- Org A admin tries to list org B's services → denied

**12. No test for `buildPublishedSnapshot` with no branding set (MEDIUM)**

What happens when `buildPublishedSnapshot` is called for an org with no brand settings? The code returns `branding: null` which is fine, but it's untested.

**13. No test for concurrent release version creation (MEDIUM)**

The release auto-increment uses `findFirst` + `create` (not atomic). Two concurrent `createRelease` calls could race and attempt the same version number. The `@@unique([organizationId, releaseVersion])` constraint would catch it at the DB level, but there's no test and no retry logic.

**14. No tests for the seed script (LOW)**

The seed script is tested only for file existence (`roadmap-files.test.ts`), not for actual execution correctness.

**15. No tests for `ActivityService.listRecent` or `BackupService.listBackups` (LOW)**

These list methods have no dedicated test coverage (they're exercised indirectly but not asserted on).

**16. `infrastructure-files.test.ts` tests file existence, not correctness (LOW)**

Checks that `docker-compose.yml` exists and contains certain strings, but doesn't validate the YAML is actually parseable or the service is correctly configured.

---

## Issues Found

| # | Severity | Category | Description |
|---|---|---|---|
| 6 | 🔴 CRITICAL | Security | Cross-tenant writes not scoped by `organizationId` in update/transition methods |
| 11 | 🔴 CRITICAL | Testing | Zero cross-tenant isolation tests |
| 7 | 🟠 HIGH | Security | `getTargetSecretDecrypted` / `getSecretDecrypted` have no access control |
| 8 | 🟠 HIGH | Security | `IntegrationService.updateStatus` has no access control |
| 1 | 🟠 HIGH | DRY | `getAccess` pattern duplicated across 5 service files |
| 2 | 🟡 MEDIUM | Design | `canEditContent` defined but unused — missing permission tier |
| 3 | 🟡 MEDIUM | Design | ActivityService auto-instantiation in constructor defaults |
| 4 | 🟡 MEDIUM | Validation | No input validation on support request subjects, service names |
| 13 | 🟡 MEDIUM | Correctness | Release version auto-increment is not atomic (race condition) |
| 10 | 🟢 LOW | Ops | ENCRYPTION_MASTER_KEY validated at call time, not boot time |
| 12 | 🟢 LOW | Testing | No test for snapshot with missing branding |
| 5 | 🟢 LOW | Consistency | OrganizationService access pattern differs from other services |

---

## Recommendations

### Immediate (before API layer)

1. **Fix cross-tenant scoping.** Every `update`/`findUniqueOrThrow` in transition methods must include `organizationId` in the where clause. This is the single most important fix.

2. **Add cross-tenant isolation tests.** Create a test file `tests/tenant-isolation.int.test.ts` that sets up two orgs and verifies that operations from one org cannot affect the other.

3. **Extract `getAccess` to a shared module.** Create `src/core/access-resolver.ts`:
   ```typescript
   export async function resolveAccess(prisma: PrismaClient, actorUserId: string, organizationId: string): Promise<AccessContext>
   ```

4. **Add access control to secret decryption and status update methods.** Either require `actorUserId` + `organizationId` with access checks, or clearly mark these as `@internal` system methods and ensure the API layer never exposes them directly.

### Before shipping

5. **Implement the `canEditContent` permission tier** or remove it. The roadmap says editors should edit content — currently they can't because `upsertContentBlock` uses `assertCanManageOrganization`.

6. **Add Zod validation** to `SupportService.createRequest` (subject length, message length) and `ServiceCatalogService.createService` (name validation).

7. **Make release version increment atomic** — use a Prisma transaction with `findFirst` + `create` inside `$transaction` with serializable isolation, or use a raw `INSERT ... SELECT MAX(releaseVersion)+1` approach.

8. **Validate ENCRYPTION_MASTER_KEY at module load** rather than lazily on first encrypt/decrypt call.

9. **Build the HealthCheck service** — the model exists in schema but has no service layer.

10. **Build the deployment adapter interface** — the roadmap lists this as a Phase 4 deliverable.

### Architecture notes for API layer (Phase 6)

- The service layer is well-positioned for thin route handlers. Each service method already takes typed params and throws typed errors.
- Map `AuthorizationError` → 403, `NotFoundError` → 404, Zod errors → 400 in error middleware.
- The `AuditService.log` already accepts `ipAddress` and `userAgent` — wire these from Express `req` at the route layer.
- Consider adding a `requestId` (correlation ID) to audit logs for traceability.

---

## Overall Assessment

**Grade: B+**

This is a well-structured foundation that follows the roadmap closely. The service-layer-first approach is paying off — business logic is testable, typed, and separated from transport concerns. The encryption implementation is production-grade. The Prisma schema is comprehensive and properly indexed.

The critical gap is **cross-tenant write isolation** — the authorization checks verify the actor's access to an organization, but several update operations don't verify the target entity belongs to that organization. This is the kind of bug that's invisible until a multi-tenant deployment and then becomes a data breach. Fix it before building the API layer.

The test suite is strong for a Phase 5 codebase but needs cross-tenant tests as the single most important addition. The DRY issues are real but not blocking — they should be cleaned up before the codebase grows further in Phase 6.

The codebase is ready to move to Phase 6 (API layer) after addressing issues #6, #7, #8, and #11.
