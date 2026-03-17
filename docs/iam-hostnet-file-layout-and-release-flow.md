# IAM Hostnet File Layout and Release Flow

Date: 2026-03-11
Target: `interactivemove.nl` on Hostnet VPS (CentOS 8 + Plesk)
Mode: **Plesk files + PM2 chatbot**

## 1. Purpose

This document defines the **one clean production file layout** for IAM on the Hostnet VPS and the **safe release flow** to update it.

Goal:

- keep the website deployment simple
- keep the chatbot separate and private
- make rollback easy
- avoid the old mess of multiple folders, multiple runtimes, and unclear live paths

## 2. Core rule: one source of truth

The old confusion came from this pattern:

- repo in one place
- "live" files in another place
- old rescue branch copied somewhere else
- ad-hoc runtime (`python3 -m http.server`) serving a different folder
- Docker config still existing while another stack was actually live

That stops here.

**Production rule:**

- The **Git repo workspace** is the editing/build source of truth
- The **Plesk docroot** is the only public website runtime location
- The **private chatbot app directory** is the only chatbot runtime location
- **No second website server**
- **No serving from random project folders**
- **No direct editing inside docroot except emergency hotfixes**

If a file is live on the public website, it must have come from the repo release flow into the Plesk docroot.

## 3. Recommended VPS layout

Use a layout like this on the Hostnet VPS.

```text
/var/www/vhosts/interactivemove.nl/
├── httpdocs/                         # Plesk public docroot (LIVE WEBSITE)
├── private/
│   └── iam-chatbot/                  # Private Node chatbot app (LIVE CHATBOT)
│       ├── current/                  # Current chatbot release
│       ├── releases/                 # Timestamped chatbot releases
│       ├── shared/
│       │   ├── .env                  # Production chatbot env
│       │   ├── logs/                 # Optional app logs
│       │   └── uploads/              # Only if ever needed
│       └── ecosystem.config.js       # PM2 config (or keep inside current/)
├── releases/
│   └── website/
│       ├── 2026-03-11-2200/          # Timestamped website release copy
│       ├── 2026-03-12-0915/
│       └── previous-known-good/
└── backups/
    └── website-predeploy/            # Optional quick rollback copy
```

## 4. What belongs where

### A) Plesk docroot: `/var/www/vhosts/interactivemove.nl/httpdocs/`

This folder is for **public website files only**.

Put here:

- `index.html`
- all public `.html` pages
- `css/`
- `js/`
- `media/`
- `images/`
- `fonts/`
- `favicon/` files
- `robots.txt`
- `sitemap.xml`
- static blog frontend files if the blog is rendered statically
- public chatbot frontend widget JS if the website needs it in-browser

Do **not** put here:

- `.env`
- Node server files
- PM2 config
- deployment scripts
- git repo data
- build helpers
- admin notes
- old release junk
- backup archives
- shell scripts
- private API keys

Rule:

**If the browser should download it directly, it can live in docroot. If not, it should not be there.**

### B) Private chatbot app dir: `/var/www/vhosts/interactivemove.nl/private/iam-chatbot/`

This is for the **Node chatbot backend only**.

Put here:

- chatbot server code
- `package.json`
- `package-lock.json` or equivalent lockfile
- installed production dependencies
- PM2 ecosystem file
- release folders
- shared `.env`
- app logs if needed

Do **not** put here:

- public website HTML/CSS/media
- random copies of the whole website repo
- old Docker website runtime files for production use

Rule:

**The chatbot is an app runtime, not the website root.**

## 5. Recommended repo-to-server mapping

Keep the source repo clean and map it to production clearly.

Recommended mental model:

- Local/repo workspace: `~/iam-website` or canonical IAM repo path
- Public release target: `/var/www/vhosts/interactivemove.nl/httpdocs/`
- Private chatbot target: `/var/www/vhosts/interactivemove.nl/private/iam-chatbot/current/`

That means:

- website source files are edited in repo
- release copy is synced into `httpdocs`
- chatbot source is built/prepared from repo and deployed into private app dir
- production does **not** run from the repo path directly

This is cleaner than using `/home/adminuser/projects/iam/website` as a mystery live folder.

## 6. Env file locations

### Website env

Because the website is static under Plesk, it should have **as few runtime env needs as possible**.

Preferred rule:

- avoid runtime env files for the static website
- if a value is secret, it belongs on the chatbot backend, not in public JS
- public config values can be compiled into the static files at release time if needed

So for the website itself:

- **no `.env` in docroot**
- no secret keys in browser JS

### Chatbot env

Production chatbot env should live here:

```text
/var/www/vhosts/interactivemove.nl/private/iam-chatbot/shared/.env
```

That file can hold:

- `OPENROUTER_API_KEY`
- model name
- rate-limit settings
- origin allowlist if needed
- any internal API config
- `PORT=3860`
- `HOST=127.0.0.1`

Permissions:

- readable only by the deploy/runtime user
- never copied into `httpdocs`
- never committed to git

## 7. PM2 layout recommendation

Use PM2 for the chatbot only.

Recommended process naming:

- `iam-chatbot`

Recommended runtime target:

- app runs from `/var/www/vhosts/interactivemove.nl/private/iam-chatbot/current/`
- binds to `127.0.0.1:3860`

Recommended PM2 config location:

Either:

- `/var/www/vhosts/interactivemove.nl/private/iam-chatbot/ecosystem.config.js`

Or inside the current release:

- `/var/www/vhosts/interactivemove.nl/private/iam-chatbot/current/ecosystem.config.js`

Preferred simple setup:

- keep one stable PM2 ecosystem file outside the release folder
- point it to `current/`
- keep env file in `shared/.env`

That way each release only changes code, not the process layout.

## 8. Website release flow

This should be the boring standard flow every time.

### Step 1: Work only in the repo

Make changes in the IAM repo workspace only.

Do not:

- edit random live folders first
- patch `httpdocs` manually as a normal workflow
- build from one folder and deploy from another unrelated folder

### Step 2: Prepare the website release

From the repo workspace:

- verify the final public file set
- remove junk files from release output
- confirm links/media paths are correct
- confirm chatbot frontend calls `/api/chat`, not a hardcoded port

Release output should contain only public website assets.

### Step 3: Create a timestamped backup of current live site

Before syncing a new website release:

- copy current `httpdocs` to a timestamped backup, or
- sync current `httpdocs` into `releases/website/<timestamp>-pre/`

Minimum rule:

**Never deploy without a previous known-good copy.**

### Step 4: Store the new release copy on server

Create a release folder like:

```text
/var/www/vhosts/interactivemove.nl/releases/website/2026-03-11-2200/
```

Sync the prepared website files there first.

This gives:

- audit trail
- quick inspection before go-live
- rollback source

### Step 5: Promote release into `httpdocs`

After verifying the release copy, sync that release into:

```text
/var/www/vhosts/interactivemove.nl/httpdocs/
```

Use a sync method that:

- updates changed files
- removes deleted files that should no longer be public
- preserves correct permissions

Important:

- `httpdocs` is the live public root
- there must be only one active live file set there

### Step 6: Smoke test immediately

Check:

- homepage
- top nav pages
- contact page/section
- product pages
- blog page
- legal pages
- mobile menu
- browser console
- key media files
- chatbot widget frontend load

### Step 7: Test public chatbot path

Always test:

- `https://interactivemove.nl/api/chat`

Not just:

- `http://127.0.0.1:3860`

The public path test confirms:

- Plesk reverse proxy works
- same-origin browser path works
- PM2 chatbot is reachable

## 9. Chatbot release flow

Keep chatbot releases independent from the website.

### Step 1: Prepare chatbot code from repo

From the source repo or chatbot source folder:

- update code
- install/update production deps
- verify env expectations
- verify host/port stay localhost-only

### Step 2: Create timestamped chatbot release

Create a folder like:

```text
/var/www/vhosts/interactivemove.nl/private/iam-chatbot/releases/2026-03-11-2230/
```

Copy the chatbot code there.

Do not place secrets inside that release folder.

### Step 3: Keep secrets in shared env

Production secrets stay in:

```text
/var/www/vhosts/interactivemove.nl/private/iam-chatbot/shared/.env
```

Release folders should reference the shared env, not duplicate it.

### Step 4: Point `current/` to the new release

Promote the new chatbot release by updating:

```text
/var/www/vhosts/interactivemove.nl/private/iam-chatbot/current/
```

This can be done by:

- replacing the folder contents, or
- using a symlink if the operator is comfortable with that

For maximum junior-operator simplicity:

- a normal `current/` folder with replaced contents is acceptable
- symlink-based releases are cleaner, but only if the team can manage them reliably

### Step 5: Reload PM2

Reload/restart the PM2 app:

- `iam-chatbot`

Then test:

- local app health if available
- public `https://interactivemove.nl/api/chat`

## 10. Rollback flow

### Website rollback

If a website deploy breaks:

- restore the previous known-good release into `httpdocs`
- retest homepage + contact + product pages

Because the site is static, rollback should be fast and file-based.

### Chatbot rollback

If the chatbot deploy breaks:

- restore previous release into `current/`
- reload PM2
- retest `/api/chat`

If needed, keep the website live while chat is temporarily degraded.

## 11. Rules that prevent future confusion

These are the non-negotiables.

### Rule 1: one public website root only

Live public website = only:

```text
/var/www/vhosts/interactivemove.nl/httpdocs/
```

Nothing else is allowed to act as the real website root.

### Rule 2: one chatbot runtime only

Live chatbot runtime = only:

```text
/var/www/vhosts/interactivemove.nl/private/iam-chatbot/current/
```

### Rule 3: one public web stack only

Public traffic must go through:

- Plesk-managed nginx/apache on 80/443

Not through:

- `python3 -m http.server`
- a separate website Docker stack
- a second hidden nginx serving another folder

### Rule 4: no secrets in public files

Never place:

- `.env`
- API keys
- backend credentials
- PM2 configs with secrets

inside `httpdocs`.

### Rule 5: releases are copied from repo, not invented on-server

Edits happen in repo.
Production gets updated by release promotion.

That means:

- no mystery manual edits in five places
- no branch confusion copied directly into live folders
- no "which folder is actually live?" guessing

### Rule 6: name folders by role, not by history

Good names:

- `httpdocs`
- `private/iam-chatbot`
- `releases/website`
- `shared/.env`

Bad names:

- `website-old`
- `website-live-new-final`
- `iam-test2`
- `backup-final-real`

### Rule 7: website and chatbot deploy independently

The website is static.
The chatbot is a PM2 app.

Do not force them into one deployment mechanism when they have different runtime needs.

## 12. Simplest operating model

If the operator needs the shortest possible mental model, use this:

- **Repo** = where changes are made
- **`httpdocs`** = live public website
- **`private/iam-chatbot/current`** = live chatbot backend
- **`shared/.env`** = chatbot secrets
- **`releases/website/*`** = website rollback points
- **`private/iam-chatbot/releases/*`** = chatbot rollback points
- **Plesk on 80/443** = only public entry
- **PM2 on localhost:3860** = chatbot only

## 13. Final recommendation

For IAM on Hostnet, the clean release structure should be:

- Plesk serves the website from `httpdocs`
- chatbot lives in `private/iam-chatbot`
- chatbot env lives in `private/iam-chatbot/shared/.env`
- website releases are copied into `releases/website/<timestamp>/`
- chatbot releases are copied into `private/iam-chatbot/releases/<timestamp>/`
- only promoted releases reach live runtime folders
- no Docker website runtime
- no ad-hoc extra web server
- no multi-folder live ambiguity

This is the simplest setup that a junior operator can understand, maintain, and roll back safely.
