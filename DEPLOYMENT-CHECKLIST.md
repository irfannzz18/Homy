# HØmy deployment and verification

## Single service
- GitHub repository: `irfannzz18/Homy`, branch `main`.
- Render Blueprint: `render.yaml`.
- Exactly one Node web service and one PostgreSQL database.
- Website files: `public/`; API: `/api`.
- Health check: `/api/health`.

## Deploy
1. Open Render and choose **New → Blueprint**.
2. Connect the repository and select branch `main`.
3. Review the Blueprint. It provisions a web service and PostgreSQL database.
4. Provide `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters.
5. Apply the plan only after reviewing any resource charges.
6. Wait for the build and deploy to finish.

Build command: `npm install --include=dev && npm run build && npm run db:push && npm run seed`

Start command: `npm run start --workspace=@homy/api`

## Smoke test
1. Open `/api/health`; expect JSON status `ok`.
2. Open the root website and create a customer account.
3. Sign in as admin using the configured credentials.
4. Confirm the seeded menu appears in Admin → Dishes and all seeded items start unpublished.
5. Publish one test dish and confirm it appears in the customer catalogue.
6. Create a partner from Admin → Partners; sign in as that partner in a separate browser session.
7. Place a COD test order as a customer; verify admin can see and assign it.
8. Verify partner accepts and starts the assigned order, then enters the customer OTP to complete it.
9. Verify the order status and COD collection state in the customer/admin views.

Do not advertise Google Maps, Google OAuth, SMS OTP, online payment or background GPS as operational until credentials and end-to-end tests are complete. Razorpay and APK builds are excluded.
