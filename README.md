# HØmy

HØmy is one full-stack website with three role-based interfaces on the same domain:

- Customer: `/customer/`
- Delivery Partner: `/partner/`
- Admin: `/admin/`

A single Node/Express web service serves all three Vite applications and the API. PostgreSQL stores accounts, dishes, orders and delivery tracking. No APK and no separate frontend services are part of this deployment.

## Render deployment

Deploy the root `render.yaml` as a Blueprint. It creates one Node web service and one PostgreSQL database. Configure the prompted `ADMIN_EMAIL` and `ADMIN_PASSWORD` (at least 12 characters). Render generates `JWT_SECRET` automatically.

The build prepares the API, installs workspace dependencies and builds the three web interfaces. Startup applies the Prisma schema, seeds the administrator and 36 South Indian meal kits, then starts the one web service.

## Local commands

```bash
npm install
npm run prepare:api
npm run build:all
npm run db:push
npm run seed
npm start
```

Required environment variables: `DATABASE_URL`, `JWT_SECRET` (32+ characters), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (12+ characters), `ADMIN_NAME`. `VITE_API_URL=/api` is used for the same-origin deployment. `GOOGLE_MAPS_API_KEY` is optional until the Google Maps integration is configured.

Cash on Delivery is the only enabled payment method. COD is marked collected only after the partner verifies the customer's six-digit delivery OTP. The partner API does not disclose order totals or OTP hashes. New admin-created dishes default to unpublished.

Google OAuth, SMS login and online payments are not enabled until their provider credentials and verification flows are configured. Browser GPS works while the partner page is open and location permission is granted; browsers cannot guarantee background tracking.

Footer credit: Developed by Irfan S · HØmy — All rights reserved.
