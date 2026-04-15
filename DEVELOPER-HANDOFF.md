# Production-Ready Bookhou V1 — Developer Handoff

This is a NestJS + TypeScript booking engine with built-in email (Gmail SMTP) and SMS (Twilio) automations, Stripe payments, waiver system, and reporting. It uses PostgreSQL via Prisma ORM.

---

## Step 1: Prerequisites

Install these on the server:
- **Node.js** v18+ (check: `node -v`)
- **npm** v9+ (comes with Node.js)
- **PostgreSQL** v14+ (AWS RDS, local, or Docker)
- **Git** (to clone the repo)

---

## Step 2: Clone the Repository

```bash
git clone https://github.com/antoinevibecodes/V1-Bookhou-backend-code.git
cd V1-Bookhou-backend-code
npm install
```

---

## Step 3: Set Up PostgreSQL Database

Create a PostgreSQL database:

```sql
CREATE DATABASE bookhou_prod;
CREATE USER bookhou_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE bookhou_prod TO bookhou_user;
```

Note your connection URL:
```
postgresql://bookhou_user:your_secure_password@localhost:5432/bookhou_prod
```

If using AWS RDS, replace `localhost` with your RDS endpoint.

---

## Step 4: Configure .env File

The `.env` file is already in the repo with the client's test credentials. For production, update these values:

```env
# Application
NODE_ENV=production
PORT=3000
API_PREFIX=api/v1

# Database — UPDATE WITH YOUR PRODUCTION DB
DATABASE_URL="postgresql://bookhou_user:your_secure_password@localhost:5432/bookhou_prod"

# JWT Authentication — CHANGE THIS IN PRODUCTION
JWT_SECRET=generate-a-strong-random-secret-here
JWT_EXPIRES_IN=7d

# Stripe (client's test keys — already configured in .env, do not change)
STRIPE_SECRET_KEY=<already set in .env>
STRIPE_PUBLISHABLE_KEY=<already set in .env>

# Email — Gmail SMTP (already configured in .env, do not change)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=<already set in .env>
MAIL_PASSWORD=<already set in .env>
MAIL_FROM=<already set in .env>

# Twilio SMS (already configured in .env, do not change)
TWILIO_ACCOUNT_SID=<already set in .env>
TWILIO_AUTH_TOKEN=<already set in .env>
TWILIO_PHONE_NUMBER=<already set in .env>

# Frontend URL — UPDATE TO YOUR DOMAIN
FRONTEND_URL=https://yourdomain.com

# Google Calendar (optional — leave as placeholder if not using)
GOOGLE_CLIENT_EMAIL=placeholder
GOOGLE_PRIVATE_KEY=placeholder
GOOGLE_CALENDAR_ID=primary

# AWS S3 (optional — for file uploads)
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_S3_BUCKET=bookhou-uploads
AWS_REGION=us-east-1
```

**What to change for production:**
1. `DATABASE_URL` — your production PostgreSQL connection string
2. `JWT_SECRET` — generate with: `openssl rand -hex 32`
3. `FRONTEND_URL` — your actual domain (e.g. `https://app.tinytowne.com`)
4. Stripe keys — swap `sk_test_` / `pk_test_` for `sk_live_` / `pk_live_` when going live

---

## Step 5: Run Database Migrations

This creates all tables in your PostgreSQL database:

```bash
npx prisma migrate deploy
```

If this is a fresh database and you want to force-create tables:

```bash
npx prisma db push
```

Then generate the Prisma client:

```bash
npx prisma generate
```

---

## Step 6: Seed the Database (Test Users)

This creates an admin user, business owner, sample location, packages, and rooms:

```bash
npm run prisma:seed
```

Default login credentials after seeding:
- **Admin:** `admin@tinytowne.com` / `admin123!`
- **Business Owner:** `owner@tinytowne.com` / `owner123!`

**Change these passwords in production.**

---

## Step 7: Build & Run

**Development (with hot reload):**
```bash
npm run start:dev
```

**Production build:**
```bash
npm run build
npm run start:prod
```

**With PM2 (recommended for production):**
```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name bookhou-api
pm2 save
pm2 startup
```

The API runs on port `3000` by default. Test it:
```
http://localhost:3000/docs
```
This opens the Swagger API documentation with all endpoints.

---

## Step 8: Verify Everything Works

1. **API running:** Visit `http://localhost:3000/docs` — you should see Swagger UI
2. **Database connected:** The app logs `Prisma connected` on startup
3. **Email working:** Create a test booking → booking confirmation email should send via Gmail SMTP
4. **SMS working:** Send a test invitation → SMS should arrive via Twilio
5. **Stripe working:** Process a test payment → should hit Stripe test mode

---

## Step 9: Nginx Reverse Proxy (Production)

**HTTP → HTTPS redirect (port 80):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

**HTTPS (port 443):**
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # API — proxy to NestJS
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger docs
    location /docs {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }

    # Frontend (if serving from same server)
    location / {
        root /path/to/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Step 10: Third-Party Setup Notes

**Stripe:**
- Test keys are already configured. Switch to live keys (`sk_live_`, `pk_live_`) when going live.
- Webhook endpoint (optional): `https://yourdomain.com/api/v1/payments/webhook`

**Gmail SMTP:**
- Already configured with `noreply@bookoobookings.com`
- If emails fail, the Gmail account may need "App Password" regenerated or "Less secure apps" enabled
- For production volume, consider upgrading to Google Workspace or a transactional email service

**Twilio:**
- Already configured with the client's credentials
- Trial accounts can only send to verified numbers — upgrade to paid for production
- The sending number is `+18337627956`

**Google Calendar (optional):**
- Create a service account in Google Cloud Console
- Share the target calendar with the service account email
- Set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` in `.env`

---

## Architecture Overview

```
V1-Bookhou-backend-code/
├── prisma/
│   ├── schema.prisma     ← Database schema (all tables)
│   ├── seed.ts           ← Test data seeding
│   └── migrations/       ← Database migrations
├── src/
│   ├── main.ts           ← App entry point
│   ├── app.module.ts     ← All modules registered here
│   └── modules/
│       ├── auth/          ← JWT login, registration, password reset
│       ├── users/         ← User management (roles, permissions)
│       ├── business/      ← Business profiles
│       ├── locations/     ← Venue locations, tax config
│       ├── packages/      ← Party packages & pricing
│       ├── rooms/         ← Room management
│       ├── addons/        ← Party add-ons
│       ├── parties/       ← Core booking engine (create, update, cancel)
│       ├── payments/      ← Stripe + Square payment processing
│       ├── invitations/   ← Guest invitations (email + SMS)
│       ├── waivers/       ← Digital waiver system
│       ├── notifications/ ← 29 email + SMS automations (NEW)
│       ├── email/         ← Gmail SMTP + email templates
│       ├── sms/           ← Twilio SMS
│       ├── invoices/      ← Invoice PDF generation
│       ├── reports/       ← Revenue, transaction, tax reports
│       ├── dashboard/     ← Admin dashboard stats
│       ├── coupons/       ← Discount codes
│       ├── calendar/      ← Google Calendar sync
│       ├── uploads/       ← File uploads (S3)
│       └── booking/       ← Public booking flow
└── .env                   ← All configuration
```

---

## Email + SMS Automations (29 total)

Every automation sends BOTH an email AND an SMS. They fire automatically:

| Trigger | Email | SMS |
|---------|-------|-----|
| Party created | Booking confirmation | Booking confirmation |
| Party updated | Update notification | Update notification |
| Party date changed | Date change alert | Date change alert |
| Party cancelled | Cancellation to host + all guests | Cancellation to host + all guests |
| Party completed | Thank you + review request | Thank you + review link |
| Payment received | Payment receipt | Payment receipt |
| Balance settled ($0) | Full payment confirmation | Full payment confirmation |
| Refund processed | Refund notification | Refund notification |
| Guest invited | Invitation with RSVP + waiver links | Same via SMS |
| Waiver signed | Signed confirmation | Signed confirmation |
| + 19 more | Password change, team member, addon updates, reminders, etc. | Same |

---

## Quick Test Checklist

After setup, verify these work:

- [ ] Visit `/docs` — Swagger loads
- [ ] Login with `admin@tinytowne.com` / `admin123!` — get JWT token
- [ ] Create a party — booking confirmation email + SMS arrives
- [ ] Process a Stripe payment — payment receipt email + SMS arrives
- [ ] Cancel a party — cancellation emails + SMS to host and guests
- [ ] Sign a waiver — confirmation email + SMS arrives
- [ ] View reports — revenue and transaction data shows up
