# HOSTING_SESSION.md — Production Deployment Record

> **Date:** 2026-04-21  
> **Session:** Full A–Z deployment of ClinicPOS to production  
> **Result:** ✅ Live at healthcenter.lk

---

## Infrastructure Summary

| Item | Details |
|------|---------|
| Domain | healthcenter.lk (purchased from register.lk/domains.lk — Rs 3,700/year) |
| DNS Provider | Cloudflare (free plan) |
| Nameservers | marissa.ns.cloudflare.com · porter.ns.cloudflare.com |
| Server | DigitalOcean Singapore — Basic $18/mo (2 vCPU, 2GB RAM, 60GB SSD) |
| Server IP | 178.128.98.34 |
| OS | Ubuntu 24.04.4 LTS |
| Node.js | v20.20.2 |
| PostgreSQL | 16 |
| Nginx | 1.24.0 |
| PM2 | Installed globally |
| SSL | Let's Encrypt wildcard — `*.healthcenter.lk` (expires 2026-07-20) |
| Backups | DigitalOcean weekly snapshots + daily pg_dump cron at 2am |

---

## Live URLs

| URL | Purpose |
|-----|---------|
| https://healthcenter.lk | Landing / marketing page (public) |
| https://admin.healthcenter.lk | Super admin panel |
| https://demo.healthcenter.lk | Demo clinic |
| https://clinicname.healthcenter.lk | Any new clinic (auto-created) |

---

## Login Credentials

### Super Admin Panel
```
URL:      https://admin.healthcenter.lk
Email:    mgaravishan@gmail.com
Password: AdminArosha
```

### Demo Clinic (https://demo.healthcenter.lk)
```
doctor        → doctor@demo.com        / password123
receptionist  → receptionist@demo.com  / password123
nurse         → nurse@demo.com         / password123
admin         → admin@demo.com         / password123
```

---

## Server Details

```
SSH:            ssh root@178.128.98.34
Root password:  (DigitalOcean password set during Droplet creation)
DB user:        clinicpos
DB password:    #20001210#Ar
DB name:        clinicpos_db
Project path:   /var/www/clinicpos
Uploads path:   /var/www/clinicpos/backend-api/uploads/
Backups path:   /home/deploy/backups/
```

---

## Environment Files

### backend-api/.env
```env
DATABASE_URL=postgresql://clinicpos:%2320001210%23Ar@localhost:5432/clinicpos_db
JWT_SECRET=01be0adeb25793e3bbc284de7232383dc96a10c7b65d89a0bccf1993ba7b1edb5e96307cfc80d98016e4f173227279fec9e8efbe9c9ab93f194941d2e64ec68e
JWT_EXPIRES_IN=8h
ADMIN_JWT_SECRET=df87c843c898324f6bedb293fd76ca5911076f6537f262b02437c38745712948acd9ca085ddf680d49e5ca68814792b8ed06105c4df94d7775cf29f605369357
ADMIN_EMAIL=mgaravishan@gmail.com
ADMIN_PASSWORD=AdminArosha
PORT=4000
NODE_ENV=production
UPLOADS_DIR=./uploads
MAX_FILE_SIZE_MB=2
DEMO_SUBDOMAIN=demo
```

> **Note:** The # symbol in the DB password is URL-encoded as %23 in DATABASE_URL.  
> ADMIN_PASSWORD must NOT use # — it breaks .env parsing (# = comment character).

### clinic-frontend/.env
```env
VITE_API_URL=
VITE_APP_DOMAIN=healthcenter.lk
VITE_TENANT_SUBDOMAIN=
```
> VITE_API_URL is intentionally empty — API URL is set dynamically in code (see Code Fix below).

### admin-frontend/.env
```env
VITE_API_URL=https://admin.healthcenter.lk/api/v1
VITE_CLINIC_URL=https://demo.healthcenter.lk
```

---

## Nginx Configuration

### /etc/nginx/sites-available/clinicpos-clinic
```nginx
server {
    listen 80;
    server_name *.healthcenter.lk healthcenter.lk;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name *.healthcenter.lk;
    ssl_certificate     /etc/letsencrypt/live/healthcenter.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/healthcenter.lk/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    root /var/www/clinicpos/clinic-frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        alias /var/www/clinicpos/backend-api/uploads/;
        expires 30d;
    }
}
```

### /etc/nginx/sites-available/healthcenter.lk (root domain → landing page, added 2026-04-22)
```nginx
server {
    listen 443 ssl;
    server_name healthcenter.lk;
    ssl_certificate     /etc/letsencrypt/live/healthcenter.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/healthcenter.lk/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    root /var/www/clinicpos/landing-frontend;
    index index.html;
    location /api/ {
        proxy_pass         http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
> HTTP → HTTPS redirect for the root domain is handled by the existing `clinicpos-clinic` block which includes `healthcenter.lk` in its port-80 `server_name`. Nginx warns about "conflicting server_name on 0.0.0.0:80" — this is harmless.

### /etc/nginx/sites-available/clinicpos-admin
```nginx
server {
    listen 80;
    server_name admin.healthcenter.lk;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name admin.healthcenter.lk;
    ssl_certificate     /etc/letsencrypt/live/healthcenter.lk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/healthcenter.lk/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    root /var/www/clinicpos/admin-frontend/dist;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## PM2 Process

```bash
# How the API is started (with dotenv loaded)
pm2 start src/index.js --name clinicpos-api --node-args="-r dotenv/config"
pm2 save

# Restart after code change
pm2 restart clinicpos-api --update-env
```

> **Important:** Must use `--node-args="-r dotenv/config"` when starting. Without it, `.env` is not loaded and admin login returns "Super admin credentials not configured".  
> Must use `--update-env` when restarting after `.env` changes.

---

## Cloudflare DNS Records

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| A | @ (healthcenter.lk) | 178.128.98.34 | DNS only (gray) |
| A | admin | 178.128.98.34 | DNS only (gray) |
| A | * | 178.128.98.34 | DNS only (gray) |

> **Important:** All A records must be **DNS only** (gray cloud), NOT proxied (orange cloud).  
> Proxied mode breaks Let's Encrypt SSL certificate verification.

---

## SSL Certificate

```bash
# Certificate location
/etc/letsencrypt/live/healthcenter.lk/fullchain.pem
/etc/letsencrypt/live/healthcenter.lk/privkey.pem

# Expires: 2026-07-20
# Renewal: manual (--manual flag used — no auto-renewal hook set up)
# To renew before expiry, re-run:
certbot certonly \
  --manual \
  --preferred-challenges=dns \
  -d healthcenter.lk \
  -d *.healthcenter.lk
# Then add the TXT records to Cloudflare DNS as prompted
```

---

## Backup Cron

```bash
# Runs at 2am every night
# crontab -e → added:
0 2 * * * pg_dump -U clinicpos -d clinicpos_db > /home/deploy/backups/clinicpos_$(date +\%Y\%m\%d).sql
```

---

## Database Setup

```sql
-- User and database created:
CREATE DATABASE clinicpos_db;
CREATE USER clinicpos WITH ENCRYPTED PASSWORD '#20001210#Ar';
GRANT ALL PRIVILEGES ON DATABASE clinicpos_db TO clinicpos;
\c clinicpos_db
GRANT ALL ON SCHEMA public TO clinicpos;
ALTER SCHEMA public OWNER TO clinicpos;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO clinicpos;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO clinicpos;
```

### Migrations Run (in order)
```bash
cd /var/www/clinicpos/backend-api

node src/db/migrate.js
node src/db/seed.js                                          # creates demo tenant + staff
node src/db/migrate_pharmacy.js
node src/db/migrate_lab.js
node src/db/migrate_insurance.js
node src/db/migrate_portal.js
node src/db/migrate_optional_patient_fields.js
node src/db/migrate_prescription_consultation_nullable.js
node src/db/migrate_custom_medicine.js
node src/db/migrate_queue_display.js
node -r dotenv/config src/db/migrate_subscription_plans.js
node -r dotenv/config src/db/migrate_update_plans.js
node -r dotenv/config src/db/migrate_plan_billing_cycle.js

# Platform settings table (landing page toggle) — added 2026-04-22
node -r dotenv/config src/db/migrate_platform_settings.js

# Patch new-clinic schema gaps — added 2026-04-22
node -r dotenv/config src/db/migrate_fix_new_clinics.js

# Platform info keys (company, contact, payment details) — added 2026-04-22
# Run from inside backend-api directory (dotenv must resolve)
cd /var/www/clinicpos/backend-api
node -r dotenv/config src/db/migrate_platform_info.js
```

> **Note:** `migrate_subscription_plans.js` must be run with `-r dotenv/config` or it runs silently without error and creates nothing.

---

## Critical Code Fix Applied During Deployment

**File:** `clinic-frontend/src/api/index.js`

**Problem:** `VITE_API_URL` was hardcoded to `https://demo.healthcenter.lk/api/v1`, so all API calls from any clinic (e.g. `familycare.healthcenter.lk`) went to demo instead of themselves. Login POST never fired.

**Fix:**
```javascript
// BEFORE (broken in production):
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',

// AFTER (correct for multi-tenant production):
baseURL: `${window.location.protocol}//${window.location.host}/api/v1`,
```

This makes every clinic's frontend call its own subdomain's `/api/v1` — which Nginx proxies to the backend, which then reads the subdomain from the `Host` header to identify the tenant.

---

## How to Deploy Code Updates

```bash
ssh root@178.128.98.34
cd /var/www/clinicpos
git config --global --add safe.directory /var/www/clinicpos   # if git complains about ownership
git pull origin development

# If backend changed:
cd /var/www/clinicpos/backend-api
npm install --production
pm2 restart clinicpos-api --update-env

# If clinic-frontend changed:
cd /var/www/clinicpos/clinic-frontend
npm run build

# If admin-frontend changed:
cd /var/www/clinicpos/admin-frontend
npm run build

# landing-frontend — no build needed (plain HTML, served directly by nginx)

systemctl reload nginx
```

---

## Branch Strategy

```
development → daily coding (local machine + server pulls from here)
main        → backup / archive
```

```bash
# Daily work on development branch
git checkout development
# ... write code ...
git add .
git commit -m "description"
git push origin development

# Then on server:
ssh root@178.128.98.34
cd /var/www/clinicpos && git pull origin development
# rebuild + restart (see above)
```

---

## Post-Deployment Bugs Fixed (2026-04-22)

### Bug 1 — New clinic Settings page "Server error" ✅ FIXED

**Root cause:** `createTenantSchema.js` only created base tables. All addon tables (pharmacy, lab, insurance) added via standalone migrations were never backported. New clinics were missing `queue_display_enabled` column + ~10 tables.

**Fix:** Backported all missing columns and tables into `createTenantSchema.js`. Created `migrate_fix_new_clinics.js` to patch existing schemas. Run on server:
```bash
node -r dotenv/config src/db/migrate_fix_new_clinics.js
# Output: ✓ Fixed tenant_demo, ✓ Fixed tenant_familycare
```

---

### Bug 2 — Basic plan auto-suspends immediately ✅ FIXED

**Root cause:** `pg` returns DATE columns as JS `Date` objects. `String(new Date()).split('T')[0]` = `''` (no 'T' in locale date string) → always less than any date → every clinic suspended.

**Fix:** Changed to `new Date(val).toISOString().split('T')[0]` in `tenant.js` and `admin.routes.js` renew route.

---

### Bug 3 — Logo not visible in production ✅ FIXED

**Root cause:** `mediaUrl.js` used `VITE_API_URL || 'http://localhost:4000'` — in production `VITE_API_URL` is empty, so all image URLs pointed to localhost.

**Fix:** `mediaUrl.js` now uses `window.location.origin + path`.

---

### Bug 4 — healthcenter.lk redirected to admin panel ✅ FIXED

**Root cause:** Nginx wildcard `*.healthcenter.lk` only covers subdomains — the apex domain fell through to the admin block (first `server {}` in config).

**Fix:** Added `/etc/nginx/sites-available/healthcenter.lk` dedicated block (see Nginx section below).

---

### Bug 5 — Platform Settings save only sent current tab's keys ✅ FIXED

**Root cause:** The Save button called `save(active.keys)` — only the active tab's field keys were included in the batch payload. Entering phone/address/bank on other tabs and clicking Save while on the Company tab silently discarded all data. Toast showed "Settings saved" regardless.

**Fix:** Changed to `save()` — sends entire `settings` state for all tabs at once via `PUT /api/v1/admin/platform/batch`.

---

### Bug 6 — Platform Settings empty fields overwrote existing DB values ✅ FIXED

**Root cause:** Save function built subset with `settings[k] ?? ''` — empty fields saved as empty strings, overwriting previously stored values.

**Fix:** Initially added skip-empty logic, then superseded by Bug 5 fix (save-all approach makes the user fill everything at once, so empty fields represent intentional clears).

---

## Firewall Rules

```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

---

## Useful Server Commands

```bash
# Check API health
curl http://localhost:4000/health

# View API logs
pm2 logs clinicpos-api --lines 50

# Check PM2 status
pm2 status

# Check Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

# Check disk space
df -h

# Check memory
free -h

# List all tenant schemas
sudo -i -u postgres psql -d clinicpos_db -c "\dn"

# List all tenants
sudo -i -u postgres psql -d clinicpos_db -c "SELECT id, subdomain, status FROM public.tenants;"

# Delete a test clinic (replace subdomain)
sudo -i -u postgres psql -d clinicpos_db
DELETE FROM public.tenants WHERE subdomain = 'testclinic';
DROP SCHEMA IF EXISTS tenant_testclinic CASCADE;
\q
```

---

# Update Session — 2026-05-20

> Adds: dual-queue (NEW/RETURNING patient tokens), patient-portal i18n (English/Sinhala toggle), backend Jest+Supertest tests for the dual-queue logic.

## What's in this release

1. **Dual-queue (NEW vs RETURNING patients)** — per-clinic feature flag, two independent token series (red `N-XX` for new, blue `XX` for returning), POS + online booking + queue display all aware.
2. **Patient portal i18n** — English / Sinhala toggle on `/booking` and `/patient/*`. Choice persists per-browser in `localStorage`.
3. **Backend integration tests** — Jest + Supertest covering the dual-queue logic. `npm test` from `backend-api/`.

No new prod runtime dependencies. Only devDeps (`jest`, `supertest`) for tests.

## Deploy commands — run on server (in order)

> Frontends are static, served by nginx directly from `dist/` — only the backend runs under pm2. The build step alone is enough; no pm2 restart for clinic/admin frontends.

```bash
cd /var/www/clinicpos
git pull origin development

# ── 1. Backend ─────────────────────────────────────────────────────────────
cd backend-api
npm install --no-audit --no-fund

# One-time migrations — both are idempotent (safe to re-run)
node src/db/migrate_dual_queue.js                # appointments.patient_visit_type + feature_flags row
node src/db/migrate_dual_queue_clinic_toggle.js  # clinic_settings.dual_queue_enabled (clinic-admin toggle)

# (Optional) Verify nothing regressed — 16 tests
npm test

pm2 restart clinicpos-api
pm2 logs clinicpos-api --lines 30   # confirm clean boot

# ── 2. Clinic frontend (static, served by nginx) ──────────────────────────
cd ../clinic-frontend
npm install --no-audit --no-fund
npm run build                       # dist/ is updated, nginx picks it up

# ── 3. Admin frontend (static, served by nginx) ───────────────────────────
cd ../admin-frontend
npm install --no-audit --no-fund
npm run build

# Optional: reload nginx if you've enabled aggressive caching
sudo systemctl reload nginx
```

## Post-deploy smoke test

### Dual-queue (two-level gate)

The feature now has TWO toggles that must both be ON for dual-queue to take effect:
- **Super-admin** capability gate (`public.feature_flags.dual_queue`)
- **Clinic-admin** opt-in (`clinic_settings.dual_queue_enabled`)

1. Super-admin → open any clinic → **Feature Flags** card. Toggle the new "Dual Queue" row ON to give the clinic access. (Description: "Allow clinic to enable separate token series…")
2. "Login as Clinic" to impersonate. Open **Settings → Security & Patient Access tab** (or wherever the existing toggles like Patient Portal/Queue Display live). A new **"Dual Queue (New / Returning Patients)"** section appears — this only shows when the super-admin flag is on. Toggle it on and save.
3. **Appointments → + Add to Queue**:
   - Pick an existing patient with prior consultations → segmented control defaults to **Returning (blue)**.
   - Submit → slip shows blue token, e.g. `03`.
4. Register a brand-new patient inline → submit → slip shows **red** token, e.g. `N-01`.
5. **Override test**: pick a returning patient, click **New (Red)** manually → submit. Verify audit log:
   ```sql
   SET search_path TO tenant_<subdomain>;
   SELECT created_at, action, old_value, new_value FROM audit_logs
   WHERE action = 'visit_type_override'
   ORDER BY created_at DESC LIMIT 5;
   ```
6. **Queue display** (`/display`) — "Next Up" splits into "New Patients" / "Returning" columns.
7. **Gate verification**: turn the clinic-admin toggle OFF (but keep super-admin ON) → POS reverts to single-series tokens, no override audit log, online booking returns plain numbers. Turn super-admin OFF → the clinic-admin toggle row disappears from settings entirely.

### Online booking dual-queue

1. `<subdomain>.healthcenter.lk/book` — step 3 phone field shows dual-queue hint.
2. Book with an existing patient's phone → blue token in confirmation.
3. Book with a fresh phone → red `N-XX` token in confirmation.
4. Toggle flag OFF → everything reverts to single-series; no breakage.

### Sinhala toggle

1. On `/book` — language pill in header next to dark-mode toggle. Click → full page flips to Sinhala. Click again → back to English.
2. Reload page → choice persists (`patient_lang` in localStorage).
3. Login as a patient at `/patient/login` — same toggle on every page (dashboard, appointments, prescriptions, labs, invoices, profile).
4. Some deeply-nested form labels remain English (fallback); this is expected and non-breaking.

### Test suite

```bash
cd /var/www/clinicpos/backend-api
npm test
```
Expected: `Tests: 16 passed, 16 total` (12 original + 4 covering the two-level gate).

## Rollback

If the dual-queue migration causes issues, run per tenant:

```sql
ALTER TABLE tenant_<subdomain>.appointments
  DROP CONSTRAINT IF EXISTS appointments_patient_visit_type_check;
ALTER TABLE tenant_<subdomain>.appointments
  DROP COLUMN IF EXISTS patient_visit_type;
DROP INDEX IF EXISTS tenant_<subdomain>.idx_appointments_doc_date_type;

-- And remove the new feature flag
DELETE FROM public.feature_flags WHERE module = 'dual_queue';
```

The legacy single-series code path is preserved, so simply leaving the flag OFF disables the new behavior without code changes.

## File-level summary of this release

**Backend** — `backend-api/`
- `src/db/migrate_dual_queue.js` (new)
- `src/db/createTenantSchema.js` — `patient_visit_type` + index for new clinics
- `src/routes/admin.routes.js` — `dual_queue` in default flags
- `src/routes/appointment.routes.js` — type-scoped tokens, auto-detect, override audit, `/detect-visit-type/:patientId`
- `src/routes/portal.routes.js` — phone-match drives visit type, `dual_queue_enabled` exposed on `/info`, `/booking/:ref`, `/queue-display`
- `__tests__/dual_queue/*.test.js` + `__tests__/helpers/testApp.js` (new)
- `package.json` — `test` script + jest/supertest devDeps + jest config block

**Admin frontend** — `admin-frontend/`
- `src/pages/ClinicDetailPage.jsx` — "Dual Queue" row added to feature-flags list

**Clinic frontend** — `clinic-frontend/`
- `src/i18n/translations.js` (new) — EN + SI dictionaries
- `src/i18n/LangContext.jsx` (new) — provider + `useLang()` + `t()` helper
- `src/components/ui/LangToggle.jsx` (new)
- `src/main.jsx` — `LangProvider` wrap
- `src/pages/appointments/AppointmentsPage.jsx` — colored token column for dual-queue rows
- `src/pages/appointments/components/AppointmentModal.jsx` — visit-type toggle, auto-detect via API, colored confirmation slip
- `src/pages/display/DisplayPage.jsx` — two-column "Next Up" + colored tokens
- `src/pages/booking/BookingPage.jsx` — i18n, dual-queue hint, colored confirmation card + downloadable image
- `src/pages/patient-portal/*` (Layout, Login, Register, Dashboard, Appointments, Consultations, Prescriptions, Labs, Invoices, Profile) — i18n wiring
- `src/utils/printTokenSlip.js` — supports `visitType` for `N-` prefix and red color on thermal slip
- `src/api/appointments.js` — `detectVisitType(patientId)` added

---

*HOSTING_SESSION.md — ClinicPOS Production Deployment*  
*Server: DigitalOcean Singapore · Domain: healthcenter.lk · Initial deploy: 2026-04-21 · Last update: 2026-05-20*
