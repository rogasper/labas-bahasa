# AGENTS.md — Labas Project Guide

> This file is for AI agents. Read this first before making any changes.

---

## 1. Project Identity

- **Name:** `labas` — AI-powered multi-language test practice platform.
- **Repo type:** Turborepo monorepo (Bun workspaces).
- **Workspace packages:** `apps/*`, `packages/*`.
- **Runtime & package manager:** **Bun** (`packageManager: "bun@1.3.11"`).
  - Do **NOT** use `pnpm`, `npm`, or `yarn` unless explicitly required by a global tool.

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 19 + Vite + TanStack Router | File-based routing. **Not Next.js.** |
| Backend | Hono + tRPC | Entry: `apps/server/src/index.ts`. Port 3000. |
| DB Engine | PostgreSQL | Managed via Drizzle. |
| DB ORM | Drizzle ORM | **Not Prisma.** |
| Auth | Better-Auth | Email/password + OAuth. |
| UI | shadcn/ui (shared) | Lives in `packages/ui`. Imported as `@labas/ui/components/*`. |
| AI | OpenAI-compatible API | User-managed API keys via Settings UI. |
| Build | Turborepo + `tsdown` | Server compiled with `tsdown`. |

---

## 3. Architecture Overview

```
labas/
├── apps/
│   ├── web/          # Frontend (Vite, TanStack Router) — Port 5173
│   └── server/       # Backend (Hono, tRPC) — Port 3000
├── packages/
│   ├── ui/           # Shared shadcn/ui components & styles
│   ├── api/          # tRPC routers & business logic
│   ├── auth/         # Better-Auth configuration
│   ├── db/           # Drizzle schema, queries, migrations
│   ├── ai/           # AI generation: prompts, schemas, agentic pipeline
│   ├── env/          # Shared environment validation
│   └── config/       # Shared TypeScript configs
```

- **Internal imports** use the `@labas/*` workspace namespace.
- Do **NOT** create cross-imports between `apps/*` directly; route through `packages/*`.

---

## 4. Essential Commands

Use these exact commands. Do not substitute with `pnpm`/`npm`/`npx` equivalents.

```bash
# Install dependencies
bun install

# Development
bun run dev              # Start all apps (web + server)
bun run dev:web          # Start web app only
bun run dev:server       # Start server only

# Type checking
bun run check-types      # Check all packages

# Database (Drizzle)
bun run db:push          # Push schema changes to PostgreSQL
bun run db:studio        # Open Drizzle Studio UI
bun run db:migrate       # Run migrations
bun run db:generate      # Generate migration files
bun run db:start         # Start local DB (if configured)
bun run db:stop          # Stop local DB

# Testing
bun test                 # Run all tests
bun run turbo test       # Run via turbo pipeline

# Build
bun run build            # Build all packages
```

---

## 5. Common Pitfalls — DO NOT

- ❌ **Do not use `pnpm` / `npm` / `yarn`** for package management or running scripts.
- ❌ **Do not assume Docker or Docker Compose** exists in this repo. There are no Dockerfiles or compose files.
- ❌ **Do not assume Next.js**. This project uses **Vite + TanStack Router**, not Next.js App Router or Pages Router.
- ❌ **Do not assume Prisma**. Database layer is **Drizzle ORM**.
- ❌ **Do not hardcode API keys** in source code. AI keys are user-managed via the Settings UI.
- ❌ **Do not add global CSS** in `apps/web` without checking `packages/ui/src/styles/globals.css` for existing design tokens and CSS variables.

---

## 6. UI / Styling Guidelines

- Design tokens and global styles live in **`packages/ui/src/styles/globals.css`**.
- shadcn/ui primitives are shared via **`packages/ui`**.
- Import components like this:
  ```tsx
  import { Button } from "@labas/ui/components/button";
  ```
- To add new shadcn primitives, run from the **project root**:
  ```bash
  npx shadcn@latest add accordion dialog -c packages/ui
  ```
- App-specific blocks (non-shared) should be added directly in `apps/web/src/components/`.

---

## 7. Environment & Secrets

- Server environment variables are loaded from **`apps/server/.env`**.
- Required variables typically include:
  - `DATABASE_URL` (PostgreSQL connection string)
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
- AI provider API keys are **NOT** stored in `.env`. Users configure their own keys via the Settings page in the UI.

---

## 8. Database Schema Conventions

- Schema files live in **`packages/db/src/schema/`**.
- Use `pgTable` from Drizzle. Primary keys are usually `uuid` with `.defaultRandom()`.
- Add indexes for frequently queried foreign keys.
- When adding new tables or columns, run `bun run db:push` to sync the local database.

---

## 9. AI Generation Context

- AI logic is centralized in **`packages/ai/`**.
- Key files:
  - `src/schemas.ts` — Zod schemas for questions, generation input, and output.
  - `src/prompts.ts` — Prompt builders for quick mode.
  - `src/agentic.ts` — Multi-step agentic generation pipeline (passage → validate → questions → self-check).
- Adding a new question format requires updates to:
  1. `packages/ai/src/schemas.ts` (enum + discriminated union)
  2. `packages/ai/src/prompts.ts` (format description)
  3. `packages/ai/src/agentic.ts` (format schema string)
  4. `packages/api/src/routers/attempt.ts` (answer normalization)
  5. `apps/web/src/lib/generate-constants.ts` (format metadata + allowed exams)
  6. `apps/web/src/lib/exam-constants.ts` (format string list)

---

## 10. Backend Conventions (tRPC / Hono)

### Error Handling
- **Always use English** error messages in tRPC routers.
- Use helper functions from `packages/api/src/lib/errors.ts`:
  ```ts
  import { throwNotFound, throwForbidden, throwBadRequest } from "@labas/api/lib/errors";
  assertOwnership(row, userId, "Question"); // throws NotFound or Forbidden
  ```
- Never throw raw `new Error("...")` in tRPC routers.

### Pagination
- Use shared schema + helper for all list endpoints:
  ```ts
  import { paginationSchema, paginateDefaults } from "@labas/api/lib/pagination";
  .input(z.object({ search: z.string().optional(), ...paginationSchema?.shape }).optional())
  const { limit, offset } = paginateDefaults(input);
  ```
- Return shape: `{ items: rows, total }` (or domain-specific name like `{ questions: rows, total }` for legacy compatibility).

### Authorization (Ownership)
- Use `assertOwnership(row, userId, resourceName)` from `packages/api/src/lib/ownership.ts`.
- Prefer explicit ownership query + assert over embedding `creatorUserId` in `.where()` for mutations that need a clear 404 vs 403.

### Visibility (Public/Private)
- Use `buildVisibilityCondition(table, userId)` from `packages/api/src/lib/visibility.ts` for list queries.
- Default behavior: guests see only public; authenticated users see public + their own private.

### Logging
- Winston logger is available in tRPC context via `ctx.logger`.
- Use `logger.info()`, `logger.error()`, etc. for business events and errors.
- Hono HTTP request logging is handled automatically by `hono/logger` in `apps/server/src/index.ts`.

### Router Structure
- Shared helpers live in `packages/api/src/lib/`.
- Routers live in `packages/api/src/routers/`.
- Register new routers in `packages/api/src/routers/index.ts`.

## 11. Git & Workflow

- Do **NOT** run `git commit`, `git push`, `git rebase`, or force-push unless the user explicitly asks for it.
- Do **NOT** create `README.md` or documentation files unless explicitly requested.
- Keep changes minimal and focused on the task at hand.
- Follow existing code style in the file you are editing.

---

## 12. Testing

### Test Runner
- **Bun test** (`bun test`) — built-in, Jest/Vitest compatible API (`describe`, `it`, `expect`).
- Turbo task `test` sudah dikonfigurasi.

### Test Location
- Unit tests: `src/__tests__/*.test.ts` di masing-masing package.
- Integration tests: `packages/api/src/__tests__/*.integration.test.ts` (pakai PGlite in-memory DB).

### Integration DB (PGlite)
- **PGlite** (`@electric-sql/pglite`) — PostgreSQL WASM in-memory.
- Strategy: `mock.module("@labas/db")` intercept DB saat dynamic import untuk inject PGlite-based drizzle instance.
- Setup helper: `packages/api/src/__tests__/test-setup.ts` — skema 14 tabel via raw SQL + seed data.
- Schema diimport dari `../../../db/src/schema` (langsung, bukan via `@labas/db`) untuk hindari env validation side-effect.
- Env vars di-mock via `mock.module("@labas/env/server")` sebelum dynamic import.

### tRPC Router Testing
- Gunakan `router.createCaller({ session, auth })` untuk memanggil procedure.
- Protected procedure: `session: { user: { id }, expiresAt: new Date() }`.
- Public procedure: `session: null`.

### Known Limitations
- **Rate limiter** (`checkRateLimit` di `attempt.ts`) pakai in-memory `Map`. Gunakan user ID berbeda per test atau `Bun.sleep()` untuk menghindari rate limit blocker.
- **Timer validation** (`finish`) butuh ≥5 detik elapsed sejak `start` — pakai `Bun.sleep()` + `{ timeout: 30000 }` pada `it()`.
- **Env vars Wajib** untuk di-mock saat integration test: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `CORS_ORIGIN`, `API_KEY_ENCRYPTION_KEY` (≥32 chars), `REDIS_URL`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

### TDD Convention
- TDD: tulis test dulu, lihat fail, baru implementasi.
- Untuk existing code yang belum ada test: tulis test yang verifikasi behavior saat ini.
- Fungsi internal yang perlu di-test secara unit harus di-`export`.

---

_Last updated: 2026-05-14_
