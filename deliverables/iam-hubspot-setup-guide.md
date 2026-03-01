# HubSpot Form Setup Guide — InterActiveMove.nl
**Status:** HubSpot WP Plugin v11.3.33 already installed and active

---

## What's Already Done
- HubSpot WordPress plugin installed ✅
- Page Analytics tracking active ✅
- Plugin connected to a HubSpot account ✅

## What Needs Configuration

### Step 1: Verify HubSpot Account Access
1. Log into wp-admin → HubSpot menu in sidebar
2. Check which HubSpot account is connected
3. Log into that HubSpot account at app.hubspot.com

### Step 2: Create Lead Capture Form
In HubSpot (app.hubspot.com):
1. Go to **Marketing → Lead Capture → Forms**
2. Click **Create Form** → Embedded Form
3. Add fields:
   - Name (required)
   - Email (required)
   - Company/Organization
   - Phone (optional)
   - Interest: dropdown → "IAM Moving" / "IAM Learning" / "IAM Playing" / "Partnership" / "Other"
   - Message (textarea)
4. Set **Thank You** action → redirect to /thank-you/ (page already exists)
5. Set **Notifications** → email to klantcontact@interactivemove.nl
6. Save & Publish

### Step 3: Embed on Website
**Option A: Via WordPress Plugin (Recommended)**
1. In WordPress editor, open /contacts/ page
2. Add a **HubSpot Form** block (or use shortcode)
3. Select the form you created
4. Save & publish

**Option B: Via Elementor**
1. Edit /contacts/ with Elementor
2. Add HTML widget
3. Paste embed code from HubSpot (Forms → Actions → Share → Embed Code)
4. Save

### Step 4: Also Add Form To
- `/be-a-partner/` page — for partnership inquiries
- Consider a popup form for product pages (catalog, individual products)

### Step 5: Set Up Pipeline (Optional but Recommended)
In HubSpot:
1. Go to **CRM → Contacts**
2. Create a **Deal Pipeline**: New Lead → Contacted → Demo Scheduled → Proposal Sent → Won/Lost
3. Set up automatic deal creation when form is submitted
4. Add lead scoring based on "Interest" field

---

## Testing Checklist
- [ ] Form renders correctly on /contacts/
- [ ] Form submission creates contact in HubSpot
- [ ] Email notification fires to klantcontact@interactivemove.nl
- [ ] Thank you page redirect works
- [ ] Form is mobile-responsive
- [ ] GDPR consent checkbox included (required for EU)
