# HØmy — Full-stack meal-kit ordering app

A connected monorepo starter for a customer mobile app,
admin dashboard, API, and PostgreSQL database.

## Stack

- API: Node.js, Express, TypeScript, Prisma, PostgreSQL
- Admin: React + Vite
- Mobile: Expo + React Native
- Authentication: JWT + bcrypt
- Validation: Zod

## Requirements

Node.js 20+
npm 10+
PostgreSQL 15+

## Setup

1. Copy `.env.example` to `apps/api/.env`.
2. Configure PostgreSQL and JWT_SECRET.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run dev`.

## API

Default development API:

http://localhost:4000/api

For a physical phone, set EXPO_PUBLIC_API_URL to your
computer's LAN IP instead of localhost.

## Production setup

Deploy the API and admin independently.

Configure:
- DATABASE_URL
- JWT_SECRET
- CORS_ORIGIN
- EXPO_PUBLIC_API_URL

Run database migrations before directing production traffic.

Online payments, hosting, app signing, monitoring, and
production security testing require additional setup.
