# Security Audit — 2026-02-13

## 🔴 CRITICAL: Publicly Exposed Services

| Port | Service | Risk |
|------|---------|------|
| 4646 | Nomad (Orchestrator) | Full cluster control |
| 8500 | Consul (Service Mesh) | Service discovery, KV store |
| 3100 | Langfuse (Analytics) | API keys, traces |
| 8081 | Vaultwarden (Passwords!) | Password vault |
| 9090 | Minio (Object Storage) | File access |
| 3003/3004 | CryptPad | Document access |
| 5678 | Unknown Docker | Unknown |
| 8085 | Omiximo Email Automation | Email access |
| 8501 | MediaMarkt Automation | Bot access |
| 3002 | Bouwer Messenger | Messages |
| 8003 | Omiximo Bridge | API bridge |

## 🟡 HIGH: No Rate Limiting
- Stella Tax AI has no rate limiting on auth or API endpoints
- Brute force attacks possible
- AI cost abuse possible (someone could generate unlimited opinions)

## 🟡 HIGH: No Security Headers
- No CSP, no X-Frame-Options, no HSTS
- XSS and clickjacking possible

## 🟢 GOOD: What's Working
- UFW is active (some filtering)
- Stella doesn't serve .env or .db files
- SQL injection tested — parameterized queries work
- Auth cookies are httpOnly
- Passwords hashed with scrypt

## Recommended Actions
1. **IMMEDIATE**: Close ports 4646, 8500, 3100, 8081, 9090 in UFW
2. **IMMEDIATE**: Add rate limiting to Stella
3. **TODAY**: Bind Docker containers to 127.0.0.1 instead of 0.0.0.0
4. **TODAY**: Add security headers to Stella
5. **THIS WEEK**: Set up fail2ban for SSH and web services
6. **THIS WEEK**: Review all Docker compose files, change port bindings
