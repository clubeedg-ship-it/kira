# VM Infrastructure Audit
*Generated: 2026-02-06*

## System Overview

| Resource | Value | Status |
|----------|-------|--------|
| Disk | 662GB total, 412GB free (38% used) | ✅ Good |
| GPU | RTX 4090, 24GB VRAM | ✅ Available |
| RAM | Sufficient for ML workloads | ✅ Good |

## Services Running

### Core Services
- **Clawdbot Gateway** (port 18789) - Main AI agent interface
- **Ollama** - Local LLM inference (stuck at 0.13.5)
- **Docker** - Multiple containers running

### Ports in Use
| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | Nginx |
| 3000 | Web app (Nexus?) |
| 3002 | Unknown |
| 3100 | Logging (Loki?) |
| 3847 | Cognitive Dashboard |
| 3849 | Unknown node service |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 8123 | Home Assistant? |
| 18789 | Clawdbot Gateway |

## Python Environments
- **~/.venv/ml** - vLLM, HuggingFace, ML stack

## Key Directories
- **~/clawd** - Main workspace (Kira operating files)
- **~/chimera** - Chimera Protocol source code
- **~/models** - Local LLM models (GLM-4.7-Flash downloading)
- **~/.clawdbot** - Clawdbot config and sessions

## Docker Containers
Multiple containers running (10+ visible). Needs audit to identify:
- Which are essential
- Which can be stopped
- Resource usage per container

## Recommendations

### Immediate
1. Complete GLM-4.7-Flash download
2. Set up vLLM server as systemd service
3. Clean up unused Docker containers

### Short-term
1. Upgrade Ollama when possible
2. Set up proper monitoring (Prometheus/Grafana)
3. Implement backup strategy for ~/clawd

### Long-term
1. Consider Kubernetes for multi-company isolation
2. Set up proper secrets management
3. Implement proper logging aggregation
