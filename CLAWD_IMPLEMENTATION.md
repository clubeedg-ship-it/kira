# Implementation Report: Hybrid Clawdbot + Ralph-Wiggum Loop
**Target Environment:** Proxmox LXC (Ubuntu 24.04)
**Identity/Provider:** Claude Max via CLI (Subscription-based)
**Logic Pattern:** Ralph-Wiggum Self-Correction (Observation -> Action -> Verification -> Loop)

---

## 1. System Architecture
This setup uses a "Headless-First" Gateway with a "Visual Canvas" for feedback. 

* **Gateway Node (LXC):** Handles the core agent logic and Telegram communication.
* **Visual Worker (Kasm/VNC LXC):** Optional headful browser for "Computer Use" tasks.
* **The Loop:** The agent is instructed to never assume success. It must verify state (e.g., check `systemctl status` after a start command) before reporting back.



---

## 2. Core Dependencies
Install the following on the primary Proxmox LXC:

```bash
# Node.js 22 LTS
curl -fsSL [https://deb.nodesource.com/setup_22.x](https://deb.nodesource.com/setup_22.x) | bash -
apt install -y nodejs build-essential

# Claude CLI (Authentication for Max Plan)
curl -fsSL [https://claude.ai/install.sh](https://claude.ai/install.sh) | bash
claude login # Must be performed manually once

# Clawdbot Global Installation
npm install -g clawdbot@latest
3. Ralph-Wiggum System Prompt Configuration
To enforce the self-correction loop, update the system_prompt in ~/.clawdbot/config.json. This prompt forces the agent to use the "Ralph Wiggum" logic: Always observe after acting.

System Prompt Block:

"You are an autonomous agent operating in a Ralph-Wiggum Loop. You must never assume a command was successful. For every action taken, you must immediately follow up with a verification command (Observation). If the observation does not match the desired goal, you must iterate and try a different approach. Always prioritize pushing visual outputs (graphs, UI, logs) to the Live Canvas. Do not wait for user permission to show the Canvas; it is your primary visual feedback loop."

4. Configuration: ~/.clawdbot/config.json
Apply these settings to ensure the Visual Canvas is permanent and the loop remains tight:

JSON
{
  "provider": "claude-code-cli",
  "auto_render_canvas": true,
  "verification_mode": "strict",
  "loop_limit": 5,
  "ui": {
    "default_view": "canvas",
    "theme": "professional"
  },
  "gateway": {
    "channel": "telegram",
    "persist_session": true
  }
}
5. Persistence (Systemd)
To ensure the Ralph-Wiggum agent is always 'at school' and learning, create the following service file at /etc/systemd/system/clawdbot.service:

Ini, TOML
[Unit]
Description=Clawdbot Ralph-Wiggum Agent Loop
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root
ExecStart=/usr/bin/clawdbot start --gateway telegram
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
Run systemctl enable --now clawdbot to activate.
