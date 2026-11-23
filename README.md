# HØmy

HØmy is a single-origin web application with three role-based interfaces: Customer, Delivery Partner and Admin. One Node/Express service serves the website in `public/` and the API at `/api`. PostgreSQL stores users, menu items, orders and delivery tracking.

## Architecture
- `public/index.html`, `public/app.js`, `public/styles.css`: the only website UI for all three roles.
- `apps/api/src/index.ts`: authentication, catalogue, orders, admin and partner API.
- `apps/api/prisma/schema.prisma`: PostgreSQL data model.
- `scripts/seed.js`: creates the initial admin and South Indian dish catalogue. New seeded dishes are unpublished.
- `render.yaml`: one Render web service and one PostgreSQL database.

There is no separate admin/customer/partner frontend deployment and no APK build.

## Local run
1. Install Node.js 22 and PostgreSQL.
2. Run `npm install`.
3. Set `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), `ADMIN_EMAIL`, and `ADMIN_PASSWORD` (at least 12 characters). Optionally set `ADMIN_NAME`.
4. Run `npm run build`.
5. Run `npm run db:push`.
6. Run `npm run seed`.
7. Run `npm start`.
8. Open `http://localhost:4000`.

## Render deployment
Create a Blueprint from this repository using `render.yaml`. Enter `ADMIN_EMAIL` and `ADMIN_PASSWORD` when prompted. Render provisions the web service and PostgreSQL database. The health endpoint is `/api/health`.

## Important integration limits
Google Maps needs a configured Maps Platform key and billing. Google sign-in and SMS OTP need OAuth/SMS provider credentials. Live browser location requires the delivery partner to grant location permission and keep the app active; reliable background tracking requires a native app. These integrations must not be represented as active until configured and tested. Razorpay is intentionally excluded.

COD is the only enabled payment method. Keep the database and backups; do not delete order history to clear the daily dashboard.

Footer credit: Developed by Irfan S. HØmy — All rights reserved.
