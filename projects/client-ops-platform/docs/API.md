# API Reference

Base URL: `http://localhost:4000`

All org-scoped endpoints require the `X-User-Id` header and use the org ID in the URL path.

---

## Health

### `GET /health`
Returns `{ "status": "ok" }`.

---

## Organization

### `GET /orgs/:orgId`
Fetch organization details.

**Response:** `{ "data": { "id", "name", "slug", "status", "members": [...] } }`

---

## Branding

### `GET /orgs/:orgId/branding`
Get current brand settings.

### `PATCH /orgs/:orgId/branding`
Update brand settings.

**Body:** Any subset of:
```json
{
  "companyDisplayName": "string",
  "primaryColor": "#hex",
  "secondaryColor": "#hex",
  "accentColor": "#hex",
  "fontHeading": "string",
  "fontBody": "string",
  "heroTitle": "string",
  "heroSubtitle": "string",
  "ctaText": "string",
  "aboutText": "string",
  "contactEmail": "string",
  "contactPhone": "string"
}
```

---

## Services

### `GET /orgs/:orgId/services`
List all services for the organization.

### `POST /orgs/:orgId/services`
Create a service.

**Body:**
```json
{
  "name": "string (required, 1-200 chars)",
  "type": "website|cms|email|dns|hosting|analytics|ecommerce|custom",
  "status": "active|paused|error|setup"
}
```

### `PATCH /orgs/:orgId/services/:serviceId/status`
Update service status.

**Body:** `{ "status": "active|paused|error|setup" }`

---

## Support

### `GET /orgs/:orgId/support`
List support requests.

### `POST /orgs/:orgId/support`
Create a support request.

**Body:**
```json
{
  "subject": "string (required, 1-200 chars)",
  "message": "string (required, 1-5000 chars)",
  "priority": "low|normal|high|urgent"
}
```

### `PATCH /orgs/:orgId/support/:requestId/status`
Update request status.

**Body:** `{ "status": "open|in_progress|resolved|closed" }`

---

## Activity

### `GET /orgs/:orgId/activity`
List activity events.

**Query params:** `limit` (default 20)

---

## Deployment Targets

### `GET /orgs/:orgId/deployment-targets`
List deployment targets.

### `POST /orgs/:orgId/deployment-targets`
Create a deployment target.

**Body:**
```json
{
  "name": "string",
  "targetType": "sftp|local_fs|s3|github_pages|netlify|vercel|cloudflare_pages",
  "config": { /* type-specific config */ },
  "isPrimary": false
}
```

### `PUT /orgs/:orgId/deployment-targets/:targetId/secret`
Set an encrypted secret on a target.

**Body:** `{ "secretKey": "string", "plainValue": "string" }`

---

## Deployment Jobs

### `GET /orgs/:orgId/jobs`
List deployment jobs.

### `POST /orgs/:orgId/jobs`
Create a deployment job.

**Body:**
```json
{
  "deploymentTargetId": "string",
  "jobType": "publish|rollback|preview|backup_deploy"
}
```

---

## Releases

### `POST /orgs/:orgId/releases`
Create a release.

**Body:** `{ "sourceType": "config_export|content_snapshot|full_bundle" }`

---

## Integrations

### `GET /orgs/:orgId/integrations`
List integration connections.

### `POST /orgs/:orgId/integrations`
Create an integration connection.

**Body:**
```json
{
  "type": "ghost|retell|webhook|smtp|analytics|custom",
  "name": "string"
}
```

### `PUT /orgs/:orgId/integrations/:connectionId/secret`
Set an encrypted secret on an integration.

**Body:** `{ "secretKey": "string", "plainValue": "string" }`

### `PATCH /orgs/:orgId/integrations/:connectionId/status`
Update integration status.

**Body:** `{ "status": "setup|connected|disconnected|error" }`

---

## Backups

### `GET /orgs/:orgId/backups`
List backups.

### `POST /orgs/:orgId/backups`
Create a backup.

**Body:** `{ "kind": "site_bundle|database|media|config" }`

---

## Audit

### `GET /orgs/:orgId/audit`
List audit log entries.

**Query params:** `limit` (default 50)

---

## Error Format

All errors return:
```json
{ "error": "Human-readable error message" }
```

HTTP status codes: 400 (bad request), 403 (forbidden), 404 (not found), 500 (internal).
