# Security Status — Neil Alden Tax AI

## Wazuh SIEM (v4.11.2)
Installed: 2026-02-13 | All-in-one deployment (manager + indexer + dashboard)

### Dashboard
- URL: https://<server-ip>:443 (LAN only, 192.168.0.0/24)
- Credentials: See `~/kira/internal-docs/wazuh-credentials.md`

### File Integrity Monitoring (FIM)
Real-time monitoring on:
- `/home/adminuser/kira/projects/neil-alden-tax-ai/src` — application source code
- `/home/adminuser/kira/projects/neil-alden-tax-ai/data` — application data
- `/etc/nginx` — web server configuration
- `/etc/ssh` — SSH configuration
- System directories: `/etc`, `/usr/bin`, `/usr/sbin`, `/bin`, `/sbin`, `/boot`

### Log Monitoring
- `/var/log/auth.log` — SSH/authentication events (syslog)
- `neil-alden-tax-ai/data/access.log` — application access logs (JSON)
- `neil-alden-tax-ai/data/security.log` — application security events (JSON)
- System logs: dpkg, journald, command outputs (df, last -n 20)

### Vulnerability Detection
- Enabled: Ubuntu Noble (24.04) via Canonical feed
- Scan interval: every 24 hours
- Runs on start: yes

### Active Response
- Brute force auto-block via `firewall-drop` on rules 5710, 5711, 5712
- Timeout: 600 seconds (10 minutes)
- Complements existing fail2ban (sshd jail)

### Firewall (UFW)
- Port 443: LAN only (192.168.0.0/24) — Wazuh dashboard
- Port 80: open — nginx
- Port 22: open — SSH (protected by fail2ban + Wazuh active response)
- Wazuh agent ports 1514/1515: local only (no external agents)

### Other Security Layers
- **fail2ban**: Active on sshd
- **SSH hardening**: PermitRootLogin no, AllowUsers adminuser, X11Forwarding off
