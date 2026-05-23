<p align="center">
  <img src="./apps/web/public/logo.png" alt="Labas" width="200" />
</p>

<h1 align="center">Labas</h1>

<p align="center">
  <strong>AI-powered multi-language test practice platform</strong><br />
  Generate authentic exam questions, run mock tests, and track your progress — all in one place.
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> ·
  <a href="#features">Features</a> ·
  <a href="#supported-exams">Exams</a> ·
  <a href="#project-structure">Structure</a> ·
  <a href="#license">License</a>
</p>

---

## What is Labas?

**Labas** is an open-source platform for practicing foreign-language proficiency exams. Users can generate reading (and writing) questions with AI, save them into question packages, take timed mock tests, and review results with explanations in **Bahasa Indonesia** (foreign script such as kanji, hanzi, hangul, or Arabic may appear when relevant).

The project is a **Turborepo monorepo** managed with **Bun**. The web app talks to a **Hono + tRPC** backend backed by **PostgreSQL**, **Redis** (job queue), and **Better Auth**.

## Features

- **AI question generation** — Quick mode (single-pass) and Agentic mode (multi-step pipeline with passage validation and quality checks)
- **8 exam types** — IELTS, TOEFL, JLPT, HSK, Goethe, TOPIK, TOAFL, DELE
- **20+ question formats** — Multiple choice, true/false/not given, fill-in-blank, kanji reading, matching, and more
- **Question bank & packages** — Organize generated questions into shareable or private packages
- **Mock tests & attempts** — Timed practice sessions with scoring and review
- **Analytics & leaderboard** — Track performance over time
- **User-managed AI keys** — Bring your own OpenAI-compatible API key via Settings (never hardcoded in server env)
- **Credit system** — Token-based usage tracking for AI generation
- **Admin panel** — User management, moderation, jobs, credits, and featured content
- **PWA** — Installable progressive web app
- **Accessible UI** — Shared shadcn/ui components with skip links, proper ARIA, and focus management

## Supported Exams

| Exam | Language | Notes |
|------|----------|-------|
| IELTS Academic | English | Reading & Writing sections |
| TOEFL iBT | English | Reading & Writing sections |
| JLPT | Japanese | Kanji annotations supported (`漢字(かんじ)`) |
| HSK | Chinese | |
| Goethe-Zertifikat | German | |
| TOPIK | Korean | Particles, honorifics, speech levels |
| TOAFL | Arabic | RTL text support |
| DELE | Spanish | Verb conjugation focus |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime & package manager | [Bun](https://bun.sh) 1.3+ |
| Frontend | React 19, Vite, [TanStack Router](https://tanstack.com/router) |
| Backend | [Hono](https://hono.dev), [tRPC](https://trpc.io) |
| Database | PostgreSQL + [Drizzle ORM](https://orm.drizzle.team) |
| Queue | Redis + BullMQ (AI generation jobs) |
| Auth | [Better Auth](https://www.better-auth.com) (email/password) |
| UI | [shadcn/ui](https://ui.shadcn.com) in `packages/ui` |
| AI | OpenAI-compatible API (`packages/ai`) |
| Build | Turborepo + tsdown |

## Prerequisites

- **[Bun](https://bun.sh)** `1.3.11` or later (see `packageManager` in root `package.json`)
- **PostgreSQL** 15+
- **Redis** 7+ (required for background AI generation jobs)
- **SMTP server** (required for email verification and password reset)

> Use `bun` for all install and script commands. Do not use `pnpm`, `npm`, or `yarn` unless a global tool explicitly requires it.

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/<your-org>/labas.git
cd labas
bun install
```

### 2. Start PostgreSQL and Redis

The repo includes a Docker Compose file for local development:

```bash
bun run db:start
```

This starts PostgreSQL on port `5432` and Redis on port `6379`. See [`packages/db/docker-compose.yml`](./packages/db/docker-compose.yml) for defaults.

Alternatively, point `DATABASE_URL` and `REDIS_URL` at your own instances.

### 3. Configure environment

Copy the example env files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Edit **`apps/server/.env`**:

```env
# PostgreSQL (matches docker-compose defaults)
DATABASE_URL=postgresql://postgres:password@localhost:5432/labas

# Redis (defaults to redis://localhost:6379 if omitted)
REDIS_URL=redis://localhost:6379

# Auth — generate random strings ≥ 32 characters
BETTER_AUTH_SECRET=your-random-secret-at-least-32-chars
BETTER_AUTH_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3001

# Encrypts user AI API keys at rest — ≥ 32 characters
API_KEY_ENCRYPTION_KEY=your-encryption-key-at-least-32-chars

# SMTP (required for sign-up verification & password reset)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@example.com

# Optional: platform-wide AI fallback (users normally set keys in Settings UI)
# PLATFORM_AI_API_KEY=
# PLATFORM_AI_BASE_URL=
# PLATFORM_AI_MODEL=
```

Edit **`apps/web/.env`**:

```env
VITE_SERVER_URL=http://localhost:3000
```

### 4. Push database schema

```bash
bun run db:push
```

Optionally seed reference data (exam types, sections):

```bash
cd packages/db && bun run db:seed
```

### 5. Run the dev servers

```bash
bun run dev
```

| Service | URL |
|---------|-----|
| Web app | [http://localhost:3001](http://localhost:3001) |
| API server | [http://localhost:3000](http://localhost:3000) |

Sign up, verify your email, then open **Settings** to add your OpenAI-compatible API key before generating questions.

## AI Configuration

AI provider keys are **not** stored in server `.env` by default. Each user configures their own key in the **Settings** page. The server encrypts keys with `API_KEY_ENCRYPTION_KEY`.

Generation supports any **OpenAI-compatible** endpoint (OpenAI, OpenRouter, local LM Studio, etc.).

Two generation modes are available:

| Mode | Description |
|------|-------------|
| **Quick** | Single LLM call with schema validation and repair |
| **Agentic** | Multi-step pipeline: plan → shared passage → parallel question shards → validation |

AI logic lives in [`packages/ai/`](./packages/ai/).

## Project Structure

```
labas/
├── apps/
│   ├── web/              # Frontend (React + TanStack Router) — port 3001
│   └── server/           # Backend entry (Hono + tRPC) — port 3000
├── packages/
│   ├── ai/               # Prompts, schemas, quick & agentic pipelines
│   ├── api/              # tRPC routers, queue workers, business logic
│   ├── auth/             # Better Auth configuration
│   ├── config/           # Shared TypeScript configs
│   ├── db/               # Drizzle schema, migrations, docker-compose
│   ├── env/              # Environment validation (Zod)
│   └── ui/               # Shared shadcn/ui components & design tokens
├── AGENTS.md             # Contributor guide for AI agents & developers
└── turbo.json
```

Internal imports use the `@labas/*` workspace namespace. Apps should not import from each other directly — share code through `packages/*`.

## Available Scripts

Run from the **repository root**:

| Command | Description |
|---------|-------------|
| `bun run dev` | Start web + server in development |
| `bun run dev:web` | Start web app only |
| `bun run dev:server` | Start server only |
| `bun run build` | Build all packages |
| `bun run check-types` | TypeScript check across the monorepo |
| `bun test` | Run all tests via Turborepo |
| `bun run db:push` | Push Drizzle schema to PostgreSQL |
| `bun run db:generate` | Generate migration files |
| `bun run db:migrate` | Run migrations |
| `bun run db:studio` | Open Drizzle Studio |
| `bun run db:start` | Start PostgreSQL + Redis (Docker Compose) |
| `bun run db:stop` | Stop Docker Compose services |

## Development

### Type checking

```bash
bun run check-types
```

### Testing

```bash
bun test
```

Tests use **Bun's built-in test runner**. Unit tests live in `src/__tests__/` within each package. Integration tests in `packages/api` use PGlite (in-memory PostgreSQL).

### Adding shadcn/ui components

From the project root:

```bash
npx shadcn@latest add accordion dialog -c packages/ui
```

Import shared components:

```tsx
import { Button } from "@labas/ui/components/button";
```

Design tokens and global styles: [`packages/ui/src/styles/globals.css`](./packages/ui/src/styles/globals.css).

### PWA assets

```bash
cd apps/web && bun run generate-pwa-assets
```

## Contributing

Contributions are welcome! Before opening a PR:

1. Read [`AGENTS.md`](./AGENTS.md) for architecture, conventions, and common pitfalls.
2. Run `bun run check-types` and `bun test`.
3. Keep changes focused and match existing code style.

For AI-related changes, see the **AI Generation Context** section in `AGENTS.md` — adding a new question format touches schemas, prompts, attempt normalization, and frontend constants.

## License

This project is licensed under the **[GNU Affero General Public License v3.0 (AGPL-3.0)](./LICENSE)**.

If you run a modified version as a network service, you must make the corresponding source code available to users of that service.

---

<p align="center">
  Built with Bun, React, Hono, and tRPC.
</p>
