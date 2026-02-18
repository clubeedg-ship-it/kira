# 04 — Authentication & Sessions

---

## Registration

### Email + Password

```
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securepassword123",
  "displayName": "Mark"
}
→ 201 { data: { userId, message: "Verification email sent" } }
```

**Password rules:**
- Minimum 8 characters
- No other complexity requirements (NIST 800-63B recommendation)
- Checked against HaveIBeenPwned (k-anonymity, future)

**Email verification:**
- 6-digit code sent to email
- Valid for 15 minutes
- 3 attempts max

```
POST /api/auth/verify
{ "email": "user@example.com", "code": "482910" }
→ 200 { data: { token, refreshToken, user } }
```

### OAuth (Future)

Google and GitHub OAuth. Creates account automatically on first login. Links to existing account if email matches.

---

## Login

```
POST /api/auth/login
{ "email": "user@example.com", "password": "securepassword123" }
→ 200 { data: { token, refreshToken, user } }
```

**Token pair:**
- `token`: JWT access token, 15 min expiry, contains `{ sub: userId, role, tier }`
- `refreshToken`: Opaque token, 30 day expiry, stored hashed in DB

**Failed login:**
- Generic "Invalid credentials" (never reveal if email exists)
- Rate limit: 5 attempts per email per 15 minutes
- After 10 failures: temporary lockout (30 min)

---

## Session Management

### Access Token (JWT)

```typescript
interface JWTPayload {
  sub: string;      // userId
  role: string;     // user | admin
  tier: string;     // free | pro
  iat: number;
  exp: number;      // 15 minutes
}
```

- Signed with HMAC-SHA256 using `KIRA_JWT_SECRET` env var
- Validated on every API request in auth middleware
- Short-lived: 15 minutes

### Refresh Token

- Random 256-bit token, base64url encoded
- Stored as SHA-256 hash in `sessions` table
- Used to get new access token:

```
POST /api/auth/refresh
{ "refreshToken": "abc123..." }
→ 200 { data: { token, refreshToken } }  // Rotates both
```

- **Token rotation:** Each refresh issues a new refresh token and invalidates the old one
- **Theft detection:** If an old refresh token is reused, revoke ALL sessions for that user

### Logout

```
POST /api/auth/logout
Authorization: Bearer <token>
→ 200 { data: { message: "Logged out" } }
```

Revokes the current session's refresh token.

### "Remember Me"

- Default: refresh token in httpOnly cookie (30 days)
- Without "remember me": refresh token in memory only (session-scoped)

---

## Frontend Auth Flow

```typescript
// lib/auth.ts

const TOKEN_KEY = 'kira_token';
const REFRESH_KEY = 'kira_refresh';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setTokens(token: string, refreshToken: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// API client with auto-refresh
export async function apiFetch(path: string, opts?: RequestInit): Promise<any> {
  let token = getToken();
  
  let res = await fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts?.headers,
    },
  });
  
  // Token expired → try refresh
  if (res.status === 401) {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) { clearTokens(); throw new AuthError(); }
    
    const refreshRes = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    
    if (!refreshRes.ok) { clearTokens(); throw new AuthError(); }
    
    const data = await refreshRes.json();
    setTokens(data.data.token, data.data.refreshToken);
    
    // Retry original request with new token
    res = await fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.data.token}`,
        ...opts?.headers,
      },
    });
  }
  
  if (!res.ok) throw new ApiError(res.status, await res.text());
  
  const json = await res.json();
  return 'data' in json ? json.data : json;
}
```

---

## Security Checklist

- [ ] JWT secret from env var (min 64 chars)
- [ ] Passwords bcrypt hashed (cost factor 12)
- [ ] Refresh tokens stored as SHA-256 hash
- [ ] Token rotation on every refresh
- [ ] Rate limiting on auth endpoints
- [ ] Generic error messages (no email enumeration)
- [ ] CORS restricted to known origins
- [ ] httpOnly cookies for refresh tokens
- [ ] Secure flag on cookies in production
- [ ] No tokens in URL parameters
- [ ] Audit log for login/logout/password changes
