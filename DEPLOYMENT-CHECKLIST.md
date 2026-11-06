
# HØmy Deployment Checklist

## 1. PostgreSQL

Create or use a PostgreSQL database on Render.

Set DATABASE_URL in the API service.

## 2. API service

Render service:

- Name: homy-api
- Root directory: apps/api
- Build command: npm install && npx prisma generate && npx prisma db push && npm run build
- Start command: npm start

Environment variables:

- DATABASE_URL
- JWT_SECRET
- ADMIN_NAME
- ADMIN_EMAIL
- ADMIN_PASSWORD
- PORT (Render supplies this)

Generate a long random JWT_SECRET.
Use a unique admin password of at least 12 characters.

## 3. Admin website

- Root directory: apps/admin
- Build command: npm install && npm run build
- Publish directory: dist
- VITE_API_URL: https://YOUR-API.onrender.com/api

## 4. Customer website

- Root directory: apps/customer-web
- Build command: npm install && npm run build
- Publish directory: dist
- VITE_API_URL: https://YOUR-API.onrender.com/api

## 5. Partner dashboard

- Root directory: apps/partner
- Build command: npm install && npm run build
- Publish directory: dist
- VITE_API_URL: https://YOUR-API.onrender.com/api

## 6. Admin account

After the API is deployed and the database is ready, run the seed script once in an environment with the production database connection:

    npm run prisma:seed --workspace=@homy/api

## 7. Android app

From apps/mobile, install dependencies and build the Android APK with EAS.

## 8. Test before launch

- API health endpoint
- Admin sign-in
- Customer registration and sign-in
- Product create and hide/list
- Cart calculations
- COD order placement
- Order status updates
- Partner account sign-in
- Partner assignment and acceptance
- OTP delivery verification
- Location permission and GPS update
- Customer order history

Do not advertise UPI as available until a real payment provider and payment verification workflow are configured.
