#!/usr/bin/env python3
"""Knowledge Graph Enrichment - Extract all relationships from VDR docs."""
import sqlite3
import uuid
import json

db = sqlite3.connect('/home/adminuser/kira/memory/unified.db')
db.row_factory = sqlite3.Row

def get_entity(name):
    r = db.execute("SELECT id FROM entities WHERE name = ? COLLATE NOCASE", (name,)).fetchone()
    return r['id'] if r else None

def ensure_entity(name, etype, desc=None, props=None):
    eid = get_entity(name)
    if eid:
        return eid
    eid = f"ent-{uuid.uuid4().hex[:12]}"
    db.execute("INSERT INTO entities(id, type, name, description, properties) VALUES(?,?,?,?,?)",
               (eid, etype, name, desc, json.dumps(props) if props else None))
    return eid

def ensure_relation(src_id, tgt_id, rtype, props=None):
    existing = db.execute(
        "SELECT id FROM relations WHERE source_id=? AND target_id=? AND type=?",
        (src_id, tgt_id, rtype)).fetchone()
    if existing:
        return False
    rid = f"rel-{uuid.uuid4().hex[:12]}"
    db.execute("INSERT INTO relations(id, source_id, target_id, type, properties) VALUES(?,?,?,?,?)",
               (rid, src_id, tgt_id, rtype, json.dumps(props) if props else None))
    return True

def ensure_fact(subj_id, predicate, obj, source=None):
    existing = db.execute(
        "SELECT id FROM facts WHERE subject_id=? AND predicate=? AND object=?",
        (subj_id, predicate, obj)).fetchone()
    if existing:
        return False
    fid = f"fact-{uuid.uuid4().hex[:12]}"
    db.execute("INSERT INTO facts(id, subject_id, predicate, object, source) VALUES(?,?,?,?,?)",
               (fid, subj_id, predicate, obj, source))
    return True

new_rels = 0
new_facts = 0
new_ents = 0

def rel(src_name, tgt_name, rtype, props=None):
    global new_rels
    s = get_entity(src_name) or ensure_entity(src_name, "concept")
    t = get_entity(tgt_name) or ensure_entity(tgt_name, "concept")
    if ensure_relation(s, t, rtype, props):
        new_rels += 1

def fact(subj_name, pred, obj, src=None):
    global new_facts
    s = get_entity(subj_name) or ensure_entity(subj_name, "concept")
    if ensure_fact(s, pred, obj, src):
        new_facts += 1

def ent(name, etype, desc=None, props=None):
    global new_ents
    if not get_entity(name):
        ensure_entity(name, etype, desc, props)
        new_ents += 1
    return name

# ============================================================
# ENTITIES - ensure all key entities exist with proper types
# ============================================================

# People
ent("Otto", "person", "Founder & CEO of Oopuo Holdings, age 20, based in Netherlands")
ent("Kira", "agent", "AI COO running operations across all Oopuo companies")

# Holding company
ent("Oopuo Holdings", "company", "Parent holding company for all Otto's ventures")

# Portfolio companies
ent("IAM", "company", "Interactive Move - interactive floor/wall projectors for kindergartens")
ent("OttoGen", "company", "AI services agency for SMBs")
ent("ZenithCred", "company", "Corporate wellness platform with light panels + gamification")
ent("Chimera Protocol", "company", "Privacy-preserving distributed AI infrastructure")
ent("CuttingEdge", "company", "Interior design project management")
ent("SentinAgro", "company", "Drone cattle monitoring (parked)")
ent("Abura Cosmetics", "company", "Cosmetics sales")

# Products
ent("Interactive Floor Projector", "product", "IAM's main product - interactive projection for kindergarten floors")
ent("Interactive Wall Projector", "product", "IAM's wall-mounted interactive projector")
ent("Light Panels", "product", "Interactive light therapy panels used by ZenithCred")
ent("Biofeedback Wearables", "product", "Wearable devices for ZenithCred wellness tracking")
ent("Wellness Dashboard", "product", "ZenithCred gamification dashboard for corporate wellness")
ent("Drone Monitoring System", "product", "SentinAgro's planned drone-based cattle monitoring")
ent("AI Audit Service", "product", "OttoGen's AI readiness audit for SMBs")
ent("AI Automation Package", "product", "OttoGen's AI implementation service")

# Technology components
ent("Consultant", "component", "Chimera local private component that holds user data")
ent("Savant", "component", "Chimera distributed blind compute worker")
ent("ZK Membrane", "component", "Zero-Knowledge bridge between Consultant and Savants")
ent("Job Queue", "component", "Chimera job ticket orchestration system")
ent("Memory Graph", "component", "SQLite + embeddings entity/relation storage in Chimera")
ent("Observer", "component", "Chimera savant for session log analysis")
ent("Analyzer", "component", "Chimera savant for pattern detection")
ent("Generator", "component", "Chimera savant for code generation")
ent("Curator", "component", "Chimera savant for knowledge extraction")
ent("Savant Manager", "component", "Chimera multi-agent orchestration")
ent("Voice Pipeline", "component", "Chimera TTS for natural dialogue")
ent("Pipeline", "component", "Chimera end-to-end request processing")

# Infrastructure
ent("OpenClaw", "platform", "Agent orchestration platform Kira runs on")
ent("Claude Max", "platform", "Anthropic's Claude subscription for Kira")
ent("Ollama", "tool", "Local LLM inference server")
ent("unified.db", "database", "Kira's SQLite knowledge graph database")
ent("GLM-4.7-Flash", "model", "Local vision/language model used by Kira")
ent("nomic-embed-text", "model", "Embedding model for vector search")
ent("Kira Dashboard", "tool", "Express + D3.js dashboard for Kira operations")
ent("Express.js", "technology", "Web framework for Kira Dashboard")
ent("D3.js", "technology", "Visualization library for knowledge graph")
ent("SQLite", "technology", "Database engine for unified.db")
ent("Neo4j", "technology", "Graph database used by Chimera/Nexus")
ent("PostgreSQL", "technology", "Relational database for shared infrastructure")
ent("Redis", "technology", "Caching layer for shared infrastructure")
ent("Docker", "technology", "Container platform for services")
ent("GitHub", "platform", "Code hosting for all projects")
ent("Notion", "tool", "Documentation and task management")
ent("Telegram", "platform", "Primary communication channel")
ent("vLLM", "tool", "Production LLM serving engine")
ent("NVIDIA RTX 4090", "hardware", "GPU for local AI inference")

# Markets
ent("Netherlands Kindergarten Market", "market", "~9,315 kinderdagverblijven in NL")
ent("Corporate Wellness Market", "market", "~€900M Benelux, ~$68B global")
ent("AI Services Market", "market", "$7.6B globally in 2025, 46% CAGR")
ent("AI Infrastructure Market", "market", "$100B+ global compute market")
ent("AgTech Market", "market", "Agricultural technology/drone monitoring")
ent("Privacy Compute Market", "market", "Emerging market for privacy-preserving AI")

# Competitors
ent("Wellable", "competitor", "Corporate wellness challenges platform")
ent("Virgin Pulse", "competitor", "Enterprise wellness platform")
ent("Headspace for Work", "competitor", "Meditation/mindfulness corporate offering")
ent("Nillion", "competitor", "Blind compute / privacy infrastructure, raised $50M")
ent("Golem", "competitor", "Decentralized compute network")
ent("Akash", "competitor", "Decentralized cloud computing")

# Investors (target)
ent("LUMO Labs", "investor", "Eindhoven, impact-driven, AI/IoT/health, €100M fund")
ent("INKEF Capital", "investor", "Amsterdam, healthcare/deep tech, €1-5M checks")
ent("NLC Health Ventures", "investor", "Amsterdam, health-tech venture builder, €58M+")
ent("Newion", "investor", "Amsterdam, B2B SaaS specialist")
ent("Peak Capital", "investor", "Amsterdam/Berlin/Stockholm, marketplaces/SaaS")
ent("henQ", "investor", "Amsterdam, B2B software")
ent("FounderFuel", "investor", "Amsterdam, HR Tech/SportsTech/AI")
ent("Rockstart", "investor", "Amsterdam, broad early-stage")
ent("Volta Ventures", "investor", "Belgium/Netherlands, early-stage SaaS")
ent("Keen Venture Partners", "investor", "Netherlands, enterprise tech")
ent("Fabric Ventures", "investor", "London, crypto infrastructure")
ent("Placeholder VC", "investor", "NYC, crypto/protocol thesis")
ent("Lemniscap", "investor", "Crypto infra, EU-friendly")
ent("Air Street Capital", "investor", "London, AI-native fund")
ent("Speedinvest", "investor", "Vienna/EU, AI + privacy thesis")
ent("Paradigm", "investor", "Crypto infrastructure VC")
ent("Polychain Capital", "investor", "Crypto VC")
ent("Multicoin Capital", "investor", "Crypto VC")
ent("Hack VC", "investor", "Nillion backer, crypto infra")

# Kindergarten chains
ent("Partou", "company", "Largest NL kindergarten chain, ~700 locations")
ent("KidsFoundation", "company", "Second largest NL kindergarten chain, ~500 locations")
ent("Smallsteps", "company", "Third largest NL kindergarten chain, ~400 locations")
ent("Kinderrijk", "company", "NL kindergarten chain, ~200 locations")
ent("CompaNanny", "company", "NL kindergarten chain, ~100 locations")

# OttoGen target industries
ent("Real Estate Agencies NL", "market_segment", "Target vertical for OttoGen")
ent("Marketing Agencies NL", "market_segment", "Target vertical for OttoGen")
ent("Accounting Firms NL", "market_segment", "Target vertical for OttoGen")
ent("E-commerce NL", "market_segment", "Target vertical for OttoGen")
ent("Recruitment Agencies NL", "market_segment", "Target vertical for OttoGen")
ent("Legal Practices NL", "market_segment", "Target vertical for OttoGen")

# Strategies & Goals
ent("$1B Valuation Goal", "goal", "Target $1B portfolio valuation")
ent("Revenue Strategy", "strategy", "60% revenue, 30% funding, 10% infrastructure")
ent("ZenithCred Seed Round", "milestone", "€1.1M at €2.5-3.5M pre-money")
ent("Chimera Series A", "milestone", "Target $50-100M valuation")
ent("Chimera Testnet", "milestone", "Public testnet with distributed nodes")
ent("Chimera Open Source", "milestone", "Public GitHub repo launch")
ent("First OttoGen Revenue", "milestone", "First €500+ invoice")
ent("IAM Pilot", "milestone", "First kindergarten pilot installation")

# Locations
ent("Netherlands", "location", "Otto's base of operations")
ent("Brazil", "location", "Otto's planned travel destination May 2026")
ent("Amsterdam", "location", "Key market city")
ent("Rotterdam", "location", "Key market city")
ent("Eindhoven", "location", "Tech hub, LUMO Labs location")
ent("Benelux", "location", "Primary market region for ZenithCred")

# Tools per company
ent("Apollo", "tool", "Sales automation for IAM outreach")
ent("Instantly", "tool", "Cold email automation")
ent("Vapi", "tool", "Voice AI for sales calls")
ent("HubSpot", "tool", "CRM platform")
ent("Canva", "tool", "Graphics design tool")
ent("Stripe", "tool", "Payment processing for ZenithCred")
ent("Plaid", "tool", "Bank connections API")
ent("ConvertKit", "tool", "Email marketing for OttoGen")
ent("Gumroad", "tool", "Sales platform for OttoGen courses")
ent("Figma", "tool", "Design tool for CuttingEdge")
ent("LinkedIn", "platform", "Primary outreach channel for OttoGen")

# Concepts from architecture
ent("Consultant/Savant Architecture", "architecture", "Chimera's split-brain privacy architecture")
ent("Blind Compute", "concept", "Running AI on untrusted nodes without exposing data")
ent("Privacy-Preserving AI", "concept", "Core value proposition of Chimera")
ent("Token Economics", "concept", "Compute token model for Chimera network")
ent("Decentralized Compute", "concept", "Distributed node-based compute model")

# Sub-agents
ent("Credit Agent", "agent", "ZenithCred risk assessment sub-agent")
ent("Compliance Agent", "agent", "ZenithCred regulatory monitoring sub-agent")
ent("Customer Agent", "agent", "ZenithCred support sub-agent")
ent("Field Agent", "agent", "SentinAgro sensor data sub-agent")
ent("Analytics Agent", "agent", "SentinAgro crop prediction sub-agent")
ent("Content Agent", "agent", "OttoGen content creation sub-agent")
ent("Marketing Agent", "agent", "OttoGen social/email sub-agent")
ent("Community Agent", "agent", "OttoGen community management sub-agent")
ent("Sales Agent", "agent", "IAM sales automation sub-agent")

# Tiers
ent("Tier 1 Revenue", "category", "Revenue-generating companies: IAM, OttoGen, CuttingEdge, Abura")
ent("Tier 2 Funding", "category", "Funding-seeking companies: ZenithCred, SentinAgro")
ent("Tier 3 Infrastructure", "category", "Core tech: Chimera")

# Documents
ent("Chimera Whitepaper", "document", "Technical whitepaper for Chimera protocol")
ent("ZenithCred Pitch Deck", "document", "Investor pitch deck for seed round")
ent("IAM Sales One-Pager", "document", "Sales collateral for kindergarten outreach")
ent("Billion Dollar Math", "document", "Reality check analysis on $1B target")
ent("Strategic Roadmap 2026", "document", "Feb-Oct 2026 month-by-month plan")
ent("OttoGen Service Menu", "document", "AI services offered by OttoGen")

# Regulatory
ent("Dutch Entrepreneur Visa", "regulatory", "Required for Otto to operate in Netherlands")
ent("EASA Drone Regulations", "regulatory", "EU drone regulations affecting SentinAgro")
ent("VVE Programs", "regulatory", "Dutch early childhood education subsidies")

# Comparable companies
ent("Mistral AI", "comparable", "AI unicorn in ~7 months, ex-DeepMind/Meta founders")
ent("Bot Company", "comparable", "Kyle Vogt, $1B in ~10 months")
ent("Cohere", "comparable", "Enterprise AI, ~2 years to unicorn")

# Revenue models
ent("Lease Model", "business_model", "IAM's €199-299/mo hardware lease")
ent("SaaS Subscription", "business_model", "ZenithCred's per-seat monthly pricing")
ent("Project Fees", "business_model", "CuttingEdge per-project consulting")
ent("AI Consulting", "business_model", "OttoGen's €500-5000 per engagement")
ent("Commission Sales", "business_model", "Abura's commission-based revenue")
ent("Compute Token", "business_model", "Chimera's planned token-based model")

# Nexus
ent("Nexus OS", "product", "Personal productivity system for Otto")

# moltbot
ent("moltbot-core", "tool", "Multi-agent spawning infrastructure")

print(f"Created {new_ents} new entities")

# ============================================================
# RELATIONS - Dense network of connections
# ============================================================

# === CORPORATE HIERARCHY ===
# Oopuo Holdings owns all companies
for co in ["IAM", "OttoGen", "ZenithCred", "Chimera Protocol", "CuttingEdge", "SentinAgro", "Abura Cosmetics"]:
    rel("Oopuo Holdings", co, "owns")
    rel("Otto", co, "founded")
    rel("Kira", co, "operates_as_coo")
    rel(co, "Oopuo Holdings", "subsidiary_of")

# Otto relationships
rel("Otto", "Oopuo Holdings", "ceo_of")
rel("Otto", "Kira", "created")
rel("Otto", "Kira", "works_with")
rel("Kira", "Otto", "reports_to")
rel("Kira", "Otto", "assists")

# === CROSS-COMPANY CONNECTIONS ===
rel("ZenithCred", "IAM", "born_from")
rel("IAM", "ZenithCred", "provides_hardware_to")
rel("Light Panels", "ZenithCred", "core_component_of")
rel("Light Panels", "IAM", "manufactured_by")
rel("OttoGen", "IAM", "markets")
rel("OttoGen", "ZenithCred", "markets")
rel("OttoGen", "CuttingEdge", "markets")
rel("OttoGen", "Chimera Protocol", "markets")
rel("OttoGen", "SentinAgro", "markets")
rel("OttoGen", "Abura Cosmetics", "markets")
rel("OttoGen", "Oopuo Holdings", "personal_brand_of")
rel("Chimera Protocol", "Kira", "powers_infrastructure")
rel("CuttingEdge", "Oopuo Holdings", "funds_operations")

# === TIER CLASSIFICATION ===
for co in ["IAM", "OttoGen", "CuttingEdge", "Abura Cosmetics"]:
    rel(co, "Tier 1 Revenue", "classified_as")
for co in ["ZenithCred", "SentinAgro"]:
    rel(co, "Tier 2 Funding", "classified_as")
rel("Chimera Protocol", "Tier 3 Infrastructure", "classified_as")

# === PRODUCT CONNECTIONS ===
rel("IAM", "Interactive Floor Projector", "produces")
rel("IAM", "Interactive Wall Projector", "produces")
rel("ZenithCred", "Light Panels", "uses")
rel("ZenithCred", "Biofeedback Wearables", "uses")
rel("ZenithCred", "Wellness Dashboard", "develops")
rel("SentinAgro", "Drone Monitoring System", "plans_to_develop")
rel("OttoGen", "AI Audit Service", "offers")
rel("OttoGen", "AI Automation Package", "offers")
rel("Chimera Protocol", "Blind Compute", "enables")
rel("Chimera Protocol", "Privacy-Preserving AI", "enables")
rel("Chimera Protocol", "Decentralized Compute", "implements")

# === CHIMERA ARCHITECTURE ===
rel("Chimera Protocol", "Consultant/Savant Architecture", "uses_architecture")
rel("Chimera Protocol", "Consultant", "contains")
rel("Chimera Protocol", "Savant", "contains")
rel("Chimera Protocol", "ZK Membrane", "contains")
rel("Chimera Protocol", "Job Queue", "contains")
rel("Chimera Protocol", "Memory Graph", "contains")
rel("Chimera Protocol", "Observer", "contains")
rel("Chimera Protocol", "Analyzer", "contains")
rel("Chimera Protocol", "Generator", "contains")
rel("Chimera Protocol", "Curator", "contains")
rel("Chimera Protocol", "Savant Manager", "contains")
rel("Chimera Protocol", "Voice Pipeline", "contains")
rel("Chimera Protocol", "Pipeline", "contains")
rel("Consultant", "Savant", "delegates_to")
rel("Consultant", "ZK Membrane", "communicates_via")
rel("ZK Membrane", "Savant", "bridges_to")
rel("Savant Manager", "Savant", "orchestrates")
rel("Savant Manager", "Observer", "manages")
rel("Savant Manager", "Analyzer", "manages")
rel("Savant Manager", "Generator", "manages")
rel("Savant Manager", "Curator", "manages")
rel("Job Queue", "Savant", "dispatches_to")
rel("Consultant", "Job Queue", "submits_to")
rel("Observer", "Analyzer", "feeds_data_to")
rel("Analyzer", "Generator", "triggers")

# === KIRA TECH STACK ===
rel("Kira", "OpenClaw", "runs_on")
rel("Kira", "Claude Max", "powered_by")
rel("Kira", "Ollama", "uses")
rel("Kira", "unified.db", "stores_knowledge_in")
rel("Kira", "GLM-4.7-Flash", "uses_for_vision")
rel("Kira", "nomic-embed-text", "uses_for_embeddings")
rel("Kira", "Kira Dashboard", "monitored_via")
rel("Kira Dashboard", "Express.js", "built_with")
rel("Kira Dashboard", "D3.js", "built_with")
rel("Kira Dashboard", "SQLite", "built_with")
rel("Kira Dashboard", "unified.db", "reads_from")
rel("Kira", "Telegram", "communicates_via")
rel("Kira", "Notion", "manages_docs_in")
rel("Kira", "GitHub", "stores_code_on")
rel("Kira", "moltbot-core", "uses_for_spawning")
rel("Kira", "vLLM", "uses_for_inference")
rel("NVIDIA RTX 4090", "Ollama", "accelerates")
rel("NVIDIA RTX 4090", "vLLM", "accelerates")
rel("NVIDIA RTX 4090", "GLM-4.7-Flash", "runs")

# === SHARED INFRASTRUCTURE ===
for co in ["IAM", "OttoGen", "ZenithCred", "Chimera Protocol", "CuttingEdge", "SentinAgro", "Abura Cosmetics"]:
    rel(co, "Notion", "documented_in")
    rel(co, "GitHub", "code_hosted_on")
    rel(co, "Kira", "managed_by")

# === MARKET CONNECTIONS ===
rel("IAM", "Netherlands Kindergarten Market", "targets")
rel("ZenithCred", "Corporate Wellness Market", "targets")
rel("OttoGen", "AI Services Market", "targets")
rel("Chimera Protocol", "AI Infrastructure Market", "targets")
rel("Chimera Protocol", "Privacy Compute Market", "targets")
rel("SentinAgro", "AgTech Market", "targets")

# IAM → kindergarten chains
for chain in ["Partou", "KidsFoundation", "Smallsteps", "Kinderrijk", "CompaNanny"]:
    rel("IAM", chain, "targets_as_customer")
    rel(chain, "Netherlands Kindergarten Market", "operates_in")

# OttoGen → target verticals
for seg in ["Real Estate Agencies NL", "Marketing Agencies NL", "Accounting Firms NL",
            "E-commerce NL", "Recruitment Agencies NL", "Legal Practices NL"]:
    rel("OttoGen", seg, "targets_vertical")
    rel(seg, "AI Services Market", "part_of")

# === COMPETITOR CONNECTIONS ===
rel("ZenithCred", "Wellable", "competes_with")
rel("ZenithCred", "Virgin Pulse", "competes_with")
rel("ZenithCred", "Headspace for Work", "competes_with")
rel("Chimera Protocol", "Nillion", "competes_with")
rel("Chimera Protocol", "Golem", "competes_with")
rel("Chimera Protocol", "Akash", "competes_with")
for comp in ["Wellable", "Virgin Pulse", "Headspace for Work"]:
    rel(comp, "Corporate Wellness Market", "operates_in")
for comp in ["Nillion", "Golem", "Akash"]:
    rel(comp, "Privacy Compute Market", "operates_in")
    rel(comp, "AI Infrastructure Market", "operates_in")

# === INVESTOR CONNECTIONS ===
# ZenithCred investor targets
zc_investors = ["LUMO Labs", "INKEF Capital", "NLC Health Ventures", "Newion", "Peak Capital",
                "henQ", "FounderFuel", "Rockstart", "Volta Ventures", "Keen Venture Partners"]
for inv in zc_investors:
    rel("ZenithCred", inv, "targets_investor")
    rel(inv, "ZenithCred Seed Round", "potential_participant")

# Chimera investor targets
ch_investors = ["Fabric Ventures", "Placeholder VC", "Lemniscap", "Air Street Capital",
                "Speedinvest", "Paradigm", "Polychain Capital", "Multicoin Capital", "Hack VC"]
for inv in ch_investors:
    rel("Chimera Protocol", inv, "targets_investor")
    rel(inv, "Chimera Series A", "potential_participant")

# === TOOL CONNECTIONS ===
# IAM tools
for tool in ["Apollo", "Instantly", "Vapi"]:
    rel("IAM", tool, "uses_tool")
rel("IAM", "HubSpot", "uses_tool")

# OttoGen tools
for tool in ["LinkedIn", "Canva", "ConvertKit", "Gumroad", "Notion"]:
    rel("OttoGen", tool, "uses_tool")

# ZenithCred tools
for tool in ["Stripe", "Plaid"]:
    rel("ZenithCred", tool, "planned_tool")

# CuttingEdge tools
rel("CuttingEdge", "Figma", "uses_tool")

# Shared infra tools
for tool in ["Neo4j", "PostgreSQL", "Redis", "Docker"]:
    rel("Chimera Protocol", tool, "uses_technology")
    rel("Kira", tool, "uses_technology")

# === REVENUE MODEL CONNECTIONS ===
rel("IAM", "Lease Model", "uses_model")
rel("ZenithCred", "SaaS Subscription", "uses_model")
rel("CuttingEdge", "Project Fees", "uses_model")
rel("OttoGen", "AI Consulting", "uses_model")
rel("Abura Cosmetics", "Commission Sales", "uses_model")
rel("Chimera Protocol", "Compute Token", "plans_model")

# === STRATEGIC CONNECTIONS ===
rel("$1B Valuation Goal", "Chimera Protocol", "primarily_depends_on")
rel("$1B Valuation Goal", "ZenithCred", "partially_depends_on")
rel("$1B Valuation Goal", "IAM", "partially_depends_on")
rel("$1B Valuation Goal", "OttoGen", "partially_depends_on")
rel("Revenue Strategy", "IAM", "revenue_source")
rel("Revenue Strategy", "OttoGen", "revenue_source")
rel("Revenue Strategy", "CuttingEdge", "revenue_source")
rel("Revenue Strategy", "Abura Cosmetics", "revenue_source")
rel("Revenue Strategy", "ZenithCred", "funding_source")
rel("Revenue Strategy", "SentinAgro", "funding_source")
rel("Revenue Strategy", "Chimera Protocol", "infrastructure_source")

# Milestones
rel("ZenithCred", "ZenithCred Seed Round", "pursuing")
rel("Chimera Protocol", "Chimera Series A", "targeting")
rel("Chimera Protocol", "Chimera Testnet", "building_toward")
rel("Chimera Protocol", "Chimera Open Source", "planning")
rel("OttoGen", "First OttoGen Revenue", "pursuing")
rel("IAM", "IAM Pilot", "pursuing")
rel("Chimera Testnet", "Chimera Series A", "prerequisite_for")
rel("Chimera Open Source", "Chimera Testnet", "prerequisite_for")
rel("ZenithCred Seed Round", "Chimera Series A", "enables_focus_on")

# === LOCATION CONNECTIONS ===
rel("Otto", "Netherlands", "based_in")
rel("Otto", "Brazil", "plans_travel_to")
rel("IAM", "Netherlands", "operates_in")
rel("IAM", "Amsterdam", "targets_city")
rel("IAM", "Rotterdam", "targets_city")
rel("ZenithCred", "Benelux", "targets_region")
rel("ZenithCred", "Netherlands", "primary_market")
rel("OttoGen", "Netherlands", "operates_in")
rel("Oopuo Holdings", "Netherlands", "incorporated_in")
rel("LUMO Labs", "Eindhoven", "based_in")
for inv in ["INKEF Capital", "NLC Health Ventures", "Newion", "Peak Capital", "henQ",
            "FounderFuel", "Rockstart"]:
    rel(inv, "Amsterdam", "based_in")

# === DOCUMENT CONNECTIONS ===
rel("Billion Dollar Math", "Chimera Protocol", "analyzes")
rel("Billion Dollar Math", "$1B Valuation Goal", "evaluates")
rel("Strategic Roadmap 2026", "Oopuo Holdings", "guides")
rel("ZenithCred Pitch Deck", "ZenithCred Seed Round", "supports")
rel("IAM Sales One-Pager", "IAM", "supports_sales_of")
rel("Chimera Whitepaper", "Chimera Protocol", "describes")
rel("OttoGen Service Menu", "OttoGen", "describes_services_of")

# === SUB-AGENT CONNECTIONS ===
# ZenithCred agents
for agent in ["Credit Agent", "Compliance Agent", "Customer Agent"]:
    rel("Kira", agent, "spawns")
    rel(agent, "ZenithCred", "serves")

# SentinAgro agents
for agent in ["Field Agent", "Analytics Agent"]:
    rel("Kira", agent, "spawns")
    rel(agent, "SentinAgro", "serves")

# OttoGen agents
for agent in ["Content Agent", "Marketing Agent", "Community Agent"]:
    rel("Kira", agent, "spawns")
    rel(agent, "OttoGen", "serves")

# IAM agents
rel("Kira", "Sales Agent", "spawns")
rel("Sales Agent", "IAM", "serves")

# === COMPARABLE CONNECTIONS ===
rel("Chimera Protocol", "Nillion", "comparable_to")
rel("Chimera Protocol", "Mistral AI", "aspires_to_be_like")
rel("$1B Valuation Goal", "Bot Company", "inspired_by")
rel("$1B Valuation Goal", "Mistral AI", "inspired_by")
rel("$1B Valuation Goal", "Cohere", "inspired_by")

# === REGULATORY CONNECTIONS ===
rel("Otto", "Dutch Entrepreneur Visa", "needs")
rel("SentinAgro", "EASA Drone Regulations", "constrained_by")
rel("IAM", "VVE Programs", "can_leverage")
rel("VVE Programs", "Netherlands", "administered_by")

# === NEXUS ===
rel("Otto", "Nexus OS", "uses")
rel("Kira", "Nexus OS", "integrates_with")
rel("Nexus OS", "Neo4j", "built_with")

# ============================================================
# FACTS - Entity properties as facts
# ============================================================

fact("Otto", "age", "20")
fact("Otto", "location", "Netherlands")
fact("Otto", "plans_travel", "Brazil, May 2026")
fact("Otto", "role", "CEO of Oopuo Holdings")
fact("Otto", "needs", "Dutch entrepreneur visa")
fact("Otto", "telegram", "@coringa_dfato")

fact("Kira", "role", "AI COO")
fact("Kira", "platform", "OpenClaw")
fact("Kira", "primary_model", "Claude Opus 4.6")
fact("Kira", "local_model", "GLM-4.7-Flash")
fact("Kira", "embedding_model", "nomic-embed-text")

fact("Oopuo Holdings", "portfolio_size", "7 companies")
fact("Oopuo Holdings", "valuation_target", "$1B")
fact("Oopuo Holdings", "valuation_realistic_8mo", "€5-15M base, €30-60M stretch")

fact("IAM", "product", "Interactive floor/wall projectors")
fact("IAM", "target_market", "Netherlands kindergartens (9,315 locations)")
fact("IAM", "pricing", "€199-299/mo lease")
fact("IAM", "gross_margin", "55-75%")
fact("IAM", "payback_period", "3-7 months per unit")
fact("IAM", "revenue_oct_2026", "€105-120K ARR projected")
fact("IAM", "status", "Pre-revenue, prospecting")
fact("IAM", "total_addressable_market_nl", "€8.96M")

fact("ZenithCred", "product", "Corporate wellness: light panels + gamification + biofeedback")
fact("ZenithCred", "seed_amount", "€1.1M")
fact("ZenithCred", "seed_valuation", "€2.5-3.5M pre-money")
fact("ZenithCred", "target_segment", "100-500 employee companies")
fact("ZenithCred", "pricing", "€10-12/seat/month")
fact("ZenithCred", "tam_benelux", "€900M")
fact("ZenithCred", "status", "Pre-revenue, no MVP")
fact("ZenithCred", "differentiator", "Physical hardware + gamification + biofeedback (multi-sensory)")
fact("ZenithCred", "year3_arr", "€2.4M projected")
fact("ZenithCred", "gross_margin", "68%")
fact("ZenithCred", "breakeven", "Month 36-38")
fact("ZenithCred", "churn", "20% assumed")

fact("OttoGen", "product", "AI automation services for SMBs")
fact("OttoGen", "pricing", "€500-5000 per engagement")
fact("OttoGen", "target_market", "Netherlands SMBs, 5-50 employees")
fact("OttoGen", "status", "Pre-revenue, outreach starting")
fact("OttoGen", "revenue_ceiling_solo", "€100-200K/year")
fact("OttoGen", "market_stat", "49% Dutch businesses projected to use AI by 2025")
fact("OttoGen", "opportunity", "95% adoption but only 5% see real ROI")

fact("Chimera Protocol", "architecture", "Consultant/Savant split-brain")
fact("Chimera Protocol", "tests_passing", "315")
fact("Chimera Protocol", "status", "Phase 1+2 complete, private repo")
fact("Chimera Protocol", "valuation_path", "Only path to $1B")
fact("Chimera Protocol", "comparable", "Nillion ($50M raised, ~$63M FDV)")
fact("Chimera Protocol", "target_round", "Seed/pre-seed $1-5M at $15-30M")
fact("Chimera Protocol", "properties", "Distributed, unkillable, privacy-first, self-sustaining")
fact("Chimera Protocol", "inspired_by", "BitTorrent, Ethereum, Tor, Folding@Home")

fact("CuttingEdge", "product", "Interior design project management")
fact("CuttingEdge", "status", "Maintenance only, low priority")
fact("CuttingEdge", "recommendation", "Complete active projects, don't pursue new business")

fact("SentinAgro", "product", "Drone cattle monitoring")
fact("SentinAgro", "status", "PARKED - revisit Jan 2027")
fact("SentinAgro", "reason_parked", "No product, no prototype, no revenue path in 8 months")

fact("Abura Cosmetics", "product", "Cosmetics sales")
fact("Abura Cosmetics", "status", "Active, commission-based")

fact("Revenue Strategy", "allocation", "60% revenue, 30% funding, 10% infrastructure")
fact("$1B Valuation Goal", "probability", "<1% in 8 months")
fact("$1B Valuation Goal", "realistic_timeline", "2-3 years")
fact("$1B Valuation Goal", "requires", "Series C-level event from near-zero revenue")

fact("Netherlands Kindergarten Market", "size", "9,315 kinderdagverblijven")
fact("Corporate Wellness Market", "size_benelux", "€900M annually")
fact("Corporate Wellness Market", "size_global", "~$68B")
fact("AI Services Market", "size_2025", "$7.6B globally")
fact("AI Services Market", "cagr", "46%")
fact("AI Infrastructure Market", "size", "$100B+ global compute")

fact("Nillion", "raised", "$50M total")
fact("Nillion", "fdv_peak", "~$720M")
fact("Nillion", "fdv_current", "~$63M (crashed 91%)")

fact("Lease Model", "range", "€199-299/month")
fact("SaaS Subscription", "range", "€10-12/seat/month")
fact("AI Consulting", "range", "€500-5000 per engagement")

# Priority order
fact("OttoGen", "priority", "1 - Cash flow NOW")
fact("IAM", "priority", "2 - Steady revenue")
fact("ZenithCred", "priority", "3 - Seed round")
fact("Chimera Protocol", "priority", "4 - The big bet")
fact("CuttingEdge", "priority", "5 - Park or minimal effort")
fact("SentinAgro", "priority", "6 - Parked")

# Investor facts
fact("LUMO Labs", "fund_size", "€100M")
fact("LUMO Labs", "focus", "Impact-driven, AI/IoT/health")
fact("LUMO Labs", "check_size", "€100K-€1M")
fact("INKEF Capital", "check_size", "€1M-€5M")
fact("NLC Health Ventures", "fund_size", "€58M+")
fact("FounderFuel", "focus", "HR Tech, SportsTech, AI")
fact("FounderFuel", "check_size", "€75K-€250K")

# Timeline facts
fact("ZenithCred Seed Round", "target_close", "May 2026")
fact("Chimera Open Source", "target", "February-March 2026")
fact("Chimera Testnet", "target", "June-July 2026")
fact("Chimera Series A", "target", "September 2026")
fact("IAM Pilot", "target", "February-March 2026")
fact("First OttoGen Revenue", "target", "February 2026")

db.commit()

# Verify
counts = db.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
rcounts = db.execute("SELECT COUNT(*) FROM relations").fetchone()[0]
fcounts = db.execute("SELECT COUNT(*) FROM facts").fetchone()[0]
print(f"\nNew entities: {new_ents}")
print(f"New relations: {new_rels}")
print(f"New facts: {new_facts}")
print(f"\nTotals: {counts} entities, {rcounts} relations, {fcounts} facts")

# Top connected nodes
print("\nTop 15 most connected entities:")
for row in db.execute("""
    SELECT e.name, COUNT(*) as connections FROM entities e
    JOIN (SELECT source_id as eid FROM relations UNION ALL SELECT target_id FROM relations) r
    ON e.id = r.eid
    GROUP BY e.id ORDER BY connections DESC LIMIT 15
""").fetchall():
    print(f"  {row[0]}: {row[1]} connections")

db.close()
