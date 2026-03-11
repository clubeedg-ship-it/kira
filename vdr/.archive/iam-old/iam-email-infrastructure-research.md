# Email Infrastructure Research: 500 Cold Emails/Day to Dutch Kindergartens

**Date:** 2026-02-09  
**Goal:** Send 500 cold B2B emails/day to Dutch kindergartens with high deliverability, tracking, and GDPR compliance.

---

## 1. Self-Hosted Options

### Overview

| Solution | Type | Effort | Monthly Cost |
|----------|------|--------|-------------|
| **Postal** | Open-source mail server | High | €5-20 (VPS only) |
| **Mailtrain + SMTP** | Newsletter + own SMTP | High | €5-20 (VPS only) |
| **Mail-in-a-Box** | Full mail server | Medium | €10-20 (VPS only) |
| **iRedMail** | Full mail server | High | €10-20 (VPS only) |

### Infrastructure Needed
- **VPS:** Hetzner CX22 (€4.49/mo) or CX32 (€7.49/mo) — good EU-based provider
- **Dedicated IP:** Essential — shared IPs = shared reputation
- **Domain(s):** Separate from main business domain (see Section 4)
- **DNS records:** SPF, DKIM, DMARC, rDNS/PTR record
- **Monitoring:** Postfix logs, bounce tracking

### Verdict on Self-Hosted
**Not recommended for cold email.** Reasons:
- No built-in warm-up tools
- No inbox rotation
- IP reputation management is manual and painful
- No deliverability monitoring
- If IP gets blacklisted, you're done (single point of failure)
- Time to build: 2-4 weeks, ongoing maintenance
- Missing: open/click tracking, unsubscribe management, bounce handling (must build yourself)

Self-hosted works for transactional email or newsletters to opted-in lists. For cold outreach, the deliverability risk is too high.

---

## 2. Managed SMTP Services (Cheap Tier)

| Service | Price at 15K emails/mo | Cold Email Allowed? | Notes |
|---------|----------------------|---------------------|-------|
| **Amazon SES** | ~$1.50 ($0.10/1000) | ❌ Explicitly forbidden | Will suspend account for cold email |
| **Mailgun** | $35/mo (50K emails) | ⚠️ Grey area | May work short-term, risk of suspension |
| **SendGrid** | $19.95/mo (50K) | ❌ No cold email | Will flag unsolicited sends |
| **Postmark** | $15/mo (10K) | ❌ Transactional only | Strictest anti-spam policy |
| **Brevo (Sendinblue)** | Free tier: 300/day | ⚠️ Tolerant of B2B | Better option but still risky at scale |
| **Resend** | $20/mo (50K) | ❌ No cold email | Developer-focused, transactional |

### Verdict on Managed SMTP
**Not suitable for cold outreach.** All major SMTP providers either explicitly ban cold email or will suspend your account once complaint rates rise. They protect their shared infrastructure reputation.

**Exception:** Amazon SES or Mailgun can work as the *sending backend* for cold email tools (Instantly, Smartlead) that manage warm-up and rotation on top. But don't use them directly.

---

## 3. Cold Email Specific Tools (⭐ Best Category)

### Instantly.ai
- **Pricing:** $37/mo (Growth) — 5,000 emails/mo, 1,000 contacts | $97/mo (Hypergrowth) — 100,000 emails/mo, 25,000 contacts
- **Key features:** Unlimited email accounts, unlimited warm-up, inbox rotation, A/Z testing, bounce detection
- **For 500/day (15K/mo):** Need **Hypergrowth at $97/mo** (Growth plan's 5K/mo is too low)
- **Pros:** Best warm-up system, huge warm-up network, simple UI
- **Cons:** Need to bring your own email accounts (Google Workspace or Outlook)

### Smartlead.ai
- **Pricing:** Base $39/mo (6K sends/mo) | Pro $94/mo (90K sends/mo) | Smart $174/mo (150K sends/mo)
- **Key features:** Unlimited email accounts, built-in warm-up, SmartSenders (buy mailboxes in-app at $4.50/mailbox/mo)
- **For 500/day (15K/mo):** Need **Pro at $94/mo**
- **Pros:** SmartSenders makes mailbox setup easy, good deliverability
- **Cons:** UI less polished than Instantly

### Woodpecker.co
- **Pricing:** Starter $24/mo (500 prospects, 6K emails/mo) | Growth $126/mo (10K prospects, 120K emails/mo)
- **Key features:** Catch-all email verification (free), inbox rotation, adaptive sending, human-like randomization
- **Add-ons:** Domains ~$1/mo, email accounts $4-6/mo, warm-up $5/mo per inbox
- **For 500/day:** **Starter at $24/mo** (500 contacted prospects/mo fits if sending to 500 unique people) or Growth at $126/mo for more headroom
- **Pros:** Cheapest entry, built-in email verification, EU-based (Poland — GDPR-friendly), buy domains + mailboxes directly in-app
- **Cons:** Starter plan is tight at exactly 500 prospects

### Lemlist
- **Pricing:** Email Pro $69/mo | Multichannel Expert $99/mo
- **For 500/day:** ~$69-99/mo
- **Pros:** Good personalization, LinkedIn integration
- **Cons:** More expensive for email-only, 3 email accounts on base plan

### Apollo.io
- **Pricing:** Free (250 emails/day) | Basic $49/mo (unlimited emails)
- **Key features:** Built-in B2B database, email finding, sequences
- **Pros:** Lead database included — may have Dutch kindergarten contacts
- **Cons:** Deliverability tools less mature than Instantly/Smartlead

---

## 4. Deliverability Best Practices for 500/Day

### Domain Strategy
- **Never use your main domain** for cold email. If it gets blacklisted, all company email is affected.
- **Buy 3-5 secondary domains** similar to your main brand (e.g., if main is `kinderopvang.nl`, buy `kinderopvang-info.nl`, `kinderopvangapp.nl`, etc.)
- Cost: ~€10-15/domain/year × 5 = **€50-75/year**
- Register with different TLDs: `.nl`, `.com`, `.eu`

### Email Account Strategy
- **Rule of thumb:** Max 30-50 emails per account per day for cold email
- **For 500/day:** Need **10-15 email accounts** across your domains (2-3 per domain)
- Create accounts like: `lisa@`, `mark@`, `info@`, `team@` on each domain

### Email Account Providers
| Provider | Cost/mailbox/mo | Setup |
|----------|----------------|-------|
| Google Workspace | €5.75/user | Best deliverability to Gmail |
| Microsoft 365 | €5.60/user | Best deliverability to Outlook |
| Woodpecker built-in (Maildoso/Infraforge) | $4/mailbox/mo | Cheapest, purpose-built for cold email |
| Smartlead SmartSenders | $4.50/mailbox/mo | Convenient |

**For 15 accounts:** €60-86/mo (Google/Microsoft) or ~$60-68/mo (Maildoso/Infraforge)

### Warm-Up Schedule
Cold email accounts need **2-4 weeks of warm-up** before sending real campaigns:

| Week | Warm-up emails/day | Real emails/day |
|------|-------------------|-----------------|
| 1 | 5-10 per account | 0 |
| 2 | 15-25 per account | 5-10 per account |
| 3 | 25-40 per account | 15-25 per account |
| 4+ | Continue warm-up | 30-50 per account |

- **Time to reach 500/day:** ~4 weeks from domain purchase
- Keep warm-up running permanently (Instantly/Smartlead do this automatically)

### DNS Setup (Per Domain)
```
SPF:  v=spf1 include:_spf.google.com ~all
DKIM: Generated by email provider (2048-bit key)
DMARC: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.nl
rDNS/PTR: Set via hosting provider (if self-hosted)
```

### Sending Best Practices
- **Max 30-50 emails/account/day** (stay under provider radar)
- **Rotate accounts:** Use inbox rotation (all tools above support this)
- **Spacing:** 60-180 seconds between emails (human-like)
- **Personalize:** Use first name, kindergarten name, city — generic = spam
- **Unsubscribe link:** Required by GDPR and improves deliverability
- **Plain text or minimal HTML:** Heavy HTML triggers spam filters
- **No link shorteners** (bit.ly etc.) — spam signal
- **Custom tracking domain:** For open/click tracking (CNAME on your domain)

---

## 5. GDPR & Legal Considerations (Netherlands)

### B2B Cold Email in the Netherlands
- **Telecom Act (Telecommunicatiewet) Article 11.7:** Cold email to **businesses** is allowed if:
  1. The email is relevant to the recipient's professional role
  2. You identify yourself clearly
  3. You provide an easy opt-out/unsubscribe mechanism
  4. You honor opt-outs immediately

- **Key distinction:** B2B cold email to a company's general address (info@kindergarten.nl) is generally **permitted** under Dutch law. Emailing personal addresses (jan.devries@kindergarten.nl) is more restricted.

### Requirements for Compliance
1. ✅ Clear sender identification (company name, address)
2. ✅ One-click unsubscribe link in every email
3. ✅ Honor unsubscribes within 10 business days (best: immediately)
4. ✅ No deceptive subject lines
5. ✅ Include physical business address
6. ✅ Maintain a suppression list (people who opted out)
7. ✅ Legitimate interest basis for processing (GDPR Art. 6(1)(f))
8. ✅ Privacy policy accessible

### Risk Level
**Low-medium** for B2B cold email to kindergartens IF you follow the rules. Dutch businesses rarely report B2B cold email as spam if it's relevant and professional. The Autoriteit Persoonsgegevens (Dutch DPA) focuses enforcement on consumer spam, not B2B outreach.

---

## 6. Recommendation

### 🏆 Best Option: Instantly.ai Hypergrowth + Woodpecker Domains/Mailboxes

**Primary tool: Instantly.ai ($97/mo)**
- Best warm-up network in the industry
- Unlimited email accounts and warm-up
- Excellent deliverability monitoring
- Simple campaign setup

**Alternative (budget pick): Woodpecker Starter ($24/mo)**
- If you can stay within 500 contacted prospects/month
- Buy domains ($1/mo) and mailboxes ($4-6/mo) directly in Woodpecker
- EU-based = GDPR-aligned
- Built-in email verification saves bounces
- **Total with 15 mailboxes + 5 domains:** ~$24 + $65 + $5 = **~$94/mo**

### Recommended Setup

| Component | Choice | Monthly Cost |
|-----------|--------|-------------|
| Cold email tool | Instantly Hypergrowth | $97 |
| Domains (5×) | Namecheap/TransIP | ~$5 (amortized) |
| Email accounts (15×) | Google Workspace or Maildoso | $60-86 |
| **Total** | | **~$162-188/mo** |

### Alternative Budget Setup (Woodpecker)

| Component | Choice | Monthly Cost |
|-----------|--------|-------------|
| Cold email tool | Woodpecker Starter | $24 |
| Domains (5×, in-app) | Woodpecker add-on | $5 |
| Email accounts (15×, in-app) | Maildoso via Woodpecker | $60 |
| Warm-up (15 accounts) | 2 free + 13× $5 | $65 |
| **Total** | | **~$154/mo** |

### Timeline to 500/Day

| Week | Action |
|------|--------|
| Day 1 | Sign up for Instantly/Woodpecker |
| Day 1-2 | Buy 5 domains, set up DNS (SPF/DKIM/DMARC) |
| Day 2-3 | Create 15 email accounts, connect to tool |
| Day 3 | Start warm-up (automated) |
| Week 2 | Begin sending 50-100/day (test campaigns) |
| Week 3 | Scale to 200-300/day |
| Week 4 | Full capacity: 500/day |

### Setup Complexity
- **Instantly:** ⭐⭐ Easy (2/5) — straightforward, good docs
- **Woodpecker:** ⭐⭐ Easy (2/5) — even has in-app domain/mailbox purchase
- **Self-hosted:** ⭐⭐⭐⭐⭐ Hard (5/5) — don't do this for cold email

### Final Verdict

**Go with Instantly.ai** if budget allows ~$160-190/mo total. Best deliverability, fastest warm-up, least headaches.

**Go with Woodpecker** if you want slightly lower cost and like the all-in-one approach (buy domains + mailboxes inside the tool). Being EU-based is a bonus for GDPR optics.

**Do NOT self-host or use generic SMTP providers** (SES, SendGrid, etc.) for cold email. You'll get suspended or blacklisted within days.

---

## Appendix: Quick Comparison Matrix

| Criteria | Instantly | Smartlead | Woodpecker | Self-Hosted | SES/SendGrid |
|----------|-----------|-----------|------------|-------------|-------------|
| Cold email designed | ✅ | ✅ | ✅ | ❌ | ❌ |
| Built-in warm-up | ✅ | ✅ | ✅ ($5/inbox) | ❌ | ❌ |
| Inbox rotation | ✅ | ✅ | ✅ | ❌ | ❌ |
| Bounce handling | ✅ | ✅ | ✅ | Manual | ✅ |
| Unsubscribe mgmt | ✅ | ✅ | ✅ | Manual | Manual |
| Open/click tracking | ✅ | ✅ | ✅ | Manual | Partial |
| Monthly cost (total) | ~$165 | ~$160 | ~$155 | ~$80 | ~$20 |
| Risk of blacklist | Low | Low | Low | High | Account ban |
| Setup time | 1 day | 1 day | 1 day | 2-4 weeks | 1 day |
| Time to 500/day | 4 weeks | 4 weeks | 4 weeks | 4-8 weeks | N/A |
