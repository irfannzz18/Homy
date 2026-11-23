# HØmy

One responsive website for three roles: Customer, Delivery Partner and Admin. One Render web service serves the website and API; PostgreSQL stores accounts, dishes, orders and delivery records. No APK build and no Razorpay integration.

## Deploy on Render
1. Create a Render Blueprint from this repository and select `render.yaml`.
2. Enter `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` (minimum 12 characters) when prompted.
3. Deploy. The Blueprint provisions one web service and its PostgreSQL database.
4. Open the service URL. Customer registration is public; partner accounts are created by Admin.

## Local
- Node.js 20+
- PostgreSQL
- `npm install`
- Set `DATABASE_URL`, `JWT_SECRET` (32+ chars), `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`.
- `npm run build --workspace=@homy/api`
- `npx prisma db push --schema=apps/api/prisma/schema.prisma`
- `npm run prisma:seed --workspace=@homy/api`
- `npm run start --workspace=@homy/api`

The frontend is served from `public/` by the API service. The API is same-origin at `/api`.

## Notes
- COD orders stay pending until delivery OTP verification.
- Maps, Google OAuth, SMS OTP and card payments require their own provider credentials and are intentionally not faked.
- Set a persistent PostgreSQL database in production. Do not use local filesystem storage for orders.
- Developer credit: Developed by Irfan S.
