# Bookhou V1 — Local Code to Live Server Deployment Guide

This code is a fully working NestJS + TypeScript booking engine currently running locally. This guide walks you through deploying it to a live server (AWS, DigitalOcean, or any Linux server) for live testing.

**Stack:** NestJS, TypeScript, MySQL, Prisma ORM, Gmail SMTP, Twilio SMS, Stripe Payments

---

## What You Need Before Starting

- A Linux server (Ubuntu 20.04+ recommended) — AWS EC2, DigitalOcean Droplet, etc.
- SSH access to that server
- A domain name pointed to the server's IP (or the server's IP for testing)
- About 15-20 minutes

---

## Step 1: Install Prerequisites on the Server

SSH into your server and run:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v    # should show v18.x+
npm -v     # should show v9.x+

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx (reverse proxy)
sudo apt install -y nginx

# Install PM2 (keeps the app running)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

---

## Step 2: Set Up MySQL Database

**Option A — Import the included dump file (recommended):**
```bash
mysql -u root -p < database/bookhou_mysql_dump.sql
```
This creates the `bookhou_prod` database, all 32 tables, indexes, and seed data in one step.

**Option B — Empty database (Prisma creates tables):**
```bash
mysql -u root -p -e "CREATE DATABASE bookhou_prod;"
```
Then in Step 5, run `npx prisma db push` to create tables.

Your MySQL connection URL for Step 4:
```
mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/bookhou_prod
```

---

## Step 3: Clone and Install the Code

```bash
cd /var/www
sudo git clone https://github.com/antoinevibecodes/april-9th-bookhou-version.git bookhou
cd bookhou
sudo npm install
```

---

## Step 4: Update the .env File

A `production.env` file is included with all credentials pre-filled. Copy it:

```bash
cp production.env .env
nano .env
```

**Change these 3 values:**

```env
# 1. DATABASE — your MySQL connection
DATABASE_URL="mysql://root:YOUR_MYSQL_PASSWORD@localhost:3306/bookhou_prod"

# 2. JWT SECRET — generate a secure one:
#    Run this in a separate terminal: openssl rand -hex 32
#    Paste the output here
JWT_SECRET=paste_your_generated_secret_here

# 3. FRONTEND URL — your domain or server IP
FRONTEND_URL=https://yourdomain.com
```

**Everything else is already configured in production.env:**
- Stripe test keys (client's account) — already set
- Gmail SMTP (`noreply@bookoobookings.com`) — already set
- Twilio SMS (`+18337627956`) — already set

Save and exit nano: `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Create Database Tables

```bash
cd /var/www/bookhou

# Generate Prisma client
npx prisma generate

# Push the schema to create all tables
npx prisma db push

# Seed the database with test data (admin user, sample location, packages, rooms)
npm run prisma:seed
```

After seeding, these test logins are available:
- **Admin:** `admin@tinytowne.com` / `admin123!`
- **Owner:** `owner@tinytowne.com` / `owner123!`

---

## Step 6: Build and Start the App

```bash
cd /var/www/bookhou

# Build for production
npm run build

# Start with PM2 (keeps it running after you disconnect)
pm2 start dist/main.js --name bookhou-api

# Save PM2 config so it restarts on server reboot
pm2 save
pm2 startup
# (run the command that pm2 startup outputs)
```

**Verify it's running:**
```bash
pm2 status
# Should show "bookhou-api" with status "online"

curl http://localhost:3000/docs
# Should return HTML (Swagger docs page)
```

---

## Step 7: Set Up Nginx (Reverse Proxy + HTTPS)

This makes the API accessible via your domain instead of `localhost:3000`.

```bash
sudo nano /etc/nginx/sites-available/bookhou
```

**Paste this config** (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # API — proxy to NestJS running on port 3000
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Swagger API docs
    location /docs {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Frontend (if serving from same server — put built files in /var/www/bookhou-frontend/dist)
    location / {
        root /var/www/bookhou-frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

**Enable the site and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/bookhou /etc/nginx/sites-enabled/
sudo nginx -t          # test config — should say "ok"
sudo systemctl restart nginx
```

**Add HTTPS with Let's Encrypt (free SSL):**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
# Follow the prompts — it auto-configures HTTPS
```

---

## Step 8: Verify Everything Works on Live Server

Open your browser and test each of these:

**1. API is live:**
```
https://yourdomain.com/docs
```
You should see the Swagger API documentation with all endpoints listed.

**2. Login works:**
- In Swagger, find `POST /api/v1/auth/login`
- Send: `{ "email": "admin@tinytowne.com", "password": "admin123!" }`
- You should get a JWT token back

**3. Email automation works:**
- Create a test party via the API (use Swagger or Postman)
- The host email should receive a booking confirmation from `noreply@bookoobookings.com`

**4. SMS automation works:**
- Same test party — if the host has a phone number, they should receive an SMS from `+18337627956`
- NOTE: If Twilio is in trial mode, SMS only sends to verified numbers

**5. Stripe payment works:**
- Use Stripe test card: `4242 4242 4242 4242`, any future expiry, any CVC
- Payment should show in Stripe dashboard (test mode)

---

## Step 9: Going from Test → Live

When ready to go live with real customers, change these in `.env`:

| Setting | Test Value | Live Value |
|---------|-----------|------------|
| `NODE_ENV` | `development` | `production` |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` (from Stripe dashboard) |
| `STRIPE_PUBLISHABLE_KEY` | `pk_test_...` | `pk_live_...` |
| Twilio | Trial account | Paid account (so SMS reaches all numbers) |
| `JWT_SECRET` | dev secret | Strong random secret |
| Admin passwords | `admin123!` | Strong passwords |

Then restart:
```bash
cd /var/www/bookhou
npm run build
pm2 restart bookhou-api
```

---

## Troubleshooting

**App won't start:**
```bash
pm2 logs bookhou-api    # check error logs
```

**Database connection fails:**
- Verify MySQL is running: `sudo systemctl status mysql`
- Test connection: `psql -U bookhou_user -d bookhou_prod -h localhost`
- Check `DATABASE_URL` in `.env` matches exactly

**Emails not sending:**
- Check Gmail account is active and password is correct
- Gmail may block sign-ins — check `noreply@bookoobookings.com` inbox for security alerts
- If blocked, regenerate the App Password in Google Account settings

**SMS not sending:**
- Twilio trial accounts only send to verified numbers
- Check Twilio dashboard for error logs
- Verify `TWILIO_PHONE_NUMBER` is a purchased Twilio number

**Nginx returns 502 Bad Gateway:**
- App not running: `pm2 status` — restart if offline
- Wrong port: verify `.env` has `PORT=3000` and Nginx proxies to `127.0.0.1:3000`

**Prisma migration errors:**
```bash
npx prisma db push --force-reset    # WARNING: drops all data
npm run prisma:seed                  # re-seed after reset
```

---

## Quick Reference

| Command | What it does |
|---------|-------------|
| `pm2 start dist/main.js --name bookhou-api` | Start the app |
| `pm2 restart bookhou-api` | Restart after code changes |
| `pm2 logs bookhou-api` | View live logs |
| `pm2 stop bookhou-api` | Stop the app |
| `npx prisma studio` | Visual database browser (localhost:5555) |
| `npx prisma db push` | Sync schema to database |
| `npm run prisma:seed` | Re-seed test data |
| `npm run build` | Build for production |

---

## All 29 Email + SMS Automations (Pre-configured)

These fire automatically — no additional setup needed:

| When this happens... | Customer gets... |
|---------------------|-----------------|
| Party booked | Booking confirmation email + SMS |
| Party details updated | Update notification email + SMS |
| Party date changed | Date change alert email + SMS |
| Party cancelled | Cancellation email + SMS to host AND all guests |
| Party completed | Thank you + Google review request email + SMS |
| Payment received | Payment receipt email + SMS |
| Balance fully paid | Full payment confirmation email + SMS |
| Refund processed | Refund notification email + SMS |
| Guest invited | Invitation with RSVP + waiver links via email + SMS |
| Guest RSVPs | Host gets notified via email + SMS |
| Waiver signed | Signer gets confirmation email + SMS |
| Waiver reminder sent | Reminder email + SMS with waiver link |
| Payment reminder sent | Payment due email + SMS with pay link |
| Invoice emailed | Invoice PDF attached to email + link via SMS |
| Password changed | Security notification email |
| Team member added | Welcome email + SMS with login link |
| Add-ons updated | Update notification email + SMS |
| Abandoned cart | "Complete your booking" email + SMS (stages 1 and 2) |

**Email sender:** `noreply@bookoobookings.com` (Gmail SMTP)
**SMS sender:** `+18337627956` (Twilio)
**Stripe:** Test mode — use card `4242 4242 4242 4242`
