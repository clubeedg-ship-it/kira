# Tools Inventory Per Company
*Current state and recommendations*

## Central Infrastructure (Shared)

| Tool | Purpose | Status | Owner |
|------|---------|--------|-------|
| Clawdbot | AI agent orchestration | ✅ Running | Kira |
| Chimera | Feature evolution engine | 🔄 Development | Otto/Kira |
| Nexus OS | Personal productivity | ✅ Running | Otto |
| Notion | Documentation, tasks | ✅ Active | Shared |
| GitHub | Code hosting | ✅ Active | Shared |
| Telegram | Communication | ✅ Active | Shared |
| Neo4j | Knowledge graph | ✅ Running | Chimera |
| PostgreSQL | Relational data | ✅ Running | Shared |
| Redis | Caching | ✅ Running | Shared |
| Ollama | Local LLM inference | ⚠️ Needs upgrade | Kira |
| vLLM | Production LLM serving | 🔄 Setup | Kira |

---

## ZenithCred (FinTech)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| None yet | - | Planning |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| Stripe | Payments | High | 2.9% + €0.30 |
| Plaid | Bank connections | High | Pay per call |
| Persona | Identity verification | High | Pay per verification |
| Experian API | Credit data | High | Volume pricing |
| Datadog | Monitoring | Medium | Free tier |
| LaunchDarkly | Feature flags | Low | Free tier |

---

## SentinAgro (AgTech)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| None yet | - | Planning |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| IoT Hub (Azure/AWS) | Sensor data | High | Pay per message |
| InfluxDB | Time series data | High | Free tier |
| QGIS | GIS mapping | Medium | Free (OSS) |
| Planet Labs | Satellite imagery | Medium | Enterprise pricing |
| Grafana | Dashboards | Medium | Free tier |

---

## Otto (AI Education)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| Notion | Content planning | ✅ Active |
| Canva | Graphics | 🔄 Needed |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| Notion | Content planning | High | €10/month |
| Canva Pro | Graphics | High | €13/month |
| Descript | Video editing | High | €24/month |
| Riverside | Recording | Medium | €24/month |
| Circle | Community | Medium | €89/month |
| ConvertKit | Email | Medium | Free to 1k |
| Gumroad | Sales | High | 10% + fees |

---

## IAM (Consulting)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| Notion | Projects | ✅ Active |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| Saleshandy | Lead data | High | €49/month |
| Instantly | Email outreach | High | €37/month |
| Calendly | Scheduling | Medium | Free tier |
| Loom | Async video | Medium | Free tier |
| Miro | Workshops | Low | Free tier |

---

## CuttingEdge (UX)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| None yet | - | Planning |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| Figma | Design | High | Free tier |
| Maze | User testing | Medium | Free tier |
| Hotjar | Analytics | Medium | Free tier |
| Notion | Documentation | High | Shared |

---

## Abura (Cosmetics Sales)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| None yet | - | Planning |

### Recommended Stack
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| HubSpot | CRM | High | Free tier |
| LinkedIn Sales Nav | Prospecting | High | €80/month |
| Aircall | Phone system | Medium | €30/user |
| DocuSign | Contracts | Low | €13/month |

---

## Chimera (Core Tech)

### Current Tools
| Tool | Purpose | Status |
|------|---------|--------|
| GitHub | Code | ✅ Active |
| Neo4j | Graph DB | ✅ Running |
| Jest | Testing | ✅ Active |

### Recommended Additions
| Tool | Purpose | Priority | Cost |
|------|---------|----------|------|
| GitHub Actions | CI/CD | High | Free (public) |
| Sentry | Error tracking | Medium | Free tier |
| Linear | Issue tracking | Low | Free tier |

---

## Cost Summary

### Minimum Viable (Now)
- Most tools: Free tiers
- Total: ~€50/month

### Growth Phase (€1k revenue)
- Essential paid tools
- Total: ~€300/month

### Scale Phase (€10k revenue)
- Full stack
- Total: ~€1,000/month

---

## Integration Priorities

### Phase 1: Revenue Enablement
1. Sales tools (Saleshandy, Instantly) → IAM/Abura
2. Content tools (Canva, Descript) → Otto
3. CRM (HubSpot) → All

### Phase 2: Operations
1. Monitoring (Datadog/Grafana) → All
2. Communication (Slack?) → All
3. Finance (QuickBooks) → All

### Phase 3: Scale
1. Customer tools (Intercom) → All
2. Analytics (Amplitude) → All
3. Security (Vault) → All

---

*Revisit quarterly as needs evolve*
