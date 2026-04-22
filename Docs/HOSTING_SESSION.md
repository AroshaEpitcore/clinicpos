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
git pull origin master

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

systemctl reload nginx
```

---

## Branch Strategy

```
develop   → daily coding (local machine)
master    → production-ready code only
server    → always pulls from master
```

```bash
# Daily work on develop
git checkout develop
# ... write code ...
git add .
git commit -m "[feature] description"
git push origin develop

# When ready to deploy
git checkout master
git merge develop
git push origin master

# Then on server:
ssh root@178.128.98.34
cd /var/www/clinicpos && git pull origin master
# rebuild + restart (see above)
```

---

## Known Bug Found at End of Session (UNRESOLVED)

**Problem:** When a new clinic is created from the admin panel, the `createTenantSchema()` function only creates the **base tables**. The pharmacy, lab, insurance, portal, and other addon migration scripts do NOT run automatically for the new tenant schema.

**Symptoms:**
- Settings page → Clinic Details → Save → `Server error`
- Online Booking toggle → `Server error`
- Anything that touches addon tables (lab_requests, insurance_claims, etc.) fails

**Root cause:** The per-tenant migrations (migrate_pharmacy, migrate_lab, etc.) are standalone scripts that were designed to be run once against existing tenants. `createTenantSchema.js` (called on new clinic creation) does not include these addon tables.

**Fix needed:** Either:
1. Add all addon table definitions directly into `createTenantSchema.js` so every new clinic gets everything on creation, OR
2. Call all migration scripts automatically after tenant creation in `admin.routes.js`

**Priority:** High — affects every newly created clinic.

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

*HOSTING_SESSION.md — ClinicPOS Production Deployment*  
*Server: DigitalOcean Singapore · Domain: healthcenter.lk · Date: 2026-04-21*
