# Google Workspace Setup Guide — otto@oopuo.com

## 1. Import Gmail Filters (2 min)

1. Go to https://mail.google.com (logged in as otto@oopuo.com)
2. Click ⚙️ (gear icon) → "See all settings"
3. Go to "Filters and Blocked Addresses" tab
4. Scroll to bottom → "Import filters"
5. Upload the file: `gmail-filters.xml` (download from server)
6. Check all filters → "Create filters"

This auto-creates labels: 📥 Inbound, 💰 Finance, 🎧 Support, 👋 Hello

## 2. Set Up "Send As" Aliases (3 min)

You want to be able to REPLY as info@oopuo.com, support@oopuo.com, etc.

1. Go to Gmail → ⚙️ → "See all settings"
2. Go to "Accounts" tab (or "Accounts and Import")
3. Under "Send mail as:" → click "Add another email address"
4. For each alias:

   **info@oopuo.com:**
   - Name: "Oopuo" (this is what recipients see)
   - Email: info@oopuo.com
   - ☑️ "Treat as an alias"
   - Click "Next Step" → it should auto-verify (same domain)

   **finance@oopuo.com:**
   - Name: "Oopuo Finance"
   - Email: finance@oopuo.com
   - ☑️ "Treat as an alias"

   **support@oopuo.com:**
   - Name: "Oopuo Support"
   - Email: support@oopuo.com
   - ☑️ "Treat as an alias"

   **hello@oopuo.com:**
   - Name: "Oopuo"
   - Email: hello@oopuo.com
   - ☑️ "Treat as an alias"

5. Set default reply behavior:
   - Under "Send mail as:" → check "Reply from the same address the message was sent to"
   - This means if someone emails info@oopuo.com, your reply automatically comes from info@oopuo.com

## 3. Set Up Gmail Signature (2 min)

1. Gmail → ⚙️ → "See all settings" → "General"
2. Scroll to "Signature"
3. Click "Create new" → name it "Oopuo"
4. Paste this signature:

---
**Otto** | Founder & CEO
Oopuo — Privacy-First AI Infrastructure
🌐 oopuo.com | 📧 otto@oopuo.com
---

5. Under "Signature defaults":
   - For new emails: select "Oopuo"
   - For replies/forwards: select "Oopuo"
6. Save changes

## 4. Create GA4 Property (5 min)

1. Go to https://analytics.google.com (logged in as otto@oopuo.com)
2. Click "Admin" (gear icon, bottom left)
3. Click "Create" → "Property"
4. Property name: "Oopuo Website"
5. Timezone: Europe/Amsterdam (or your preference)
6. Currency: EUR
7. Click "Next" → Business info → select your industry
8. Click "Create"
9. Choose "Web" platform
10. Website URL: https://oopuo.com
11. Stream name: "Oopuo Main"
12. Click "Create stream"
13. **Copy the Measurement ID** (starts with G-)
14. Edit the file on the server: ~/kira/projects/oopuo-website/js/analytics.js
    - Replace `G-XXXXXXXXXX` with your real Measurement ID
15. Enhanced Measurement should be ON by default (tracks scrolls, clicks, etc.)

## 5. Account Migration Checklist

Change email to otto@oopuo.com on these services (one by one):

- [ ] **GitHub:** Settings → Emails → Add otto@oopuo.com → Verify → Set as primary
- [ ] **Hostinger:** Account → Change email
- [ ] **Stripe:** Settings → Business → Update email to otto@oopuo.com
- [ ] **Calendly:** Account Settings → Email → Change to otto@oopuo.com, link Google Calendar
- [ ] **Saleshandy:** Settings → Account → Update email
- [ ] **LinkedIn:** Settings → Account → Email → Add otto@oopuo.com, then create Oopuo company page
- [ ] **Any other services** → Change to otto@oopuo.com

For EACH service after changing email:
1. Update password → generate new in Bitwarden
2. Enable 2FA
3. Save in Bitwarden under "Oopuo — Business" folder
