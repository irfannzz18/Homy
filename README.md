# HØmy

South Indian meal-kit ordering platform.

## Applications

- `apps/api` — Express, Prisma and PostgreSQL backend
- `apps/admin` — Kitchen administration dashboard
- `apps/customer-web` — Customer ordering website
- `apps/mobile` — Customer Android application
- `apps/partner` — Delivery partner dashboard

## Backend

Environment variables:

- DATABASE_URL
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD
- ADMIN_NAME
- UPI_ID (optional)

Install dependencies:

    npm install

Build the API:

    npm run build:api

The API listens on the Render-provided PORT.

## Admin

Build:

    npm run build:admin

Set VITE_API_URL to the API URL plus /api.

## Customer website

Build:

    npm run build:customer

Set VITE_API_URL to the API URL plus /api.

## Partner dashboard

Build:

    npm run build:partner

Set VITE_API_URL to the API URL plus /api.

## Android customer application

The Android application is built separately using Expo and EAS.

## Security

Never commit production passwords, database credentials or JWT secrets.
