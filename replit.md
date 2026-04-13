# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, TailwindCSS, Wouter (routing), React Query, Framer Motion

## Project: Banco D$

A full-featured digital bank app with:
- **Currency**: D$ (5 decimal places, e.g. `D$ 0,00000`)
- **Auth**: Session-based (express-session + bcrypt), register + login
- **Dashboard**: Shows balance prominently
- **Transfers**: Send D$ to other users by username
- **Personal Reserves**: Create savings buckets, deposit/withdraw, rename, delete (when 0)
- **Shared Reserves**: Multi-user reserves with member management (add, remove via voting, leave)
- **Profile**: Change avatar URL, change password, delete account (triple confirmation, requires 0 balance)
- **Cards (Tarjetas)**: Collectible card system — buy packs (D$1), collect cards with random % (0.00001–100.00000%), upgrade with cases (D$10) and power points (D$5/10/25/50/100), 7 rarity tiers with distinct colors
- **Menu**: Hamburger 3-lines in top right with: Transferir, Reservar, Tarjetas, Perfil, Cerrar sesión
- **Logout**: Confirmation dialog before closing session

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── banco-ds/           # React + Vite frontend (Banco D$)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Database Schema

- **users**: id, username (unique), passwordHash, balance (NUMERIC 20,5), avatarUrl, createdAt
- **reserves**: id, name, balance, userId (FK → users), createdAt
- **shared_reserves**: id, name, balance, createdByUserId (FK → users), createdAt
- **shared_reserve_members**: sharedReserveId, userId (composite PK)
- **remove_votes**: id, sharedReserveId, targetUserId, voterUserId, createdAt

## API Routes

All under `/api`:
- `POST /auth/register` — Register (username, password, confirmPassword)
- `POST /auth/login` — Login
- `POST /auth/logout` — Logout
- `GET /auth/me` — Get current user
- `GET /users/:username` — Get user by username
- `PATCH /users/me/profile` — Update avatar URL
- `PATCH /users/me/password` — Change password
- `DELETE /users/me/account` — Delete account (requires zero balance)
- `POST /transfers` — Transfer D$ to another user
- `GET /reserves` — List personal reserves
- `POST /reserves` — Create personal reserve
- `PATCH /reserves/:id` — Rename reserve
- `DELETE /reserves/:id` — Delete reserve (requires 0 balance)
- `POST /reserves/:id/deposit` — Deposit to reserve
- `POST /reserves/:id/withdraw` — Withdraw from reserve
- `GET /shared-reserves` — List shared reserves
- `POST /shared-reserves` — Create shared reserve
- `PATCH /shared-reserves/:id` — Rename shared reserve
- `DELETE /shared-reserves/:id` — Delete shared reserve (requires 0 balance)
- `POST /shared-reserves/:id/deposit` — Deposit to shared reserve
- `POST /shared-reserves/:id/withdraw` — Withdraw from shared reserve
- `POST /shared-reserves/:id/members` — Add member
- `DELETE /shared-reserves/:id/members/:userId` — Vote to remove member
- `POST /shared-reserves/:id/leave` — Leave shared reserve

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm run build:vercel` — Builds for Vercel (Build Output API v3): bundles API as serverless function + static frontend
- `pnpm run build:railway` — Builds for Railway: single-file Express server serving API + static frontend
- `pnpm run start:railway` — Starts the Railway production server from `dist-railway/server.mjs`

## Deployment

### Vercel
- Script: `scripts/build-vercel.mjs` → outputs to `.vercel/output/`
- Frontend as static files, API as serverless function
- Env vars needed: `SUPABASE_DATABASE_URL`, `SESSION_SECRET`

### Railway
- Script: `scripts/build-railway.mjs` → outputs to `dist-railway/`
- Single Express process serves both API (`/api/*`) and static frontend
- Build command: `pnpm install && pnpm run build:railway`
- Start command: `pnpm run start:railway`
- Env vars needed: `SUPABASE_DATABASE_URL`, `SESSION_SECRET`
- Railway auto-provides `PORT`
