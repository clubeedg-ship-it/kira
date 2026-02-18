# Server Security & Architecture Audit
**Date:** 2026-01-28
**Host:** oopuopu-cloud (192.168.0.222)
**External IP:** 185.239.62.65
**Environment:** VM inside Proxmox with LXC routing

---

## 🔴 CRITICAL ISSUES

### 1. Firewall Disabled
```
UFW Status: inactive
```
**Risk:** All ports bound to 0.0.0.0 are exposed to LAN/tunnel
**Fix:** Enable UFW with whitelist approach

### 2. 20+ Services Bound to All Interfaces (0.0.0.0)
Every service below is accessible from the network:

| Port | Service | Auth? | Risk Level |
|------|---------|-------|------------|
| 22 | SSH | Keys/Password | Medium |
| 80 | Nginx | None | Low |
| 1441 | InvenTree Frontend | App Auth | Medium |
| 3000 | Unknown Node | ? | **HIGH** |
| 3002 | Bouwer Messenger | None? | **HIGH** |
| 3003 | CryptPad | App Auth | Medium |
| 3004 | CryptPad Sandbox | N/A | Low |
| 5678 | n8n | App Auth | Medium |
| 8000 | InvenTree API | App Auth | Medium |
| 8001 | Scribe (Python) | None? | **HIGH** |
| 8002 | Oopuo Backend | None? | **HIGH** |
| 8003 | Omiximo Bridge | None? | **HIGH** |
| 8080 | Evolution API | API Key? | Medium |
| 8081 | Vaultwarden | App Auth | Medium |
| 8085 | Omiximo Email | None? | **HIGH** |
| 8200 | Vault/Consul? | Token | Medium |
| 8501 | MediaMarkt Streamlit | None | **HIGH** |
| 8888 | Nginx + Bearer | Bearer token | Medium |
| 9000 | Python HTTP Server | None | **HIGH** |

### 3. No Rate Limiting / WAF
Cloudflare tunnel provides DDoS protection but no application-level WAF configured.

### 4. Plain HTTP Everywhere
Internal services use HTTP. If tunnel terminates TLS at edge, internal traffic is unencrypted.

---

## 🟡 SECURITY CONCERNS

### SSH Configuration
- Password auth status: **Unknown** (not explicitly disabled)
- Root login: **Unknown** 
- **Action:** Audit `/etc/ssh/sshd_config`, disable password auth, use key-only

### Sensitive Files Exposed
.env files found with potential secrets:
- `/home/adminuser/bouwer/.env`
- `/home/adminuser/oopuo/.env`
- `/home/adminuser/omiximo-email-automation/.env`
- `/home/adminuser/agent-zero-data/.env`
- `/home/adminuser/mediamarkt-automation/.env`
- `/home/adminuser/omiximo-inventory/.env`

**Action:** Ensure .env files have 600 permissions, not in git

### Databases on Docker Networks
- `inventree-redis` - Redis (no auth by default)
- `evolution_postgres` - PostgreSQL (check password strength)
- `inventree-db` - PostgreSQL

**Action:** Verify all DBs have strong passwords, not exposed to host

### Consul/Nomad/Vault Running
```
Consul: /usr/bin/consul agent
Nomad: /usr/bin/nomad agent
Vault ports: 8200, 8301, 8500, 8600
```
**Action:** Verify ACLs are enabled, tokens rotated

---

## 🟢 GOOD PRACTICES FOUND

### Clawdbot Gateway
✅ Bound to loopback only (127.0.0.1:18789)
✅ Not exposed to network
✅ No "open ports leak" - this is secure

### Docker Isolation
✅ Services in separate networks
✅ Database containers not port-mapped to host

### Nginx Bearer Auth
✅ Port 8888 has bearer token protection for Ollama

---

## 📋 RESEARCH NEEDED

### 1. Cloudflare Tunnel Configuration
- Where is `cloudflared` running? (Not on this VM)
- Which services are exposed via tunnel?
- Are there access policies (Cloudflare Access)?

### 2. Proxmox/LXC Network
- What firewall rules exist at Proxmox level?
- Is 192.168.0.0/24 a trusted network?
- Other VMs/LXCs that can access this?

### 3. Authentication Audit per Service
Need to verify each service's auth mechanism:
- [ ] Evolution API - API key configured?
- [ ] n8n - Password set?
- [ ] InvenTree - Admin password strong?
- [ ] Vaultwarden - Admin token set?
- [ ] CryptPad - Registration open?

### 4. Service Inventory & Purpose
| Service | Purpose | Owner | Last Updated |
|---------|---------|-------|--------------|
| Bouwer | ? | ? | ? |
| Omiximo | Email automation | ? | ? |
| Oopuo | ? | ? | ? |
| MediaMarkt | Automation | ? | ? |
| Agent Zero | AI agent | ? | ? |

---

## 🛠️ RECOMMENDED ACTIONS

### Immediate (Today)
1. **Enable UFW** with default deny:
   ```bash
   sudo ufw default deny incoming
   sudo ufw allow ssh
   sudo ufw allow from 192.168.0.0/24  # If LAN trusted
   sudo ufw enable
   ```

2. **Bind dev services to localhost only**:
   - Port 9000 (Python HTTP server) - why is this running?
   - Port 8001, 8002 (dev APIs)

3. **Review SSH config**:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Set: PasswordAuthentication no
   # Set: PermitRootLogin no
   ```

### Short-term (This Week)
4. **Audit Cloudflare tunnel** - which services exposed?
5. **Add auth to exposed services** - basic auth at minimum
6. **Secure .env files** - `chmod 600`
7. **Check database passwords** - rotate if weak

### Medium-term
8. **Implement reverse proxy** - single entry point (Traefik/Caddy)
9. **Add Fail2ban** for brute force protection
10. **Set up monitoring** - detect anomalies
11. **Document service architecture** - what talks to what

---

## 📊 PORT MAPPING SUMMARY

### Cloudflare Tunnel Candidates (need verification)
If exposed via tunnel, these need extra scrutiny:
- n8n (5678) - workflow automation
- InvenTree (1441, 8000) - inventory system
- Evolution API (8080) - WhatsApp
- Vaultwarden (8081) - passwords!

### Internal Only (should stay that way)
- Clawdbot (18789) ✅ loopback
- Consul (8500, 8600)
- Neo4j (7474, 7687)
- Databases (5432, 6379 internal)

### Unknown/Investigate
- Port 3000 - What Node service?
- Port 9000 - Python HTTP server (kill this?)
- Port 8001, 8002, 8003 - Dev APIs?

---

## Next Steps

1. Run from Proxmox to check external exposure:
   ```bash
   nmap -sT 192.168.0.222 -p 1-10000
   ```

2. Check Cloudflare dashboard for tunnel config

3. Create service documentation with auth requirements

---

*Generated by server audit - Review with Otto*
