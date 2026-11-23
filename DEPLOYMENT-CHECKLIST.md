# HØmy — One Website Deployment

## Render Blueprint

1. Open Render → **New → Blueprint**.
2. Connect `irfannzz18/Homy`, branch `main`.
3. Render reads `render.yaml` and creates exactly one Node web service (`homy`) plus one PostgreSQL database (`homy-db`). Customer, partner and admin are routes on the same website.
4. Enter `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` of at least 12 characters. Render generates `JWT_SECRET`.
5. Optionally enter `GOOGLE_MAPS_API_KEY`; keep it website-referrer restricted.
6. Apply the Blueprint and wait for the web service to deploy.

## Service settings

- Root directory: repository root
- Build: `node scripts/prepare.js && npm install --include=dev && npm run build:all`
- Start: `npm run db:push && npm run seed && npm start`
- Health check: `/api/health`
- Database: Render PostgreSQL Internal Database URL in `DATABASE_URL`
- Build environment: `VITE_API_URL=/api`

## Website routes

- `/` redirects to `/customer/`
- `/customer/` customer storefront and order history
- `/partner/` delivery partner workspace
- `/admin/` admin dashboard and menu catalogue

## Smoke test after deploy

1. Open `/api/health`; expect status `ok`.
2. Sign in to admin using the credentials entered in Render.
3. Confirm the 36 seeded South Indian meal kits are listed.
4. Create a customer account, place a COD order and assign it to an active partner.
5. Partner accepts the assignment, starts delivery and shares GPS while the page remains open.
6. Customer sees the delivery OTP after partner acceptance. Partner enters it to complete delivery; COD becomes collected.
7. Verify partner total is hidden until successful OTP verification.
8. Add a new dish and confirm it is unpublished until explicitly published.

Do not advertise Google login, SMS OTP login, online payment or background GPS until those integrations are separately configured and tested. Razorpay and APK builds are intentionally excluded.
