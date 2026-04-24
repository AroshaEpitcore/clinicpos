# HOSTING.md — Production Deployment Guide

> Complete step-by-step guide to host all three projects on a live server.
> Follow every step in order. Do not skip. Each step depends on the previous one.

---

## Overview

| What | Where |
|------|-------|
| Landing page | `https://yourdomain.com` (root domain) |
| Clinic staff app | `https://clinicname.yourdomain.com` (wildcard) |
| Admin panel | `https://admin.yourdomain.com` |
| Backend API | Internal — `http://localhost:4000` (never exposed directly) |
| Database | PostgreSQL — local on the server, not public |

> **Production domain:** healthcenter.lk (see HOSTING_SESSION.md for full deployment record)

---

## What You Need Before Starting

| Requirement | Notes |
|-------------|-------|
| A domain name | e.g. `clinicpos.com` — buy from Namecheap, GoDaddy, etc. |
| A VPS server | DigitalOcean, Hetzner, Vultr, or Linode — minimum 2GB RAM |
| SSH access to the server | You'll get this when you create the VPS |
| Your code on GitHub | Push all three projects to GitHub first |

---

## Step 1 — Create Your VPS Server

### Option A — DigitalOcean (recommended)

1. Go to `https://digitalocean.com` and create an account
2. Click **Create → Droplet**
3. Choose:
   - **Image:** Ubuntu 22.04 LTS
   - **Plan:** Basic — $12/mo (2GB RAM, 1 CPU, 50GB SSD) — minimum for this app
   - **Region:** Choose closest to your users (e.g. Singapore for Sri Lanka)
   - **Authentication:** SSH Key (preferred) or Password
4. Click **Create Droplet**
5. Note down your server's **IP address** — you will use this everywhere

### Option B — Hetzner (cheaper)

1. Go to `https://hetzner.com/cloud` — create account
2. Create server: Ubuntu 22.04, CX21 (2GB RAM, €4/mo)
3. Note down the IP address

### After creating the server

```bash
# Connect via SSH from your local machine
ssh root@YOUR_SERVER_IP
```

If you used a password, type it when prompted. If SSH key, it connects directly.

---

## Step 2 — Point Your Domain to the Server

You need two DNS records — one for the admin panel and one wildcard for all clinic subdomains.

Go to your domain registrar (where you bought the domain) → DNS Settings → Add these records:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `YOUR_SERVER_IP` | 3600 |
| A | `admin` | `YOUR_SERVER_IP` | 3600 |
| A | `*` | `YOUR_SERVER_IP` | 3600 |

> The `*` (wildcard) record makes `anything.clinicpos.com` point to your server.
> DNS changes take 5–30 minutes to propagate. You can check with `nslookup demo.clinicpos.com`.
>
> **If using Cloudflare DNS:** Set all A records to **DNS only** (gray cloud icon). Do NOT enable Cloudflare proxy (orange cloud) — it will break the wildcard SSL certificate validation.

---

## Step 3 — Secure the Server

Run these on your server as root:

```bash
# Update all packages
apt update && apt upgrade -y

# Create a non-root user (replace "deploy" with any name you like)
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the new user (if you used SSH key login)
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Set up basic firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Verify firewall
ufw status
```

> From now on, SSH as `deploy` user: `ssh deploy@YOUR_SERVER_IP`

---

## Step 4 — Install Node.js

```bash
# Install Node.js 20 (LTS) via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version    # should show v20.x.x
npm --version     # should show 10.x.x
```

---

## Step 5 — Install PostgreSQL

```bash
# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Start and enable on boot
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify it's running
sudo systemctl status postgresql
```

### Create the database and user

```bash
# Switch to postgres user
sudo -i -u postgres

# Open PostgreSQL shell
psql

# Run these inside psql:
CREATE DATABASE clinicpos_db;
CREATE USER clinicpos WITH ENCRYPTED PASSWORD 'choose_a_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE clinicpos_db TO clinicpos;
\c clinicpos_db
GRANT ALL ON SCHEMA public TO clinicpos;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO clinicpos;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO clinicpos;
\q

# Exit back to deploy user
exit
```

> Write down the password you chose — you will need it for the `.env` file.

---

## Step 6 — Install Nginx

```bash
sudo apt install -y nginx

# Start and enable on boot
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify
sudo systemctl status nginx
```

Open `http://YOUR_SERVER_IP` in a browser — you should see the default Nginx welcome page.

---

## Step 7 — Install PM2 (keeps Node.js running)

```bash
sudo npm install -g pm2

# Set PM2 to start automatically on server reboot
pm2 startup
# Copy and run the command it prints — it looks like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy
```

---

## Step 8 — Install Certbot (for HTTPS / SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## Step 9 — Deploy the Code

### 9.1 — Clone the repository

```bash
# Go to the web directory
cd /var/www

# Clone your project (replace with your actual GitHub repo URL)
sudo git clone https://github.com/YOUR_USERNAME/clinicpos.git

# Give your deploy user ownership
sudo chown -R deploy:deploy /var/www/clinicpos

cd /var/www/clinicpos
```

### 9.2 — Install dependencies for all four projects

```bash
cd /var/www/clinicpos/backend-api && npm install --production
cd /var/www/clinicpos/clinic-frontend && npm install
cd /var/www/clinicpos/admin-frontend && npm install
cd /var/www/clinicpos/landing-frontend && npm install
```

---

## Step 10 — Create Environment Files

### backend-api/.env

```bash
nano /var/www/clinicpos/backend-api/.env
```

Paste and fill in:

```env
DATABASE_URL=postgresql://clinicpos:YOUR_DB_PASSWORD@localhost:5432/clinicpos_db
JWT_SECRET=paste_a_long_random_string_here_at_least_64_chars
JWT_EXPIRES_IN=8h
ADMIN_JWT_SECRET=paste_a_different_long_random_string_here
ADMIN_EMAIL=your_admin_email@example.com
ADMIN_PASSWORD=your_secure_admin_password
PORT=4000
NODE_ENV=production
UPLOADS_DIR=./uploads
MAX_FILE_SIZE_MB=2
DEMO_SUBDOMAIN=demo
```

> To generate a secure random secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
> Run that twice — once for JWT_SECRET, once for ADMIN_JWT_SECRET.

### clinic-frontend/.env

```bash
nano /var/www/clinicpos/clinic-frontend/.env
```

```env
VITE_API_URL=https://demo.clinicpos.com/api/v1
VITE_APP_DOMAIN=clinicpos.com
VITE_TENANT_SUBDOMAIN=
```

> Leave `VITE_TENANT_SUBDOMAIN` empty in production — subdomain is read from the URL automatically.

### admin-frontend/.env

```bash
nano /var/www/clinicpos/admin-frontend/.env
```

```env
VITE_API_URL=https://admin.clinicpos.com/api/v1
VITE_CLINIC_URL=https://demo.clinicpos.com
```

---

## Step 11 — Create the Uploads Folder

```bash
mkdir -p /var/www/clinicpos/backend-api/uploads
chmod 755 /var/www/clinicpos/backend-api/uploads
```

---

## Step 12 — Run Database Migrations

Run all migrations in order — each is safe to re-run.

```bash
cd /var/www/clinicpos/backend-api

# Core tables + seed demo clinic + 4 staff accounts
node src/db/migrate.js

# Pharmacy module
node src/db/migrate_pharmacy.js

# Lab module
node src/db/migrate_lab.js

# Insurance module
node src/db/migrate_insurance.js

# Patient portal columns
node src/db/migrate_portal.js

# Make patient last_name / dob / gender optional
node src/db/migrate_optional_patient_fields.js

# Make prescriptions.consultation_id nullable
node src/db/migrate_prescription_consultation_nullable.js

# Allow custom medicine names
node src/db/migrate_custom_medicine.js

# Queue display setting
node src/db/migrate_queue_display.js

# Subscription plans table + tenant subscription columns
node src/db/migrate_subscription_plans.js

# Update plan prices to LKR
node -r dotenv/config src/db/migrate_update_plans.js

# Add billing_cycle column
node -r dotenv/config src/db/migrate_plan_billing_cycle.js

# Platform settings table (landing page toggle)
node -r dotenv/config src/db/migrate_platform_settings.js

# Platform info (company/contact/payment fields — seeds 17 default keys)
node -r dotenv/config src/db/migrate_platform_info.js

# Nurse vitals (adds patient_vitals table to all tenant schemas)
node -r dotenv/config src/db/migrate_vitals.js

# Patch any clinic schemas created before addon modules existed (run after the above)
node -r dotenv/config src/db/migrate_fix_new_clinics.js
```

If any migration fails, check the error message — usually it's a wrong DATABASE_URL in `.env`.

---

## Step 13 — Build the Frontend Apps

```bash
# Build clinic frontend
cd /var/www/clinicpos/clinic-frontend
npm run build
# Output: /var/www/clinicpos/clinic-frontend/dist/

# Build admin frontend
cd /var/www/clinicpos/admin-frontend
npm run build
# Output: /var/www/clinicpos/admin-frontend/dist/

# Build landing frontend (Vite/React project — must build before nginx serves it)
cd /var/www/clinicpos/landing-frontend
npm run build
# Output: /var/www/clinicpos/landing-frontend/dist/
```

---

## Step 14 — Start the Backend with PM2

```bash
cd /var/www/clinicpos/backend-api

pm2 start src/index.js --name clinicpos-api --node-args="-r dotenv/config"

# Save PM2 process list so it restarts after server reboot
pm2 save

# Verify it's running
pm2 status
pm2 logs clinicpos-api --lines 20
```

You should see `status: online` in the PM2 status table.

Test the API is reachable locally:

```bash
curl http://localhost:4000/health
# Should return: {"status":"ok"}
```

---

## Step 15 — Configure Nginx

### 15.1 — Create the clinic frontend config (wildcard)

```bash
sudo nano /etc/nginx/sites-available/clinicpos-clinic
```

Paste:

```nginx
server {
    listen 80;
    server_name *.clinicpos.com;

    root /var/www/clinicpos/clinic-frontend/dist;
    index index.html;

    # Serve React app — all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls to the backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Serve uploaded files
    location /uploads/ {
        alias /var/www/clinicpos/backend-api/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 15.2 — Create the admin frontend config

```bash
sudo nano /etc/nginx/sites-available/clinicpos-admin
```

Paste:

```nginx
server {
    listen 80;
    server_name admin.clinicpos.com;

    root /var/www/clinicpos/admin-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 15.3 — Create the landing page config (root domain)

```bash
sudo nano /etc/nginx/sites-available/clinicpos-landing
```

Paste:

```nginx
# Redirect HTTP to HTTPS (root domain)
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    root /var/www/clinicpos/landing-frontend/dist;
    index index.html;

    # Proxy /api calls to backend (for dynamic pricing fetch)
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

> Note: If the existing wildcard HTTP block already includes `yourdomain.com` in its `server_name`, nginx will warn about a conflicting port-80 server name — this is harmless (the redirect still works via the wildcard block).

### 15.4 — Enable all configs

```bash
# Create symlinks to enable them
sudo ln -s /etc/nginx/sites-available/clinicpos-clinic   /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/clinicpos-admin    /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/clinicpos-landing  /etc/nginx/sites-enabled/

# Remove the default Nginx page (it conflicts)
sudo rm /etc/nginx/sites-enabled/default

# Test for config errors
sudo nginx -t
# Should say: syntax is ok / test is successful

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 16 — Get SSL Certificates (HTTPS)

You need a wildcard certificate for `*.clinicpos.com` and one for `admin.clinicpos.com`.

### 16.1 — Get the wildcard certificate

Wildcard certs require DNS validation. You'll add a TXT record to your domain.

```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges=dns \
  -d clinicpos.com \
  -d *.clinicpos.com
```

Certbot will pause and ask you to add a DNS TXT record like:

```
_acme-challenge.clinicpos.com  →  "some_long_random_string"
```

Go to your domain registrar → DNS settings → add that TXT record → wait 1–2 minutes → press Enter in the terminal.

The certificate files will be saved to:
```
/etc/letsencrypt/live/clinicpos.com/fullchain.pem
/etc/letsencrypt/live/clinicpos.com/privkey.pem
```

### 16.2 — Update the Nginx configs to use HTTPS

```bash
sudo nano /etc/nginx/sites-available/clinicpos-clinic
```

Replace the entire file with:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name *.clinicpos.com clinicpos.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name *.clinicpos.com;

    ssl_certificate     /etc/letsencrypt/live/clinicpos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinicpos.com/privkey.pem;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        alias /var/www/clinicpos/backend-api/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo nano /etc/nginx/sites-available/clinicpos-admin
```

Replace with:

```nginx
server {
    listen 80;
    server_name admin.clinicpos.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name admin.clinicpos.com;

    ssl_certificate     /etc/letsencrypt/live/clinicpos.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clinicpos.com/privkey.pem;
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
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 16.3 — Auto-renew certificates

Let's Encrypt certs expire every 90 days. Set up auto-renewal:

```bash
# Test renewal works
sudo certbot renew --dry-run

# It's already set up in a cron job — verify:
sudo systemctl status certbot.timer
```

---

## Step 17 — Verify Everything Works

Go through this checklist in order:

```
[ ] https://demo.clinicpos.com           → loads clinic login page
[ ] https://admin.clinicpos.com          → loads admin login page
[ ] https://demo.clinicpos.com/health    → should show backend 404 (not a real route — that's fine)
[ ] https://demo.clinicpos.com/api/v1/health → {"status":"ok"}
[ ] Login to admin panel with ADMIN_EMAIL + ADMIN_PASSWORD from .env
[ ] Create a new clinic from admin panel
[ ] Copy the subdomain from the credentials screen (e.g. "sunshine")
[ ] Open https://sunshine.clinicpos.com  → loads clinic login page
[ ] Login with the clinic credentials you just created
[ ] Open https://demo.clinicpos.com      → login with demo/demo credentials (set by seed.js)
```

---

## Step 18 — Update the Frontend .env Files for Production URLs

After confirming everything works, update the frontend env files so all internal links use `https`:

```bash
# clinic-frontend — this doesn't matter much since subdomain is read from URL in production
# admin-frontend — update VITE_CLINIC_URL to production URL
nano /var/www/clinicpos/admin-frontend/.env
```

Change:
```env
VITE_CLINIC_URL=https://demo.clinicpos.com
```

Then rebuild and reload:
```bash
cd /var/www/clinicpos/admin-frontend && npm run build
sudo systemctl reload nginx
```

---

## Deployment Workflow — Pushing Updates

Every time you make changes to the code locally, follow these steps to deploy:

```bash
# On your local machine — push to GitHub
git add .
git commit -m "your change description"
git push origin development

# SSH into your server
ssh deploy@YOUR_SERVER_IP

cd /var/www/clinicpos

# Pull the latest code
git pull origin development

# If backend changed:
cd backend-api && npm install --production
pm2 restart clinicpos-api

# If clinic-frontend changed:
cd /var/www/clinicpos/clinic-frontend
npm install
npm run build

# If admin-frontend changed:
cd /var/www/clinicpos/admin-frontend
npm install
npm run build

# If landing-frontend changed:
cd /var/www/clinicpos/landing-frontend
npm install
npm run build

# Reload Nginx to pick up new static files
sudo systemctl reload nginx
```

> You don't need to restart Nginx for frontend changes — reload is enough.
> You only need to restart `clinicpos-api` (PM2) if backend code changed.

---

## Running a New Migration

If you add a new migration script:

```bash
ssh deploy@YOUR_SERVER_IP
cd /var/www/clinicpos/backend-api
node src/db/migrate_your_new_file.js
```

Migrations use `IF NOT EXISTS` — they are safe to re-run.

---

## Common PM2 Commands

```bash
pm2 status                      # see all running processes
pm2 logs clinicpos-api          # live log output (Ctrl+C to exit)
pm2 logs clinicpos-api --lines 50  # last 50 lines
pm2 restart clinicpos-api       # restart after code change
pm2 stop clinicpos-api          # stop the server
pm2 start clinicpos-api         # start it again
pm2 monit                       # real-time CPU/memory dashboard
```

---

## Common Nginx Commands

```bash
sudo nginx -t                   # test config for errors before applying
sudo systemctl reload nginx     # apply config changes (zero downtime)
sudo systemctl restart nginx    # full restart (brief downtime)
sudo tail -f /var/log/nginx/error.log    # watch error log live
sudo tail -f /var/log/nginx/access.log  # watch access log live
```

---

## Database Backup

Run this daily — add it to cron:

```bash
# Manual backup
pg_dump -U clinicpos -d clinicpos_db > /home/deploy/backups/clinicpos_$(date +%Y%m%d).sql

# Set up daily automatic backup via cron
crontab -e
```

Add this line (backs up at 2am every day, keeps last 30 days):

```cron
0 2 * * * pg_dump -U clinicpos -d clinicpos_db > /home/deploy/backups/clinicpos_$(date +\%Y\%m\%d).sql && find /home/deploy/backups -name "*.sql" -mtime +30 -delete
```

Create the backups folder first:

```bash
mkdir -p /home/deploy/backups
```

---

## Restore from Backup

```bash
# Restore a specific backup file
psql -U clinicpos -d clinicpos_db < /home/deploy/backups/clinicpos_20260420.sql
```

> **Warning:** This overwrites all current data. Only run this in an emergency.

---

## Troubleshooting

### Site shows "502 Bad Gateway"
The backend is not running. Check:
```bash
pm2 status               # is clinicpos-api online?
pm2 logs clinicpos-api   # any startup errors?
curl http://localhost:4000/health  # does the API respond locally?
```

### Site shows "404 Not Found" on page refresh
Nginx is not set to fall back to `index.html`. Check that your Nginx config has:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### SSL certificate error in browser
Certificate might be expired or the domain doesn't match. Check:
```bash
sudo certbot certificates    # shows all certs and expiry dates
sudo certbot renew           # renew manually if needed
```

### Cannot connect to database
Check:
```bash
# Is PostgreSQL running?
sudo systemctl status postgresql

# Test connection manually
psql -U clinicpos -d clinicpos_db -h localhost

# Check your .env has the right DATABASE_URL
cat /var/www/clinicpos/backend-api/.env | grep DATABASE_URL
```

### Changes not showing after deployment
Make sure you rebuilt the frontend and reloaded Nginx:
```bash
cd /var/www/clinicpos/clinic-frontend && npm run build
sudo systemctl reload nginx
```

---

## Server Costs Summary

| Service | Cost (estimate) |
|---------|----------------|
| VPS (DigitalOcean 2GB) | ~$12/month |
| Domain name | ~$10–15/year |
| SSL certificate | Free (Let's Encrypt) |
| **Total** | **~$12–15/month** |

---

*ClinicPOS / HealthCenter.lk — HOSTING.md*
*Stack: Ubuntu 24.04 · Node.js 20 · PostgreSQL 16 · Nginx · PM2 · Let's Encrypt*
*Production: healthcenter.lk — DigitalOcean Singapore (178.128.98.34)*
*Read RUNNING.md for local development. Read PLAN.md for build order.*
