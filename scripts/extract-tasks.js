const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwMG1saWFtdGJxODliMWRhZWFiZmE1YTkzOCIsInJvbGUiOiJhZG1pbiIsInRpZXIiOiJmcmVlLWFjY2VzcyIsImlhdCI6MTc3MDg5ODE2MiwiZXhwIjoxNzcwODk5MDYyfQ.HMXj2-DRGxcMn68ZIerrPPjU8WqAls59BY-ckT2o8K4";
const API = "http://localhost:3847";
const PROJECT_ID = "37a3074d-9af7-40fd-9c79-dcb0f2329630";

async function post(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok) console.error(`FAIL ${path}:`, j);
  return j;
}

const tasks = [
  // === 01 - MARKETING SITE ===
  { title: "Build splash/landing page (single-page scroll)", description: "01-marketing: Hero section, features grid, how-it-works, pricing cards, footer. Dark theme (#0F1117 bg, #7C3AED accent). Responsive. Route: / for unauthenticated users.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Auth modal overlays (login + signup)", description: "01-marketing: Inline modal overlays on splash page for login/signup. No separate pages. Sign up → email verification → JWT → redirect to dashboard.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Email verification flow (6-digit code)", description: "01-marketing: After register, show 'Enter verification code' input. POST /api/auth/verify. 15min expiry, 3 attempts max.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Routing logic: auth-gated splash vs dashboard", description: "01-marketing: If authenticated → DashboardRoutes, if not → SplashPage, any other path → redirect to /.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Responsive mobile layout for splash page", description: "01-marketing: Single column on small screens. All sections stack vertically.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Scroll animations (fade-in, gradient shifts)", description: "01-marketing: Subtle animations on scroll. No heavy assets. Gradient shifts, fade-ins.", priority: "P3", effort: "S", status: "backlog" },

  // === 02 - ARCHITECTURE ===
  { title: "Monorepo scaffold with workspace packages", description: "02-architecture: packages/api, packages/dashboard, packages/core. package.json workspaces. TypeScript config.", priority: "P0", effort: "S", status: "backlog" },
  { title: "API server (raw Node.js HTTP, no Express)", description: "02-architecture: Node.js 22+ with --experimental-strip-types. Raw http module. Modular route handlers in src/routes/.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Dashboard React SPA with Vite + Tailwind", description: "02-architecture: React 18 + Vite build. Tailwind CSS. Vite proxies /api/* to localhost:3001 in dev.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Shared core package (types, memory, auth, AI)", description: "02-architecture: packages/core with shared types, memory engine, AI providers, auth helpers.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Docker + docker-compose setup", description: "02-architecture: Dockerfile (multi-stage), docker-compose.yml with volume for /data. Healthcheck endpoint.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Environment variable configuration system", description: "02-architecture: All config via env vars. .env.example file. KIRA_PORT, KIRA_DATA_DIR, KIRA_JWT_SECRET, etc.", priority: "P0", effort: "S", status: "backlog" },

  // === 03 - MULTI-TENANCY ===
  { title: "System SQLite database (users, sessions, usage, rate_limits)", description: "03-multi-tenancy: /data/system.db with users, sessions, usage_log, rate_limits tables. ULID primary keys.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Per-user SQLite databases (kira.db, memory.db, settings.db)", description: "03-multi-tenancy: /data/users/{user_id}/ directory with isolated DBs. Created on registration.", priority: "P0", effort: "M", status: "backlog" },
  { title: "getUserDb() with path traversal protection", description: "03-multi-tenancy: DB connection factory. Always returns user-scoped DB. Path traversal check prevents escape.", priority: "P0", effort: "S", status: "backlog" },
  { title: "File access scoping (getUserFilePath)", description: "03-multi-tenancy: File operations scoped to /data/users/{id}/files/. Path traversal prevention.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Tier-based quota system", description: "03-multi-tenancy: Quotas per tier (free: 50msg/day, 500K tokens/mo, 100MB. Pro: unlimited. free-access: pro features, no charge).", priority: "P1", effort: "M", status: "backlog" },
  { title: "Admin panel: user list, tier management, disable accounts", description: "03-multi-tenancy: Admin can view users, adjust tiers, disable accounts. Cannot read user data.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Data export (ZIP download of all user data)", description: "03-multi-tenancy: User can export all SQLite dumps + files + memory graph as ZIP.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Account deletion with 30-day grace period", description: "03-multi-tenancy: Disable immediately, delete after 30 days. Retain anonymized usage stats.", priority: "P2", effort: "S", status: "backlog" },

  // === 04 - AUTH ===
  { title: "User registration endpoint (email + password)", description: "04-auth: POST /api/auth/register. Min 8 chars password (NIST). bcrypt hash (cost 12). Email verification required.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Login endpoint with JWT + refresh token pair", description: "04-auth: POST /api/auth/login. JWT (15min) with {sub, role, tier}. Refresh token (30d) stored hashed.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Token refresh with rotation + theft detection", description: "04-auth: POST /api/auth/refresh. Rotate both tokens. If old refresh reused → revoke ALL user sessions.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Auth middleware (JWT validation on every request)", description: "04-auth: Extract Bearer token, verify JWT, inject user_id + role into request. HMAC-SHA256.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Rate limiting on auth endpoints", description: "04-auth: 5 attempts/15min per email. After 10 failures: 30min lockout. Generic error messages.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Frontend auth flow (apiFetch with auto-refresh)", description: "04-auth: apiFetch() handles 401 → refresh → retry. Token storage in localStorage. AuthGuard component.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Logout endpoint (revoke session)", description: "04-auth: POST /api/auth/logout. Revoke current session refresh token.", priority: "P1", effort: "S", status: "backlog" },
  { title: "OAuth (Google + GitHub) login", description: "04-auth: Future. Creates account on first login. Links to existing if email matches.", priority: "P3", effort: "L", status: "backlog" },

  // === 05 - API SPEC ===
  { title: "Standard API response envelope", description: "05-api-spec: Every endpoint returns {data, error, meta}. meta includes requestId (ULID) + timestamp.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Pagination support on list endpoints", description: "05-api-spec: ?limit=50&offset=0. Response meta.pagination includes offset, limit, total.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Health check endpoint (public)", description: "05-api-spec: GET /api/health → {status:'ok', version, uptime}.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Chat API endpoints (sessions CRUD + send + SSE streaming)", description: "05-api-spec: GET/POST/DELETE /api/chat/sessions, GET messages, POST /api/chat with optional stream:true → SSE.", priority: "P1", effort: "L", status: "backlog" },
  { title: "Tasks API endpoints (CRUD + filters)", description: "05-api-spec: GET/POST/PATCH/DELETE /api/tasks. Filter by status, priority.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Goals API endpoints (CRUD)", description: "05-api-spec: GET/POST/PATCH/DELETE /api/goals.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Documents API endpoints (tree, upload, download, mkdir, delete)", description: "05-api-spec: GET /api/documents/tree, GET/POST/DELETE /api/documents/*path, PUT /api/documents/mkdir.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Knowledge API endpoints (entities, search, stats)", description: "05-api-spec: GET /api/knowledge/entities, GET /api/knowledge/search, GET /api/knowledge/stats.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Settings API endpoints (providers, preferences, account)", description: "05-api-spec: CRUD for providers, PATCH preferences, PATCH account.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Usage API endpoints", description: "05-api-spec: GET /api/usage (summary with byModel, byDay), GET /api/usage/recent.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Admin API endpoints (users, usage, health)", description: "05-api-spec: GET /api/admin/users, PATCH user, GET admin usage, GET admin health. Role check.", priority: "P2", effort: "M", status: "backlog" },

  // === 06 - AI PROVIDERS ===
  { title: "LLMProvider interface (chat + stream methods)", description: "06-providers: Interface with chat() and stream() returning ChatResponse/AsyncIterable<StreamChunk>.", priority: "P0", effort: "S", status: "backlog" },
  { title: "OpenAI-compatible provider (OpenRouter + OpenAI)", description: "06-providers: Pure fetch, no SDKs. Shared class for OpenRouter and OpenAI. Streaming via SSE.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Anthropic Messages API provider", description: "06-providers: Pure fetch. Claude family. Messages API format.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Ollama provider (local models)", description: "06-providers: Ollama API. No auth. Fetch model list from /api/tags.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Provider resolution chain", description: "06-providers: 1) User's own config → 2) Server default → 3) Local Ollama → 4) Error.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Per-user API key encryption (AES-256-GCM)", description: "06-providers: Keys encrypted with scrypt(KIRA_ENCRYPTION_KEY + userId). Unique IV per key.", priority: "P0", effort: "M", status: "backlog" },
  { title: "Usage tracking (log every LLM call)", description: "06-providers: INSERT into usage_log. Track model, tokens, cost. OpenRouter x-openrouter-cost header.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Quota enforcement before LLM calls", description: "06-providers: Check messagesPerDay + tokensPerMonth before call. 429 if exceeded.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Model list fetching (OpenRouter API, Ollama tags)", description: "06-providers: Dynamic model list for OpenRouter. Hardcoded for Anthropic/OpenAI. Dynamic for Ollama.", priority: "P2", effort: "S", status: "backlog" },

  // === 07 - DASHBOARD ===
  { title: "NavShell sidebar (collapsed/expanded, icon nav)", description: "07-dashboard: 56px collapsed, 200px expanded on hover. Icons: Overview, Chat, Tasks, Documents, Knowledge, Settings. Violet active border. User avatar at bottom.", priority: "P0", effort: "M", status: "backlog" },
  { title: "AuthGuard route wrapper", description: "07-dashboard: Checks useAuth(). Loading → FullPageSkeleton. No user → redirect /login. Otherwise → Outlet.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Error boundary per route", description: "07-dashboard: Wraps each page. Shows PageError with retry + go home. Never kills sidebar.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Design system (CSS tokens, colors, typography)", description: "07-dashboard: CSS variables for all colors. Inter font. 14px base. Tailwind config with custom colors.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Loading skeleton components", description: "07-dashboard: Skeleton screens for every page. No spinners.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Empty state components", description: "07-dashboard: Every page has meaningful empty state with action button.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Overview page (stats, greeting, quick priorities, activity feed)", description: "07-dashboard: Time-aware greeting. 4 stat cards. Top 3 tasks. Recent activity. Quick action buttons.", priority: "P1", effort: "M", status: "backlog" },
  { title: "React Router setup with all page routes", description: "07-dashboard: BrowserRouter with protected routes. /, /chat, /tasks, /documents, /knowledge, /settings.", priority: "P0", effort: "S", status: "backlog" },

  // === 08 - CHAT ===
  { title: "Chat UI (Discord-style, no bubbles)", description: "08-chat: Message list with avatar + name + timestamp. No left/right alignment. Gradient fade at top.", priority: "P1", effort: "L", status: "backlog" },
  { title: "SSE streaming for assistant responses", description: "08-chat: Stream thinking → tool_use → text → done events. Auto-expand thinking while streaming.", priority: "P1", effort: "L", status: "backlog" },
  { title: "Collapsible thinking + tool_use blocks", description: "08-chat: Thinking block (dimmed, collapsible). Tool use blocks (name + input + output, collapsible).", priority: "P1", effort: "M", status: "backlog" },
  { title: "Chat session management (create, switch, delete)", description: "08-chat: Multiple sessions. Session selector tabs/dropdown. New Chat button. Independent histories.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Chat input bar (auto-grow textarea, model selector, send)", description: "08-chat: Auto-growing textarea (max 6 lines). Model dropdown. Enter=send, Shift+Enter=newline.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Chat status bar (connection, model, tokens)", description: "08-chat: Bottom bar. Connected/Disconnected indicator. Current model. Session token count.", priority: "P2", effort: "S", status: "backlog" },
  { title: "System prompt generation from user context", description: "08-chat: Per-user, per-session system prompt with display name, memory snippets, active tasks, goals.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Markdown rendering in chat messages", description: "08-chat: Code blocks, lists, links, bold, italic. Syntax highlighting for code.", priority: "P1", effort: "M", status: "backlog" },

  // === 09 - MEMORY ===
  { title: "4-layer memory schema (episodic, semantic, procedural, working)", description: "09-memory: Per-user memory.db with episodes, entities, relationships, procedures, working tables.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Memory retrieval before LLM calls", description: "09-memory: Search episodic for context, pull entities, check procedures. Inject max 2000 tokens into system prompt.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Episodic memory CRUD", description: "09-memory: Store conversations and events with importance scoring and tags.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Semantic memory (knowledge graph storage)", description: "09-memory: Entities + relationships tables. CRUD. Properties as JSON.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Working memory (temporary blackboard)", description: "09-memory: Key-value with expiry. Current context and active focus.", priority: "P2", effort: "S", status: "backlog" },

  // === 10 - TASKS & GOALS ===
  { title: "Tasks schema and CRUD service", description: "10-tasks: tasks table in kira.db. CRUD with status (todo/in_progress/review/done), priority (0-3), tags, position.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Kanban board UI with drag & drop", description: "10-tasks: 4 columns. Drag between columns. Priority badges (P0 red, P1 orange, P2 yellow, P3 gray). Filters.", priority: "P1", effort: "L", status: "backlog" },
  { title: "Task detail view (expand on click)", description: "10-tasks: Inline expandable form. Title, description, priority, due date, tags.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Goals schema and CRUD service", description: "10-tasks: goals table in kira.db. Active/completed/archived. Progress 0-100. Milestones as JSON.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Goals UI with milestone tracking", description: "10-tasks: Goals list with progress bars. Click to expand milestones. Mark milestones done.", priority: "P2", effort: "M", status: "backlog" },

  // === 11 - DOCUMENTS ===
  { title: "Visual card grid for documents (not file tree)", description: "11-documents: Cards with banner, icon, title, metadata, tags. Auto-generated defaults by file type. Grid + list view toggle.", priority: "P1", effort: "L", status: "backlog" },
  { title: "Document card customization (banner, icon, color, tags)", description: "11-documents: Users and agents can customize. Emoji picker, image upload, color picker.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Breadcrumb navigation for folders", description: "11-documents: Home > Projects > ZenithCred. Click to jump.", priority: "P1", effort: "S", status: "backlog" },
  { title: "File upload (drag & drop + button)", description: "11-documents: Drag from desktop. Click [+ New]. Paste images. multipart/form-data upload.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Document preview panel (markdown, images, PDF, code)", description: "11-documents: Slide-in panel. Render markdown, display images, embed PDF, syntax highlight code.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Agent document operations (auto-filing, tagging, enrichment)", description: "11-documents: Agent tools: createDocument, createFolder, moveDocument, tagDocument, enrichDocument.", priority: "P2", effort: "L", status: "backlog" },
  { title: "Document search (full-text + tags + type)", description: "11-documents: Global search across all documents. Results as cards.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Context menu (right-click) for document actions", description: "11-documents: Open, edit metadata, move, duplicate, download, delete.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Drag & drop reordering and moving into folders", description: "11-documents: Drag cards to reorder. Drag into folder cards to move.", priority: "P2", effort: "M", status: "backlog" },

  // === 12 - KNOWLEDGE GRAPH ===
  { title: "Knowledge entity list view with search + filter", description: "12-knowledge: List view. Search by name. Filter by type (person, project, company, etc.).", priority: "P1", effort: "M", status: "backlog" },
  { title: "Entity detail view (properties, relationships, mentions)", description: "12-knowledge: Click entity → detail panel with properties, related entities, mention history.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Force-directed graph visualization (D3)", description: "12-knowledge: Future. Interactive graph view of entities and relationships.", priority: "P3", effort: "L", status: "backlog" },

  // === 13 - ONBOARDING ===
  { title: "Post-signup onboarding wizard (4 steps)", description: "13-onboarding: Welcome → Connect AI → Name Agent → First Chat. Every step skippable. Tracked by setup_completed flag.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Onboarding: Connect AI step (add API key)", description: "13-onboarding: OpenRouter recommended. Skip to use server default. Test connection button.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Onboarding: resume on return if incomplete", description: "13-onboarding: If user navigates away mid-wizard, resume on next visit. Never shows after completion.", priority: "P2", effort: "S", status: "backlog" },

  // === 14 - SETTINGS ===
  { title: "Account settings (display name, password change)", description: "14-settings: Edit display name. Change password. Email read-only (change = re-verify).", priority: "P1", effort: "M", status: "backlog" },
  { title: "AI provider management UI (add/remove/test keys)", description: "14-settings: List providers with masked key + status. Add: type dropdown + key input + test button. Remove.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Usage display (charts, cost, quota status)", description: "14-settings: Tokens by day bar chart. Cost estimate. Model breakdown. Quota status for free tier.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Preferences settings (theme, default model)", description: "14-settings: Theme toggle (dark default, light future). Default model selection.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Data management (export + delete account)", description: "14-settings: Export all data as ZIP. Delete account with confirmation + 30-day grace.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Admin section in settings", description: "14-settings: User list, disable/enable, adjust tiers, system health. Admin role only.", priority: "P2", effort: "L", status: "backlog" },

  // === 15 - ERROR HANDLING ===
  { title: "PageError component (retry + go home)", description: "15-errors: Red warning icon. Error message (sanitized). [Retry] remounts component. [Go Home] navigates.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Global API error handler (server-side)", description: "15-errors: try/catch wrapper. Log full stack server-side. Return sanitized {data:null, error:{code,message,requestId}}.", priority: "P0", effort: "S", status: "backlog" },
  { title: "Custom error classes (NotFound, Forbidden, RateLimit, QuotaExceeded)", description: "15-errors: AppError base class. NotFoundError(404), ForbiddenError(403), RateLimitError(429), QuotaExceededError(429).", priority: "P0", effort: "S", status: "backlog" },
  { title: "Toast/banner system for non-fatal errors", description: "15-errors: In-page error banners for API failures. Not white screens.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Build verification (CSS file size check)", description: "15-errors: Post-build check: CSS > 15KB. Prevent shipping unstyled pages.", priority: "P1", effort: "S", status: "backlog" },

  // === 16 - TESTING ===
  { title: "Automated deploy checks script", description: "16-testing: Build check, server starts, auth flow, protected endpoint, chat works. Runs in CI.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Unit tests for core package (memory, auth, tasks, providers)", description: "16-testing: Memory CRUD+search. Auth hashing+JWT. Tasks CRUD+queries. Provider request/response (mocked).", priority: "P1", effort: "L", status: "backlog" },
  { title: "Manual verification checklist (pre-deploy)", description: "16-testing: Incognito → register → login → every page → refresh → chat → tasks → documents → settings → logout → mobile.", priority: "P1", effort: "S", status: "backlog" },

  // === 17 - DEPLOYMENT ===
  { title: "Production Dockerfile (multi-stage build)", description: "17-deployment: Builder stage: vite build. Production stage: node:22-slim. Rebuild better-sqlite3. Healthcheck.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Cloudflare Tunnel setup for HTTPS", description: "17-deployment: CF Tunnel to Docker :3001. No exposed ports. SSL handled by Cloudflare.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Domain setup (marketing + platform + API)", description: "17-deployment: kira.ai → CF Pages. app.kira.ai → CF Tunnel → Docker. Optional api.kira.ai.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Automated backup (daily tar + offsite)", description: "17-deployment: Cron job: daily tar of /data volume. rsync to backup server or S3.", priority: "P2", effort: "S", status: "backlog" },
  { title: "Uptime monitoring setup", description: "17-deployment: UptimeRobot or similar. Monitor healthcheck endpoint.", priority: "P2", effort: "S", status: "backlog" },

  // === 18 - BUILD ORDER (meta-tasks) ===
  { title: "Phase 0: Project setup verification gate", description: "18-build-order: npm install succeeds, vite build produces output, Docker builds and starts.", priority: "P0", effort: "S", status: "backlog" },

  // === 19 - BILLING ===
  { title: "Stripe Checkout integration (Free → Pro upgrade)", description: "19-billing: POST /api/billing/checkout → Stripe Checkout Session → redirect. Webhook: checkout.session.completed → set tier=pro.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Stripe Customer Portal (manage/cancel)", description: "19-billing: POST /api/billing/portal → Stripe Portal. Webhook: subscription.deleted → downgrade to free.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Stripe webhook handler (subscription lifecycle)", description: "19-billing: Handle checkout.completed, subscription.updated, subscription.deleted, invoice.payment_failed, invoice.paid.", priority: "P1", effort: "M", status: "backlog" },
  { title: "Billing status API endpoint", description: "19-billing: GET /api/billing/status → current tier, subscription status, next billing date.", priority: "P1", effort: "S", status: "backlog" },
  { title: "Billing section in Settings UI", description: "19-billing: Free users: upgrade card. Pro users: plan info, manage billing button. Usage stats.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Free-access tier for testing accounts", description: "19-billing: Admin can set tier=free-access. Pro features, no charge. Visible in admin panel.", priority: "P1", effort: "S", status: "backlog" },

  // === 19 - GDPR (mapped from design doc list) ===
  // (No explicit GDPR doc, but 03-multi-tenancy covers it)

  // === 20 - LIVE PROCESSES ===
  { title: "Processes table + API (CRUD for tracked processes)", description: "20-processes: processes table with type, status, progress, rate, ETA, log_tail. GET/POST/PATCH/DELETE /api/processes.", priority: "P2", effort: "M", status: "backlog" },
  { title: "ProcessReporter SDK for scripts/daemons", description: "20-processes: Lightweight JS class. create → update(current, logLine) → done/fail. Auto-calculates rate + ETA.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Active Processes widget on Overview page", description: "20-processes: Compact card showing running processes with progress bars, rate, ETA. Done items fade after 30min.", priority: "P2", effort: "M", status: "backlog" },
  { title: "Full Processes page (/processes)", description: "20-processes: Active + History tabs. Expandable process detail with full log. Nested sub-processes. Cancel button. Auto-refresh.", priority: "P2", effort: "L", status: "backlog" },
  { title: "Wire ProcessReporter into sub-agents + daemons", description: "20-processes: Integrate with OpenClaw sub-agents, PM2 daemons, cron jobs, backfill scripts.", priority: "P3", effort: "M", status: "backlog" },
  { title: "Add Processes to sidebar navigation", description: "20-processes: ⚡ Processes at /processes. Between Knowledge and Settings.", priority: "P2", effort: "S", status: "backlog" },
];

async function main() {
  let created = 0, failed = 0;
  const subtaskMap = {};

  for (const t of tasks) {
    const body = {
      title: t.title,
      description: t.description,
      project_id: PROJECT_ID,
      status: t.status || 'backlog',
      priority: t.priority || 'P2',
      effort: t.effort || 'M',
      assignee: 'kira'
    };
    const result = await post('/api/tasks', body);
    if (result && (result.id || (result.data && result.data.id))) {
      created++;
      const id = result.id || result.data?.id;
      // Store for subtasks
      if (t.title.includes('Kanban board')) {
        subtaskMap['kanban'] = id;
      } else if (t.title.includes('Chat UI')) {
        subtaskMap['chatui'] = id;
      } else if (t.title.includes('Visual card grid')) {
        subtaskMap['docgrid'] = id;
      } else if (t.title.includes('4-layer memory')) {
        subtaskMap['memory'] = id;
      } else if (t.title.includes('Auth modal')) {
        subtaskMap['authmodal'] = id;
      } else if (t.title.includes('Stripe Checkout')) {
        subtaskMap['stripe'] = id;
      }
    } else {
      failed++;
    }
  }

  // Create subtasks for complex tasks
  const subtasks = [
    { key: 'kanban', titles: ['Implement drag & drop library (dnd-kit or similar)', 'Task card component with priority badge', 'Column headers with task count', 'Filter bar (assignee, tag, priority)', 'Sort options (due date, priority, created)', 'Inline add task form'] },
    { key: 'chatui', titles: ['Message component (user + assistant variants)', 'Collapsible thinking block component', 'Collapsible tool_use block component', 'SSE event stream parser', 'Auto-scroll to bottom on new messages', 'Message history loading with pagination'] },
    { key: 'docgrid', titles: ['Document card component with banner + icon', 'Folder card component', 'Auto-gradient generation by file type', 'Grid/List view toggle', 'Responsive card grid layout'] },
    { key: 'memory', titles: ['Episodes table + CRUD', 'Entities table + CRUD', 'Relationships table + CRUD', 'Procedures table + CRUD', 'Working memory table with expiry cleanup'] },
    { key: 'authmodal', titles: ['Sign up form with validation', 'Login form with validation', 'Verification code input (6-digit)', 'Modal overlay component', 'Form error display'] },
    { key: 'stripe', titles: ['Create Stripe Checkout session endpoint', 'Handle checkout.session.completed webhook', 'Update user tier on successful payment', 'Redirect flow (app → Stripe → app)'] },
  ];

  let subtaskCount = 0;
  for (const s of subtasks) {
    const taskId = subtaskMap[s.key];
    if (!taskId) continue;
    for (const title of s.titles) {
      const result = await post('/api/subtasks', { task_id: taskId, title });
      if (result && !result.error) subtaskCount++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Tasks created: ${created}`);
  console.log(`Tasks failed: ${failed}`);
  console.log(`Subtasks created: ${subtaskCount}`);
  console.log(`Total items: ${created + subtaskCount}`);
}

main().catch(console.error);
