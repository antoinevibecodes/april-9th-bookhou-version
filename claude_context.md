# Bookhou Backend - Claude Context

## Project Overview
Rebuild of the **Bookhou (Bookoo)** party booking engine backend for client **Tiny Towne** (tinytowne.com). The original codebase was a 3-year-old Laravel 6 / PHP app with 77 migrations, 97 models, and 38 API controllers. We rebuilt from scratch using a modern stack.

## Tech Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS 10
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** JWT (passport-jwt)
- **Payments:** Stripe SDK + Square SDK
- **File Storage:** AWS S3
- **Email:** Nodemailer (SMTP)
- **PDF:** PDFKit
- **Deployment:** Docker + docker-compose

## Repository
- **GitHub:** `antoinevibecodes/V1-Bookhou-backend-code`
- **Branch:** `main`

---

## Architecture

```
src/
├── main.ts                          # App bootstrap, Swagger, CORS, validation
├── app.module.ts                    # Root module (imports all feature modules)
├── prisma/
│   ├── prisma.module.ts             # Global Prisma module
│   └── prisma.service.ts            # Prisma client lifecycle
├── common/
│   ├── decorators/
│   │   ├── roles.decorator.ts       # @Roles() decorator
│   │   └── current-user.decorator.ts # @CurrentUser() param decorator
│   ├── guards/
│   │   ├── roles.guard.ts           # Role-based access (SUPER_ADMIN, BUSINESS_OWNER, MANAGER, EMPLOYEE)
│   │   └── permissions.guard.ts     # Fine-grained permissions (view_analytics, print_reports, etc.)
│   └── helpers/
│       ├── timezone.helper.ts       # Local timezone formatting (Task #1)
│       └── invoice-number.helper.ts # Sequential invoice number generation
└── modules/
    ├── auth/                        # JWT login, register, change password
    ├── users/                       # Team member CRUD, role management
    ├── business/                    # Business entity CRUD
    ├── locations/                   # Location CRUD, work hours, off days, taxes, payment config
    ├── packages/                    # Party packages with time slots, room assignments
    ├── rooms/                       # Room CRUD, availability checking
    ├── addons/                      # Addon CRUD, package-addon linking
    ├── parties/                     # Core booking CRUD, pricing calculation, cancellation
    ├── payments/
    │   ├── payments.service.ts      # Payment recording, transaction filters, refunds
    │   ├── payment-processing.service.ts # Unified Stripe/Square gateway routing
    │   ├── gateways/
    │   │   ├── stripe.gateway.ts    # Stripe payment intents, refunds, webhooks
    │   │   └── square.gateway.ts    # Square payments, Apple Pay, Cash App detection
    │   └── webhook.controller.ts    # Stripe webhook handler
    ├── invitations/                 # Guest invitations via email/SMS, RSVP
    ├── waivers/                     # Waiver templates, public signing, question management
    ├── coupons/                     # Coupon CRUD, validation, package restrictions
    ├── reports/                     # Payment reports, party reports, tax reports (IRS)
    ├── dashboard/                   # Today's parties, upcoming, stats, revenue
    ├── email/
    │   ├── email.service.ts         # Email template CRUD, logging, trigger system
    │   └── mail.service.ts          # Actual SMTP sending via nodemailer
    ├── invoices/
    │   ├── invoices.service.ts      # Invoice data generation (JSON)
    │   └── pdf.service.ts           # PDF invoice generation (PDFKit)
    ├── uploads/                     # S3 presigned URLs, file upload/delete
    └── booking/                     # Public booking flow (no auth required)
```

## Key Files
| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Complete database schema — all tables, enums, relations |
| `src/common/guards/permissions.guard.ts` | Employee permission restrictions (Task #4, #9) |
| `src/modules/parties/parties.service.ts` | Core booking logic — pricing, cancellation, availability |
| `src/modules/payments/payment-processing.service.ts` | Unified Stripe/Square payment routing |
| `src/modules/invoices/pdf.service.ts` | PDF invoice with package contents, tax %, card details |
| `src/modules/waivers/waivers.service.ts` | Public waiver signing without login redirect |
| `src/modules/reports/reports.service.ts` | Payment/party/tax reports with totals |

---

## Database Schema (Key Models)

- **User** — auth, roles (SUPER_ADMIN, BUSINESS_OWNER, MANAGER, EMPLOYEE)
- **Business** — top-level business entity with unique prefix
- **BusinessLocation** — multi-location with timezone, payment gateway config, currency
- **Package** — party packages with price, duration, contents, extra-per-person pricing
- **Room** — event rooms with capacity, availability checking
- **Addon** — upsell items, supports custom amounts per event (isCustom flag)
- **Party** — core booking record: host info, pricing snapshot, status workflow, cancellation tracking
- **PartyAddon** — addons attached to a party (supports custom name/desc/price)
- **Payment** — transactions with type (CARD, CASH, APPLE_PAY, CASH_APP, SQUARE_OTHER), card details (last4, cardholderName), refund tracking
- **Invitation** — guest invitations via EMAIL or SMS, RSVP status, waiver signed flag
- **PartyWaiver** — signed waivers per guest (not shared/overwritten)
- **WaiverTemplate** — configurable waiver forms with questions
- **Coupon** — discount codes (PERCENTAGE, FIXED_AMOUNT, PACKAGE, FULL_AMOUNT)
- **Tax** — percentage-based tax rates per location (not flat amounts)
- **EmailTemplate** — customizable email templates with trigger system
- **EmailLog** — full email history per party for client visibility

---

## Client's 26-Item Task List — Full Details and Status

These are the exact tasks the client (Tiny Towne) requested. Each was analyzed from the client's email (with screenshots) and implemented in the rebuild.

### Task #1: Timezone Display
**Problem:** Dates/times showed in UTC instead of the venue's local timezone.
**Solution:** `timezone.helper.ts` with `toLocalTime()`, `formatLocalDateTime()`, `formatLocalDate()`, `nowInTimezone()` using IANA timezone strings stored on each BusinessLocation.
**Status:** DONE

### Task #2: Transaction Filters
**Problem:** Needed filtering by date range and payment type on the transactions page.
**Solution:** `payments.service.ts` `getTransactions()` accepts dateFilter (TODAY, YESTERDAY, CUSTOM with startDate/endDate) and typeFilter (ALL, CASH, CARD, APPLE_PAY, CASH_APP). Query builds dynamic Prisma `where` clause.
**Status:** DONE

### Task #3: Reports Totals
**Problem:** Reports needed cash totals shown, notes next to payments, and download support.
**Solution:** `reports.service.ts` calculates totalsByType (cash, card, applePay, cashApp, total). Notes stored on Payment model. PDF download via `pdf.service.ts`.
**Status:** DONE

### Task #4: Employee Permissions
**Problem:** Employees could see analytics, sales data, and use print/download features.
**Solution:** Two-layer permission system: `roles.guard.ts` (role-based) + `permissions.guard.ts` (fine-grained). `ROLE_PERMISSIONS` map gives EMPLOYEE empty array, blocking access to analytics, sales, reports, print/download. MANAGER gets view_analytics, view_sales, print_reports. BUSINESS_OWNER gets all.
**Status:** DONE

### Task #5: Refund Process
**Problem:** No proper refund flow existed.
**Solution:** `payment-processing.service.ts` `processGatewayRefund()` routes to Stripe or Square based on original payment gateway. Creates refund record, updates party `amountRefunded`. Stripe uses `refunds.create()`, Square uses `refunds.refundPayment()`.
**Status:** DONE

### Task #6: Payment Modes
**Problem:** Only card payments supported. Needed cash, Apple Pay, Cash App, etc.
**Solution:** `PaymentType` enum: CARD, CASH, APPLE_PAY, CASH_APP, SQUARE_OTHER. Square gateway auto-detects source type from payment response. Cash recorded directly without gateway.
**Status:** DONE

### Task #7: Cancellation Fee
**Problem:** Cancellation fee was fixed. Needed exact dollar OR percentage option.
**Solution:** `RefundType` enum (FULL, PERCENTAGE, FIXED_AMOUNT) on Party. `parties.service.ts` `cancelParty()` calculates refund based on type: percentage applies to totalAmount, fixed subtracts exact dollar amount.
**Status:** DONE

### Task #8: Refund in Totals
**Problem:** Refunds not reflected in financial totals and invoices.
**Solution:** `amountRefunded` field on Party. Invoice includes refund line item. Reports subtract refunds from totals. PDF shows "Amount Refunded" section.
**Status:** DONE

### Task #9: Hide Revenue from Employees
**Problem:** Employees could see revenue numbers.
**Solution:** Revenue endpoint in `dashboard.controller.ts` gated by `@Permissions('view_revenue')`. Employees don't have this permission in ROLE_PERMISSIONS map.
**Status:** DONE

### Task #10: Custom Addons
**Problem:** Some party addons needed custom names, descriptions, and prices per event.
**Solution:** `PartyAddon` model has `customName`, `customDescription`, `customPrice` fields. When `isCustom=true` on Addon, the party-specific values override the template values.
**Status:** DONE

### Task #11: Missing Events
**Problem:** Some parties/events not showing in lists.
**Solution:** Party listing endpoints include all statuses (CONFIRMED, PENDING, CANCELLED, COMPLETED). Proper indexing on `partyDate`, `status`, `locationId` in Prisma schema.
**Status:** DONE

### Task #12: SMS Invitations
**Problem:** Only email invitations existed. Needed SMS.
**Solution:** `guestPhone` field on Invitation. `InvitationMethod` enum: EMAIL, SMS. Backend stores the data and method. **Actual Twilio SMS sending is a remaining task.**
**Status:** PARTIAL (data model done, Twilio integration pending)

### Task #13: Card Details on Payments
**Problem:** No record of which card was used for payment.
**Solution:** `cardLast4` and `cardholderName` fields on Payment model. Stripe: extracted from PaymentIntent's `payment_method` details on confirmation. Square: extracted from payment response `card_details`.
**Status:** DONE

### Task #14: Booking Link (Public Page)
**Problem:** Needed a public booking details page accessible without login.
**Solution:** `booking.controller.ts` with `GET /booking/details/:partyId` — no JWT guard. Returns party info, package details, addons, host info for the booking confirmation page.
**Status:** DONE

### Task #15: Email Copy
**Problem:** No record of emails sent for a party.
**Solution:** `EmailLog` model stores every email sent: recipient, subject, body, templateId, partyId, timestamp. `GET /email/history/:partyId` returns full email history.
**Status:** DONE

### Task #16: Balance Email
**Problem:** No email sent when balance is settled.
**Solution:** `mail.service.ts` `sendBalanceSettledEmail()` sends formatted email with invoice link when final payment completes.
**Status:** DONE

### Task #17: Field Trip Pricing
**Problem:** Extra per-person pricing didn't auto-recalculate when guest count changed.
**Solution:** `extraPerPersonPrice` on Package. `parties.service.ts` pricing calculation: if guest count > package's included count, charges extra per additional person. Recalculated on party update.
**Status:** DONE

### Task #18: Invoice Contents
**Problem:** Invoice missing package contents, business logo, and refund policy.
**Solution:** `pdf.service.ts` renders: business logo (from S3 URL), package name + contents list, line items (package, addons, extra persons), subtotal, discount, tax, total, refund policy text from business settings.
**Status:** DONE

### Task #19: Tax as Percentage
**Problem:** Tax was stored as flat $6 instead of percentage.
**Solution:** `Tax` model with `rate` as `Decimal(5,4)` — e.g., 0.0600 = 6%. Tax calculated on (subtotal - discount) in `parties.service.ts`. Displayed as "6.00%" on invoice, not "$6.00".
**Status:** DONE

### Task #20: Tax Totals for IRS
**Problem:** No tax summary report for IRS filing.
**Solution:** `reports.service.ts` `getTaxReport()` returns `totalTaxCollected` for date range, broken down by tax name/rate. `GET /reports/taxes` endpoint.
**Status:** DONE

### Task #21: Invitation Wording
**Problem:** Invitation email text was generic.
**Solution:** `mail.service.ts` invitation template: "[Host Name] has invited you to [Child's Name]'s birthday party at [Venue Name]" with party date, time, location, RSVP link.
**Status:** DONE

### Task #22: RSVP Waiver Status
**Problem:** Staff couldn't see if a guest had signed their waiver.
**Solution:** `waiverSigned` boolean on Invitation model. Updated when guest completes waiver signing. Visible in party detail and invitation list responses.
**Status:** DONE

### Task #23: Waiver No-Login
**Problem:** Guests redirected to login page when trying to sign waiver.
**Solution:** `POST /waivers/sign` is a public endpoint (no JWT guard). Accepts guestName, guestEmail, partyId, answers. Creates PartyWaiver record without authentication.
**Status:** DONE

### Task #24: Guest Waiver Copy
**Problem:** When a guest filled out the waiver, it overwrote the host's waiver.
**Solution:** Each signer gets their own `PartyWaiver` record keyed by (partyId + signerName + signerEmail). No overwriting — multiple waivers per party supported.
**Status:** DONE

### Task #25: Card on Invoice
**Problem:** Invoice didn't show which card was used.
**Solution:** `invoices.service.ts` includes `cardDetails` array with `last4` and `cardholderName` from all payments. `pdf.service.ts` renders "Payment Method: Visa ending in 4242 (John Doe)" for each payment.
**Status:** DONE

### Task #26: Save Popup
**Problem:** Frontend save confirmation popup needed.
**Solution:** Frontend concern — the API already supports proper save flows with appropriate HTTP status codes and response bodies. No backend work needed.
**Status:** N/A (Frontend)

---

## Original Laravel Codebase Reference

The original code was a Laravel 6 / PHP application with:
- **77 database migrations** — incremental schema changes over 3 years
- **97 Eloquent models** — many with complex relationships and accessors
- **38 API controllers** — REST endpoints for the booking engine
- **Key tables:** users, businesses, locations, packages, rooms, addons, parties, payments, invitations, waivers, coupons, taxes, email_templates
- **Payment processing:** Stripe only (no Square integration existed)
- **Known bugs:** flat $6 tax instead of percentage, waiver overwrite, no SMS, missing transaction filters, employees seeing revenue

The rebuild preserves all business logic and relationships while fixing every known bug and adding the 26 requested enhancements.

---

## Modules Built (Git History)

1. **Module 1:** Project setup, Prisma schema, Auth module (JWT)
2. **Module 2:** Users, Business, Locations CRUD
3. **Module 3:** Packages, Rooms, Addons CRUD
4. **Module 4:** Parties (Bookings) and Payments core
5. **Module 5:** Invitations, Waivers, and Coupons
6. **Module 6:** Reports, Dashboard, Invoices, and Email
7. **Module 7:** Payment Gateways (Stripe + Square), File Uploads, Email Sending
8. **Module 8:** Public Booking, PDF Invoices, and Docker Deployment

## REMAINING WORK
- **Twilio SMS integration** — actual SMS sending (invitations, waiver links)
- **Google Calendar sync** — event creation/update on booking
- **Database seed data** — sample business, location, packages for dev/testing
- **Unit tests** — service-level tests for critical business logic
- **E2E tests** — API endpoint tests
- **CI/CD pipeline** — GitHub Actions for build/test/deploy

---

## Design Decisions

1. **NestJS over Express** — Module system mirrors Laravel's structure, built-in validation/guards/Swagger
2. **Prisma over TypeORM** — Cleaner schema definition, type-safe queries, easier migrations
3. **PostgreSQL over MySQL** — Better JSON support (for waiver answers, booking screen data), robust
4. **Unified payment processing** — Single service routes to Stripe or Square based on location config, not separate flows
5. **Permission system** — Two layers: role-based (Roles guard) + fine-grained (Permissions guard with ROLE_PERMISSIONS map)
6. **Tax as decimal** — Stored as Decimal(5,4) e.g. 0.0600 = 6%, calculated on (subtotal - discount), fixing the old flat $6 bug
7. **Per-signer waivers** — Each guest gets their own PartyWaiver record to prevent the old bug where guest filling overwrites host's waiver
8. **Card details on Payment** — cardLast4 and cardholderName captured automatically from Stripe/Square at payment time, not manually
9. **Invoice number** — Sequential, zero-padded (#00000001), unique constraint
10. **Public vs protected** — Booking page, RSVP, waiver signing are public endpoints. Everything else requires JWT auth.

---

## Environment Variables
See `.env.example` for all required config. Key ones:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Auth token signing
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe
- `SQUARE_ACCESS_TOKEN` / `SQUARE_LOCATION_ID` — Square
- `AWS_*` — S3 file storage
- `MAIL_*` — SMTP email
- `FRONTEND_URL` — For email links (booking confirmation, invoice)

## How to Run
```bash
# Development
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev

# Docker
docker-compose up -d

# Swagger docs
open http://localhost:3000/docs
```
