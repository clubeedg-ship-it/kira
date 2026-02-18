#!/usr/bin/env python3
"""Populate Oopuo Command Center in Notion."""
import json, time, requests, sys

API_KEY = "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"
NOTION_VERSION = "2025-09-03"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json"
}

# Database IDs (actual database_id from parent objects)
GOALS_DB = "2fba6c94-88ca-8102-afb2-cae874f281bd"
GOALS_DS = "2fba6c94-88ca-81b3-9f46-000ba63ca67c"

# Need to find Tasks DB actual database_id - query it
TASKS_DS = "300a6c94-88ca-81d4-bc85-000b82bb9a85"

# Company IDs
COMPANIES = {
    "IAM": "300a6c94-88ca-81f9-a3d7-fe4f215ab5b5",
    "ZenithCred": "300a6c94-88ca-81db-bb93-f124cabe902e",
    "OttoGen": "300a6c94-88ca-8163-be7b-fe202976c026",
    "CuttingEdge": "300a6c94-88ca-814b-b23b-c9bf0ca4a97d",
    "SentinAgro": "300a6c94-88ca-81fd-a190-c3dffeeee3f3",
    "Chimera": "300a6c94-88ca-81e3-9a79-ca6f3a0983b7",
}

# Existing goal IDs
VISION_ID = "300a6c94-88ca-8123-a640-c34bb495d2d7"
SIX_MONTH = {
    "IAM": "300a6c94-88ca-81b2-9239-ca6667ff5fd7",
    "ZenithCred": "300a6c94-88ca-8122-bfa4-e5764635c77a",
    "OttoGen": "300a6c94-88ca-81d4-b557-d992980faf1d",
    "CuttingEdge": "300a6c94-88ca-8142-b311-e03e0c292b92",
    "SentinAgro": "300a6c94-88ca-8126-a889-e86b01819009",
    "Chimera": "300a6c94-88ca-81ea-810b-dcf137b7884d",
}

# Companies DB data_source IDs
COMPANIES_DS_OPTIONS = [
    "300a6c94-88ca-81a0-9d6a-000b6d3f75ad",
    "300a6c94-88ca-8140-a5ff-000bf316c63d",
]

LOG = []

def api_call(method, url, data=None, retries=3):
    for i in range(retries):
        try:
            if method == "POST":
                r = requests.post(url, headers=HEADERS, json=data)
            elif method == "PATCH":
                r = requests.patch(url, headers=HEADERS, json=data)
            elif method == "GET":
                r = requests.get(url, headers=HEADERS)
            
            if r.status_code == 429:
                wait = float(r.headers.get("Retry-After", 1))
                print(f"  Rate limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            
            if r.status_code >= 400:
                print(f"  ERROR {r.status_code}: {r.text[:300]}")
                if i < retries - 1:
                    time.sleep(1)
                    continue
                return None
            
            return r.json()
        except Exception as e:
            print(f"  Exception: {e}")
            if i < retries - 1:
                time.sleep(1)
    return None

def create_goal(title, company, level, parent_goal=None, due_date=None, 
                key_results="", why_matters="", owner="Otto", status="Not Started"):
    """Create a goal in the Goals DB."""
    props = {
        "Goal": {"title": [{"text": {"content": title}}]},
        "Level": {"select": {"name": level}},
        "Status": {"select": {"name": status}},
    }
    if company:
        props["Company"] = {"relation": [{"id": COMPANIES[company]}]}
    if parent_goal:
        props["Parent Goal"] = {"relation": [{"id": parent_goal}]}
    if due_date:
        props["Due Date"] = {"date": {"start": due_date}}
    if key_results:
        props["Key Results"] = {"rich_text": [{"text": {"content": key_results[:2000]}}]}
    if why_matters:
        props["Why This Matters"] = {"rich_text": [{"text": {"content": why_matters[:2000]}}]}
    if owner:
        props["Owner"] = {"select": {"name": owner}}
    
    data = {
        "parent": {"database_id": GOALS_DB},
        "properties": props
    }
    
    result = api_call("POST", "https://api.notion.com/v1/pages", data)
    if result:
        gid = result["id"]
        print(f"  ✅ Goal: {title} -> {gid}")
        LOG.append(f"Goal | {level} | {company or 'Cross'} | {title} | {gid}")
        time.sleep(0.35)
        return gid
    else:
        print(f"  ❌ Failed: {title}")
        LOG.append(f"FAILED Goal | {title}")
        return None

def create_task(title, company, goal_id=None, priority="P1", assignee="Otto", 
                due_date=None, effort="M", status="Todo"):
    """Create a task in the Tasks DB."""
    # First need to find the Tasks DB actual database_id
    props = {
        "Task": {"title": [{"text": {"content": title}}]},
        "Priority": {"select": {"name": priority}},
        "Status": {"select": {"name": status}},
        "Assignee": {"select": {"name": assignee}},
    }
    if company:
        props["Company"] = {"relation": [{"id": COMPANIES[company]}]}
    if goal_id:
        props["Goal"] = {"relation": [{"id": goal_id}]}
    if due_date:
        props["Due Date"] = {"date": {"start": due_date}}
    if effort:
        props["Effort"] = {"select": {"name": effort}}
    
    data = {
        "parent": {"database_id": TASKS_DB_ID},
        "properties": props
    }
    
    result = api_call("POST", "https://api.notion.com/v1/pages", data)
    if result:
        tid = result["id"]
        print(f"  ✅ Task: {title} -> {tid}")
        LOG.append(f"Task | {company or 'Cross'} | {title} | {tid}")
        time.sleep(0.35)
        return tid
    else:
        print(f"  ❌ Failed task: {title}")
        LOG.append(f"FAILED Task | {title}")
        return None

def update_page(page_id, properties):
    """Update a page's properties."""
    data = {"properties": properties}
    result = api_call("PATCH", f"https://api.notion.com/v1/pages/{page_id}", data)
    if result:
        print(f"  ✅ Updated: {page_id}")
    else:
        print(f"  ❌ Failed update: {page_id}")
    time.sleep(0.35)
    return result

# First, find the Tasks DB actual database_id
print("Finding Tasks DB database_id...")
r = api_call("POST", f"https://api.notion.com/v1/data_sources/{TASKS_DS}/query", {"page_size": 1})
if r and r.get("results"):
    parent = r["results"][0].get("parent", {})
    TASKS_DB_ID = parent.get("database_id", "")
    print(f"  Tasks DB ID: {TASKS_DB_ID}")
else:
    # Try creating directly with data_source parent
    # Query to get the database_id from the data_source itself
    ds = api_call("GET", f"https://api.notion.com/v1/data_sources/{TASKS_DS}")
    if ds:
        # The data_source IS the database in new API
        TASKS_DB_ID = TASKS_DS  # might need database_id
        print(f"  Using Tasks DS as DB: {TASKS_DB_ID}")
    else:
        print("FATAL: Cannot find Tasks DB")
        sys.exit(1)

# Also find Companies DB database_id
print("Finding Companies DB database_id...")
for ds_id in COMPANIES_DS_OPTIONS:
    r = api_call("POST", f"https://api.notion.com/v1/data_sources/{ds_id}/query", {"page_size": 1})
    if r and r.get("results"):
        # Check if our company IDs are in here
        page_ids = [p["id"] for p in r["results"]]
        parent = r["results"][0].get("parent", {})
        COMPANIES_DB_ID = parent.get("database_id", "")
        print(f"  Companies DB ID from {ds_id}: {COMPANIES_DB_ID}")
        # Check if IAM is here
        for p in r["results"]:
            if p["id"] in COMPANIES.values():
                print(f"  ✅ Found company pages in this DB")
                break
        break

# ============================================================
# STEP 1: Financial projections on 6-month goals
# ============================================================
print("\n" + "="*60)
print("STEP 1: FINANCIAL PROJECTIONS ON 6-MONTH GOALS")
print("="*60)

financial_targets = {
    "IAM": "FINANCIAL TARGET: €500K ARR by Oct 2026 (€40K/mo) → 15x revenue multiple = €7.5M valuation. IAM is the cash cow that funds the entire portfolio.",
    "ZenithCred": "FINANCIAL TARGET: Seed round €2.5-3.5M pre-money → Series A at €15-20M → contributes €100M+ to portfolio. The wellness-tech market is exploding.",
    "OttoGen": "FINANCIAL TARGET: €120K ARR (€10K/mo services + content) → €2M valuation. Personal brand drives deal flow across all Oopuo ventures.",
    "CuttingEdge": "FINANCIAL TARGET: €200K revenue → cash flow positive, stable. Reliable cash flow supports portfolio operations and covers overhead.",
    "SentinAgro": "FINANCIAL TARGET: Pre-seed valuation €5-10M based on IP + partnerships. AgriTech market validation creates massive optionality.",
    "Chimera": "FINANCIAL TARGET: Protocol token + infrastructure = potential €500M+ (the big bet). Distributed AI is the moonshot that makes $1B possible.",
}

for company, text in financial_targets.items():
    gid = SIX_MONTH[company]
    print(f"Updating {company} 6-month goal with financial target...")
    update_page(gid, {
        "Why This Matters": {"rich_text": [{"text": {"content": text}}]}
    })

# ============================================================
# STEP 2: 3-MONTH OBJECTIVES
# ============================================================
print("\n" + "="*60)
print("STEP 2: 3-MONTH OBJECTIVES")
print("="*60)

three_month = {}  # company -> {title: id}

objectives_3m = {
    "IAM": [
        ("Relaunch website with kindergarten specialist positioning", "Website live with new positioning, SEO optimized"),
        ("Close 5 new kindergarten clients", "5 signed contracts, €2K+ MRR from new clients"),
        ("Build content library to 100+ activities", "100 activity cards designed, tested, and catalogued"),
        ("Establish 3 distribution partnerships", "3 signed distribution agreements"),
    ],
    "ZenithCred": [
        ("Complete investor pitch deck v3", "Deck finalized, financial model updated, reviewed by advisors"),
        ("Build MVP demo (light panels + app prototype)", "Working demo for investor meetings"),
        ("Conduct 15 investor meetings", "15 meetings completed, pipeline tracked"),
        ("Secure 2 LOIs from pilot customers", "2 signed LOIs from wellness centers or hotels"),
    ],
    "OttoGen": [
        ("Launch ottogen.io website (Swiss Cyberpunk design)", "Website live, 500+ visitors/month"),
        ("Create first 4 webinar modules", "4 modules recorded, landing pages live"),
        ("Sign 5 SMB AI service clients", "5 contracts signed, €5K+ MRR"),
        ("Build content pipeline (2 posts/week)", "24 posts published, growing LinkedIn following"),
    ],
    "CuttingEdge": [
        ("Complete 2 active projects", "Projects delivered on time and budget"),
        ("Build referral pipeline", "5 warm referral sources identified and activated"),
        ("Create portfolio showcase website", "Website live with case studies"),
    ],
    "SentinAgro": [
        ("Complete market feasibility study", "Report with TAM/SAM/SOM, competitor analysis"),
        ("Identify 3 pilot farm partners", "3 farms committed to pilot program"),
        ("Research drone + sensor tech stack", "Tech stack selected, costs estimated"),
    ],
    "Chimera": [
        ("Complete Phase 3 (distributed networking)", "Networking layer functional, peer discovery working"),
        ("Deploy 3 test nodes", "3 nodes running stable for 7+ days"),
        ("Write technical whitepaper", "Whitepaper v1 published"),
    ],
}

for company, objectives in objectives_3m.items():
    three_month[company] = {}
    parent = SIX_MONTH[company]
    print(f"\n--- {company} 3-Month Objectives ---")
    for title, kr in objectives:
        gid = create_goal(
            title=title,
            company=company,
            level="🗓️ 3-Month Objective",
            parent_goal=parent,
            due_date="2026-04-30",
            key_results=kr,
            owner="Otto",
            status="Not Started"
        )
        if gid:
            three_month[company][title] = gid

# ============================================================
# STEP 3: 1-MONTH TARGETS (Feb 2026)
# ============================================================
print("\n" + "="*60)
print("STEP 3: 1-MONTH TARGETS (February 2026)")
print("="*60)

one_month = {}  # company -> {title: id}

targets_1m = {
    "IAM": [
        ("Draft new website wireframes and copy", "Relaunch website with kindergarten specialist positioning", "Wireframes approved, copy written for all pages", "€0 cost, foundation for March launch"),
        ("Identify and contact 20 target kindergartens", "Close 5 new kindergarten clients", "20 outreach emails sent, 5 responses", "Build pipeline for Q1 target"),
        ("Design 25 new activity cards", "Build content library to 100+ activities", "25 cards designed and tested", "Monthly target: €0 → content is free marketing"),
        ("Research and shortlist 5 distribution partners", "Establish 3 distribution partnerships", "5 partners identified, 3 initial calls made", "Partnership pipeline started"),
    ],
    "ZenithCred": [
        ("Update pitch deck financials and narrative", "Complete investor pitch deck v3", "Deck v2.5 ready for feedback", "Feb financial target: €0 spend, prep for €1.1M raise"),
        ("Create clickable app prototype", "Build MVP demo (light panels + app prototype)", "Figma prototype with 5 core screens", "Demo ready for investor meetings"),
        ("Research and list 20 target investors", "Conduct 15 investor meetings", "20 VCs/angels identified, 5 outreach emails sent", "Pipeline: need 3x funnel for 15 meetings"),
        ("Draft LOI template and identify 5 pilot candidates", "Secure 2 LOIs from pilot customers", "Template ready, 5 prospects contacted", "Validation for investor deck"),
    ],
    "OttoGen": [
        ("Design and build ottogen.io landing page", "Launch ottogen.io website (Swiss Cyberpunk design)", "Landing page live, analytics installed", "Feb: €0 investment, sweat equity"),
        ("Outline and script webinar module 1", "Create first 4 webinar modules", "Module 1 scripted and slides drafted", "Content foundation for recurring revenue"),
        ("Close 1-2 AI service clients", "Sign 5 SMB AI service clients", "1-2 clients onboarded, €1-2K MRR", "Feb financial: €1-2K MRR"),
        ("Set up LinkedIn content calendar", "Build content pipeline (2 posts/week)", "8 posts published in Feb", "Brand building starts now"),
    ],
    "CuttingEdge": [
        ("Deliver milestone 1 on active projects", "Complete 2 active projects", "First milestone delivered for both projects", "Feb revenue: invoice milestones"),
        ("Map referral network and make 5 asks", "Build referral pipeline", "5 referral conversations initiated", "Pipeline for Q2 projects"),
        ("Gather portfolio content and case studies", "Create portfolio showcase website", "3 case studies written", "Foundation for website"),
    ],
    "SentinAgro": [
        ("Research drone cattle monitoring market", "Complete market feasibility study", "Market size data, 10 competitor profiles", "Feb: research phase, €0 spend"),
        ("Identify and contact 5 potential farm partners", "Identify 3 pilot farm partners", "5 farms contacted, 2 interested", "Validation conversations"),
        ("Evaluate 3 drone platforms and 3 sensor systems", "Research drone + sensor tech stack", "Comparison matrix complete", "Tech decisions for prototype"),
    ],
    "Chimera": [
        ("Implement peer discovery protocol", "Complete Phase 3 (distributed networking)", "Peer discovery working on local network", "Core networking foundation"),
        ("Set up 1 test node on cloud infra", "Deploy 3 test nodes", "1 node running stable, monitoring in place", "Infrastructure baseline"),
        ("Draft whitepaper outline and abstract", "Write technical whitepaper", "Outline approved, abstract written", "Thought leadership foundation"),
    ],
}

for company, targets in targets_1m.items():
    one_month[company] = {}
    print(f"\n--- {company} 1-Month Targets ---")
    for title, parent_title, kr, financial in targets:
        parent_id = three_month.get(company, {}).get(parent_title)
        if not parent_id:
            print(f"  ⚠️ No parent found for: {parent_title}")
            parent_id = SIX_MONTH[company]  # fallback
        
        gid = create_goal(
            title=title,
            company=company,
            level="📋 1-Month Target",
            parent_goal=parent_id,
            due_date="2026-02-28",
            key_results=f"{kr}\n\nFinancial: {financial}",
            owner="Otto",
            status="Not Started"
        )
        if gid:
            one_month[company][title] = gid

# ============================================================
# STEP 4: WEEKLY GOALS (This week Feb 7-14, Next week Feb 14-21)
# ============================================================
print("\n" + "="*60)
print("STEP 4: WEEKLY GOALS")
print("="*60)

weekly = {}

weekly_goals = {
    "IAM": [
        ("W1: Complete competitive analysis & draft landing page", "Draft new website wireframes and copy", "2026-02-14"),
        ("W2: Begin kindergarten outreach & finalize wireframes", "Draft new website wireframes and copy", "2026-02-21"),
    ],
    "ZenithCred": [
        ("W1: Update pitch deck & research 20 investors", "Update pitch deck financials and narrative", "2026-02-14"),
        ("W2: Start investor outreach & prototype screens", "Create clickable app prototype", "2026-02-21"),
    ],
    "OttoGen": [
        ("W1: Brand messaging & website wireframes", "Design and build ottogen.io landing page", "2026-02-14"),
        ("W2: Website build & first content published", "Design and build ottogen.io landing page", "2026-02-21"),
    ],
    "CuttingEdge": [
        ("W1: Project review & client updates", "Deliver milestone 1 on active projects", "2026-02-14"),
        ("W2: Portfolio content & referral outreach", "Gather portfolio content and case studies", "2026-02-21"),
    ],
    "SentinAgro": [
        ("W1: Market research deep-dive", "Research drone cattle monitoring market", "2026-02-14"),
        ("W2: Competitor analysis & farm outreach", "Identify and contact 5 potential farm partners", "2026-02-21"),
    ],
    "Chimera": [
        ("W1: Phase 3 spec review & roadmap update", "Implement peer discovery protocol", "2026-02-14"),
        ("W2: Test suite & whitepaper outline", "Draft whitepaper outline and abstract", "2026-02-21"),
    ],
}

for company, weeks in weekly_goals.items():
    weekly[company] = {}
    print(f"\n--- {company} Weekly Goals ---")
    for title, parent_title, due in weeks:
        parent_id = one_month.get(company, {}).get(parent_title)
        if not parent_id:
            parent_id = list(one_month.get(company, {}).values())[0] if one_month.get(company) else SIX_MONTH[company]
        
        gid = create_goal(
            title=title,
            company=company,
            level="🏃 Weekly Sprint",
            parent_goal=parent_id,
            due_date=due,
            owner="Otto",
            status="Not Started"
        )
        if gid:
            weekly[company][title] = gid

# ============================================================
# STEP 5: TASKS (Feb 7-14)
# ============================================================
print("\n" + "="*60)
print("STEP 5: TASKS FOR THIS WEEK")
print("="*60)

# Find the Tasks DB database_id properly
print("Getting Tasks DB database_id...")
r = api_call("GET", f"https://api.notion.com/v1/data_sources/{TASKS_DS}")
if r:
    # Check for database_id in properties relations
    # The parent for creating pages needs to be database_id
    # In 2025-09-03 API, data_sources replaced databases
    # Let's try creating with data_source_id as parent
    pass

# Try to find it from a query
r = api_call("POST", f"https://api.notion.com/v1/data_sources/{TASKS_DS}/query", {"page_size": 1})
if r and r.get("results") and len(r["results"]) > 0:
    TASKS_DB_ID = r["results"][0]["parent"].get("database_id", "")
    print(f"Tasks DB ID: {TASKS_DB_ID}")
elif r and r.get("results") is not None:
    # Empty DB, need to figure out DB ID differently
    # The Goal relation in Tasks points to "300a6c94-88ca-81a5-aa23-f4f55398c9eb"
    # which is the goals DB for the NEW task system
    # Let's check if we can find the actual DB ID from the data_source properties
    ds_info = api_call("GET", f"https://api.notion.com/v1/data_sources/{TASKS_DS}")
    if ds_info:
        # Goal relation points to a different goals DB
        goal_rel = ds_info.get("properties",{}).get("Goal",{}).get("relation",{})
        print(f"Tasks Goal relation: {goal_rel}")
        # The database_id should be extractable. Let's try using the data_source_id as database_id
        TASKS_DB_ID = TASKS_DS
        # Actually in new API, the database_id field in parent is what we need
        # It's likely a different ID. Let me check Goal relation
        goal_ds = goal_rel.get("data_source_id", "")
        goal_db = goal_rel.get("database_id", "")
        print(f"  Goal DS: {goal_ds}, Goal DB: {goal_db}")
        
        # The tasks need to relate to goals in the NEW goals DB (300a6c94-88ca-816d)
        # not the old one (2fba6c94-88ca-81b3)
        # But our goals were created in the OLD one...
        # Let me check which goals DB the task's Goal relation points to

print(f"\nUsing TASKS_DB_ID: {TASKS_DB_ID}")

# Helper to get first weekly goal for a company
def get_weekly_goal(company):
    w = weekly.get(company, {})
    if w:
        return list(w.values())[0]
    om = one_month.get(company, {})
    if om:
        return list(om.values())[0]
    return three_month.get(company, {}).values().__iter__().__next__() if three_month.get(company) else None

tasks_data = [
    # IAM
    ("Review competitive analysis and update positioning", "IAM", "P1", "Otto", "2026-02-10", "M"),
    ("Draft kindergarten-focused landing page copy", "IAM", "P1", "Kira", "2026-02-11", "L"),
    ("Research email outreach tools for kindergarten leads", "IAM", "P2", "Kira", "2026-02-11", "M"),
    ("Create list of 50 target kindergartens in Netherlands", "IAM", "P2", "Kira", "2026-02-12", "L"),
    ("Contact 3 potential distribution partners", "IAM", "P1", "Otto", "2026-02-13", "M"),
    # ZenithCred
    ("Update pitch deck financials with latest projections", "ZenithCred", "P0", "Otto", "2026-02-10", "L"),
    ("Research 20 wellness-focused VCs in Benelux", "ZenithCred", "P1", "Kira", "2026-02-10", "L"),
    ("Draft investor outreach email sequence", "ZenithCred", "P1", "Kira", "2026-02-11", "M"),
    ("Schedule 3 investor intro calls", "ZenithCred", "P1", "Otto", "2026-02-12", "S"),
    ("Build simple product demo mockup", "ZenithCred", "P2", "Kira", "2026-02-13", "L"),
    # OttoGen
    ("Finalize brand messaging and positioning", "OttoGen", "P1", "Otto", "2026-02-10", "M"),
    ("Design website wireframes", "OttoGen", "P1", "Kira", "2026-02-11", "L"),
    ("Write first webinar module outline", "OttoGen", "P1", "Otto", "2026-02-12", "M"),
    ("Set up social media accounts and branding", "OttoGen", "P2", "Kira", "2026-02-12", "M"),
    ("Draft first 2 LinkedIn posts", "OttoGen", "P2", "Kira", "2026-02-13", "S"),
    # CuttingEdge
    ("Review active project timelines", "CuttingEdge", "P1", "Otto", "2026-02-10", "S"),
    ("Create client update reports", "CuttingEdge", "P2", "Kira", "2026-02-11", "M"),
    ("Draft portfolio website content", "CuttingEdge", "P2", "Kira", "2026-02-13", "L"),
    # SentinAgro
    ("Research drone cattle monitoring market size", "SentinAgro", "P1", "Kira", "2026-02-12", "L"),
    ("Identify competing solutions and their pricing", "SentinAgro", "P2", "Kira", "2026-02-13", "M"),
    ("Draft feasibility study outline", "SentinAgro", "P2", "Kira", "2026-02-14", "M"),
    # Chimera
    ("Review Phase 3 specs and update roadmap", "Chimera", "P1", "Otto", "2026-02-11", "M"),
    ("Run test suite and fix failing tests", "Chimera", "P1", "Kira", "2026-02-12", "M"),
    ("Draft technical whitepaper outline", "Chimera", "P2", "Kira", "2026-02-14", "L"),
    # Cross-company
    ("Morning routine setup: configure dashboards", None, "P1", "Otto", "2026-02-10", "S"),
    ("Review and approve Notion structure", None, "P0", "Otto", "2026-02-10", "S"),
]

# Check if tasks DB Goal relation points to the same goals DB we created in
# The tasks DS Goal relation points to 300a6c94-88ca-81a5-aa23-f4f55398c9eb (from the DS info)
# which is the NEW goals DB. But our goals are in the OLD one (2fba6c94-88ca-8102).
# We need to check this...

# Actually let's just try creating tasks and see if the relation works
for title, company, priority, assignee, due, effort in tasks_data:
    goal_id = get_weekly_goal(company) if company else None
    create_task(title, company, goal_id, priority, assignee, due, effort)

# ============================================================
# STEP 6: UPDATE COMPANIES DB
# ============================================================
print("\n" + "="*60)
print("STEP 6: UPDATE COMPANIES DB")
print("="*60)

company_updates = {
    "IAM": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "Monthly Recurring Revenue (MRR) from kindergarten clients"}}]},
        "Current Phase": {"select": {"name": "Building"}},
    },
    "ZenithCred": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "Investor meetings booked / Seed round progress"}}]},
        "Current Phase": {"select": {"name": "Validation"}},
    },
    "OttoGen": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "MRR from AI services + content revenue"}}]},
        "Current Phase": {"select": {"name": "Building"}},
    },
    "CuttingEdge": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "Monthly revenue / Active project count"}}]},
        "Current Phase": {"select": {"name": "Growth"}},
    },
    "SentinAgro": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "Feasibility study completion %"}}]},
        "Current Phase": {"select": {"name": "Ideation"}},
    },
    "Chimera": {
        "Health": {"select": {"name": "🟡 At Risk"}},
        "Key Metric": {"rich_text": [{"text": {"content": "Test nodes deployed / Phase completion"}}]},
        "Current Phase": {"select": {"name": "Building"}},
    },
}

for company, props in company_updates.items():
    cid = COMPANIES[company]
    print(f"Updating {company}...")
    update_page(cid, props)
    LOG.append(f"Company Update | {company} | {cid}")

# ============================================================
# SAVE LOG
# ============================================================
print("\n" + "="*60)
print("SAVING LOG")
print("="*60)

log_content = "# Notion Population Log\n"
log_content += f"## Generated: 2026-02-07T18:05:00Z\n\n"
log_content += "## Summary\n"
log_content += f"- 3-Month Objectives created: {sum(len(v) for v in three_month.values())}\n"
log_content += f"- 1-Month Targets created: {sum(len(v) for v in one_month.values())}\n"
log_content += f"- Weekly Goals created: {sum(len(v) for v in weekly.values())}\n"
log_content += f"- Tasks created: {len([l for l in LOG if l.startswith('Task |')])}\n"
log_content += f"- Companies updated: {len(company_updates)}\n\n"
log_content += "## All Items\n\n"
for line in LOG:
    log_content += f"- {line}\n"

log_content += "\n## Goal IDs Reference\n\n"
log_content += "### 3-Month Objectives\n"
for company, goals in three_month.items():
    for title, gid in goals.items():
        log_content += f"- {company}: {title} = {gid}\n"

log_content += "\n### 1-Month Targets\n"
for company, goals in one_month.items():
    for title, gid in goals.items():
        log_content += f"- {company}: {title} = {gid}\n"

log_content += "\n### Weekly Goals\n"
for company, goals in weekly.items():
    for title, gid in goals.items():
        log_content += f"- {company}: {title} = {gid}\n"

with open("/home/adminuser/kira/vdr/notion-population-log.md", "w") as f:
    f.write(log_content)

print(f"\n✅ Log saved to ~/kira/vdr/notion-population-log.md")
print(f"Total log entries: {len(LOG)}")
print("\nDONE!")
