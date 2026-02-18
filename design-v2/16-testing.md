# 16 — Testing Strategy

> Nothing ships without being tested. Period.

---

## What Gets Tested

### Before Every Deploy

| Check | How | Pass Criteria |
|-------|-----|--------------|
| Build succeeds | `vite build` exits 0 | No errors |
| CSS is real | Check output CSS > 15KB | Tailwind classes present |
| Auth flow works | Login → get token → /api/auth/me returns user | 200 + valid user |
| Every page loads | Navigate to each route, no JS errors | No white screens |
| Page refresh works | Hard refresh on each route | Auth persists, page renders |
| Chat sends message | Send message → get AI response | Response contains content |
| API returns envelope | Every endpoint returns `{ data, error, meta }` | Schema matches |

### Automated (run in CI)

```bash
# 1. Build check
cd packages/dashboard && npx vite build
CSS_SIZE=$(wc -c < dist/assets/*.css)
[ "$CSS_SIZE" -gt 15000 ] || exit 1

# 2. Server starts
cd packages/api && timeout 10 node --experimental-strip-types src/server.ts &
sleep 3
curl -f http://localhost:3001/api/health || exit 1

# 3. Auth flow
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@test.com","password":"test1234"}' | jq -r '.data.token')
[ "$TOKEN" != "null" ] || exit 1

# 4. Protected endpoint
curl -f http://localhost:3001/api/tasks -H "Authorization: Bearer $TOKEN" || exit 1

# 5. Chat (if provider available)
CHAT=$(curl -s -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"test","stream":false}')
echo "$CHAT" | jq -e '.data.content' || exit 1
```

### Unit Tests (core package)

- Memory engine: CRUD, search, layer isolation
- Auth: password hashing, JWT sign/verify, token rotation
- Tasks: CRUD, status transitions, queries
- Providers: request formatting, response parsing (mocked HTTP)

---

## Manual Verification Checklist

Before telling Otto "it works":

- [ ] Open `app.kira.ai` in incognito
- [ ] Register new account
- [ ] Login with new account  
- [ ] See Overview page with real data (or proper empty states)
- [ ] Navigate to every page via sidebar
- [ ] Hard refresh on every page — still works
- [ ] Send a chat message — get response
- [ ] Create a task
- [ ] Upload a document
- [ ] Check Settings page loads
- [ ] Logout → login again → everything still there
- [ ] Open in mobile viewport — doesn't break
