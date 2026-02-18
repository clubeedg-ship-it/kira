# OttoGen Webinar Module
## "How AI Can Actually Help Your Business (Without the Hype)"
### 45-Minute Live Session | Swiss Cyberpunk Aesthetic

---

## Visual Direction
- **Color palette:** Deep black (#0A0A0A), electric cyan (#00F0FF), white (#FAFAFA), accent magenta (#FF2D6B)
- **Typography:** Mono headers (JetBrains Mono or Space Mono), clean sans body (Inter or Helvetica Neue)
- **Slides:** Minimal. One idea per slide. Dark backgrounds, thin cyan borders, generous whitespace
- **Animations:** Subtle glitch transitions between sections. No flashy gimmicks.

---

## 1. HOOK / OPENING — 3 min

### Talking Points
- Open cold: *"Last year, SMBs spent $14 billion on AI tools. Most of them are paying for software nobody uses."*
- Introduce yourself: Otto, founder of OttoGen. Not a tech evangelist — a pragmatist who builds AI systems that actually work for small teams.
- Set the promise: *"In 45 minutes, you'll leave with a framework to figure out exactly where AI saves you time and money — and where it's a waste."*
- Anti-hype positioning: *"I'm not here to sell you on 'the future.' I'm here to talk about Tuesday morning at your business."*

### Slide: Title Card
> **"How AI Can Actually Help Your Business"**
> *(Without the Hype)*
> OttoGen | [date]

### Slide: The Promise
> By the end of this session you will:
> 1. Know exactly which tasks in your business AI can handle today
> 2. Have a 3-step framework to evaluate any AI tool
> 3. See a live automation built in real time

---

## 2. THE PROBLEM — 7 min

### Talking Points
- **The Shiny Tool Trap:** SMBs buy ChatGPT Plus, Jasper, six different "AI" SaaS products. Staff uses them for a week, then stops. $200-2,000/mo burned.
- **The Enterprise Hangover:** Most AI advice is written for companies with 500+ employees and dedicated IT teams. Doesn't translate to a 15-person operation.
- **The Real Cost:** It's not the subscription — it's the time your team spends trying to figure out tools that don't fit their workflow.
- **The Misconception Stack:**
  - ❌ "AI will replace my employees" → It won't. It handles the work nobody wants to do.
  - ❌ "I need to understand AI to use it" → You don't understand electricity either. You use the light switch.
  - ❌ "It's too expensive for my size" → The most impactful automations cost $0-50/mo to run.

### 🗳️ ENGAGEMENT: Poll #1
> **"How many AI tools is your business currently paying for?"**
> - None yet
> - 1-2
> - 3-5
> - 6+ (send help)

### Slide: The Waste
> **Average SMB spends $8,400/year on AI tools**
> **Average ROI realized: unknown**
> *Because nobody's measuring it.*

### Slide: Wrong Audience
> Enterprise AI advice → your 12-person team
> = Buying a forklift to move a couch

---

## 3. THE FRAMEWORK — 15 min

### The OttoGen AIM Framework
**A**udit → **I**dentify → **M**echanize

---

### Step 1: AUDIT (5 min)
**Find the hidden time sinks.**

#### Talking Points
- Exercise: List every task your team does that is (a) repetitive, (b) rule-based, (c) annoying
- These are your "automation candidates" — not the creative, human-judgment work
- Common gold mines:
  - Email sorting and response drafting
  - Invoice processing and follow-ups
  - Appointment scheduling and reminders
  - Data entry between systems (CRM ↔ spreadsheet ↔ email)
  - Social media posting from existing content
- *"If someone on your team says 'I hate doing this' — that's your signal."*

#### 🗳️ ENGAGEMENT: Live Question
> **"Type in chat: What's the one task your team complains about most?"**
> (Read 3-4 responses live, react to them)

#### Slide: The Audit Grid
| Task | Repetitive? | Rule-based? | Hours/week | Automation Candidate? |
|------|:-----------:|:-----------:|:----------:|:---------------------:|
| Email follow-ups | ✓ | ✓ | 6h | ✅ |
| Client strategy | ✗ | ✗ | 10h | ❌ |
| Invoice chasing | ✓ | ✓ | 3h | ✅ |
| Sales calls | ✗ | Partial | 8h | ⚠️ Assist only |

---

### Step 2: IDENTIFY (5 min)
**Match the right solution to the right problem.**

#### Talking Points
- Three tiers of AI solutions (start at Tier 1, most SMBs never need Tier 3):
  - **Tier 1 — Automations:** Zapier, Make, n8n. No AI needed, just connecting systems. $0-50/mo.
  - **Tier 2 — AI-Assisted:** Add an LLM to draft emails, summarize calls, classify tickets. $20-100/mo.
  - **Tier 3 — Custom AI:** Purpose-built agents, trained on your data. $500+/mo. Only when Tier 1-2 aren't enough.
- *"80% of the value comes from Tier 1. Most people skip straight to Tier 3 and wonder why it's expensive and confusing."*
- The buying rule: **If you can't describe the workflow in one sentence, you're not ready to automate it.**

#### Slide: The Tier Pyramid
> ```
>        /  Tier 3  \     Custom AI — $500+/mo
>       /  Tier 2    \    AI-Assisted — $20-100/mo
>      /   Tier 1     \   Automation — $0-50/mo
>     /________________\
>     80% of your ROI lives here
> ```

---

### Step 3: MECHANIZE (5 min)
**Build it, measure it, iterate.**

#### Talking Points
- Start with ONE workflow. Not five. One.
- Build a quick prototype (demo coming next)
- Measure before/after: time saved, errors reduced, customer response time
- The "Tuesday Test": If it's still running reliably next Tuesday without you touching it, it works.
- Iterate: add the next workflow only after the first one proves ROI
- *"The companies that win with AI aren't the ones using the most tools. They're the ones who automated one thing really well and then did it again."*

#### 🗳️ ENGAGEMENT: Poll #2
> **"After hearing the framework, which tier do you think your business needs most?"**
> - Tier 1 — Just connect my damn systems
> - Tier 2 — I need some AI smarts
> - Tier 3 — Full custom solution
> - No idea yet (that's okay)

#### Slide: The Mechanize Loop
> `[ Build ] → [ Measure ] → [ Iterate ]`
> One workflow at a time. No big bang rollouts.

---

## 4. LIVE DEMO — 10 min

### Workflow: Email → CRM → Automated Follow-Up

#### Setup
Show a real automation built in Make (or n8n) — screen share with dark theme to match aesthetic.

#### The Scenario
> A lead emails your sales inbox. The system:
> 1. **Reads the email** and extracts name, company, intent
> 2. **Creates/updates a CRM record** (HubSpot free tier)
> 3. **Drafts a personalized follow-up** using GPT (tone-matched to your brand)
> 4. **Sends the follow-up** after a 10-minute delay (feels human)
> 5. **Logs everything** to a Google Sheet for your team to review

#### Demo Flow (scripted)
1. **[1 min]** Show the automation diagram — explain each node simply
2. **[2 min]** Walk through the trigger: "New email arrives in sales@"
3. **[2 min]** Show the AI module: "Here's where GPT reads the email and figures out what they want"
4. **[2 min]** Show CRM creation: "Contact auto-created, tagged, assigned"
5. **[2 min]** Show the follow-up draft: "Look at this — personalized, professional, sent automatically"
6. **[1 min]** Trigger it live: send a test email, watch it flow through

#### Key Messaging During Demo
- *"This took me 45 minutes to build. It handles 30+ leads per week without anyone touching it."*
- *"Total cost: $29/mo for Make, $0 for HubSpot free, ~$3/mo in OpenAI credits."*
- *"Your sales person just got 6 hours of their week back."*

#### Slide (pre-demo):
> **Live Build: Email → CRM → Follow-Up**
> Tools: Make.com + HubSpot (free) + GPT-4
> Cost: ~$32/month
> Time saved: ~6 hours/week

---

## 5. CASE STUDIES — 5 min

### Case Study 1: The Accounting Firm (8 employees)
| | Before | After |
|---|--------|-------|
| **Problem** | Manual invoice follow-ups | Automated reminders + escalation |
| **Time spent** | 12 hrs/week | 1 hr/week (review only) |
| **Tool** | Tier 1 — Zapier + QuickBooks | |
| **Cost** | $29/mo | |
| **Result** | Collections improved 34%, bookkeeper refocused on advisory work |

### Case Study 2: The Marketing Agency (22 employees)
| | Before | After |
|---|--------|-------|
| **Problem** | Client reporting took 2 days/month per client | Auto-generated from GA4 + ad platforms |
| **Time spent** | 40 hrs/month total | 4 hrs/month (review + customize) |
| **Tool** | Tier 2 — n8n + GPT for narrative summaries | |
| **Cost** | $50/mo | |
| **Result** | Freed a full-time role, reports delivered faster, clients happier |

### Case Study 3: The E-Commerce Brand (35 employees)
| | Before | After |
|---|--------|-------|
| **Problem** | Customer support ticket triage was chaotic | AI classifies, routes, drafts responses |
| **Time spent** | 3 support staff full-time | 2 staff + AI assist |
| **Tool** | Tier 2 — Custom GPT + Zendesk integration | |
| **Cost** | $120/mo | |
| **Result** | Response time dropped from 4 hours to 22 minutes. CSAT up 18%. |

#### Slide per case study:
> Dark background, company type + employee count top-left
> Before/After split — cyan for improvements
> One big number highlighted (e.g., "34% faster collections")

---

## 6. Q&A + CTA — 5 min

### Q&A (3 min)
- Take 2-3 live questions
- Have 2 planted questions ready in case of silence:
  - *"What if my team isn't technical?"* → "Neither are most of my clients. The whole point is building systems they don't need to understand."
  - *"How long until I see ROI?"* → "Most clients see measurable time savings in week one. Dollar ROI within 30 days."

### CTA (2 min)

#### The Offer: Free AI Audit Call
> *"Here's what I want to offer everyone on this call. I do a limited number of free AI audit sessions each month. It's a 30-minute call where we look at your business, apply the AIM framework together, and I'll tell you — honestly — whether AI can help you right now or if you should wait."*
>
> *"No pitch. No pressure. If there's a fit, great — we can talk about what a project looks like. If not, you'll still walk away with a clear picture of where your opportunities are."*

#### 🗳️ ENGAGEMENT: Final Poll
> **"Would a free AI audit be useful for your business?"**
> - Yes — book me in
> - Maybe — need to think about it
> - No — I've got what I need from this session

#### CTA Funnel
```
┌─────────────────────────────────────────┐
│  WEBINAR (free, value-first)            │
│  ↓                                      │
│  FREE AI AUDIT CALL (30 min, no pitch)  │
│  ↓                                      │
│  PAID ENGAGEMENT                        │
│  • Quick Win Package — $2,500           │
│    (1 automation, built + deployed)      │
│  • Full AIM Buildout — $7,500-15,000    │
│    (Full audit + 3-5 automations)        │
│  • Retainer — $2,000/mo                 │
│    (Ongoing optimization + new builds)   │
│  ↓                                      │
│  REFERRALS + CASE STUDIES               │
│  (Happy clients → next webinar audience) │
└─────────────────────────────────────────┘
```

#### Slide: Final CTA
> **Book Your Free AI Audit**
> 🔗 ottogen.ai/audit
> 30 minutes. No pitch. Just clarity.
> *[QR code centered, large]*

---

## Post-Webinar Sequence

1. **Immediately:** Send replay link + PDF of the AIM Framework (lead magnet)
2. **Day 1:** Email — "Here's what we covered + your audit link"
3. **Day 3:** Email — One case study deep-dive
4. **Day 7:** Email — "Last call for this month's free audit slots"
5. **Day 14:** Add to nurture sequence (monthly AI tips for SMBs)

---

## Production Notes

- **Runtime:** 45 min sharp. Rehearse to hit marks.
- **Platform:** Zoom webinar or StreamYard → LinkedIn Live
- **Recording:** Chop into 5 short-form clips (one per section) for social
- **Deck format:** 16:9, dark theme, max 25 slides total
- **Backup:** Pre-record the demo segment in case of live tech issues

---

*OttoGen — Precision AI for businesses that actually ship.*
