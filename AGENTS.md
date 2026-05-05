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

## 10. Git & Workflow

- Do **NOT** run `git commit`, `git push`, `git rebase`, or force-push unless the user explicitly asks for it.
- Do **NOT** create `README.md` or documentation files unless explicitly requested.
- Keep changes minimal and focused on the task at hand.
- Follow existing code style in the file you are editing.

---

_Last updated: 2026-05-01_
