# In The Loop Monorepo

In The Loop is a TypeScript monorepo for an anonymity-oriented employee feedback platform. The system is designed to collect pulse feedback with strong anti-correlation controls, threshold-gated analytics, and user-visible trust/transparency evidence.

## System overview

### Product goals

- Prevent direct identity/correlation keys from entering response-processing paths.
- Keep participation signaling and response content unlinkable in normal operating modes.
- Enforce privacy thresholds before analytics are disclosed.
- Provide transparency and runtime assurance signals users can inspect.

### Architecture summary

- **Core (`packages/core`)**: domain models + pure application use cases.
- **Adapters (`packages/adapters`)**: browser, REST contracts, logging/storage adapters, and runtime server/store implementations.
- **Config (`packages/config`)** and **Shared (`packages/shared`)**: workspace support packages.
- **Docs (`docs/`)**: PRDs, trust/security artifacts, implementation status, deployment runbook.

## Repository layout

- `packages/core/src/domain`: trust rules, Option/Either, disclosure primitives.
- `packages/core/src/application`: scheduling, validation, unlinkable packaging, analytics, admin authoring.
- `packages/core/src/ports`: hexagonal interfaces.
- `packages/adapters/src/driving`: REST contracts + web UI adapters.
- `packages/adapters/src/driven`: storage/logging driven adapters.
- `packages/adapters/src/runtime`: runtime server and storage backends.
- `tests/e2e`: runtime/browser end-to-end tests.

## Prerequisites

- Node.js 20+
- pnpm 9+

## Install

```bash
pnpm install
```

## Build

```bash
pnpm build
```

> Note: build requires runtime dependencies for server adapters (`fastify`, `pg`) to be installed and available.

## Test

```bash
pnpm test
```

Runs Vitest with coverage enabled and enforces high quality gates.

## Lint and architecture checks

```bash
pnpm lint
pnpm check-arch
```

## Run (development)

### Option A: package runtime entry

```bash
pnpm --filter @in-the-loop/adapters run start
```

### Option B: tsx direct runtime entry

```bash
pnpm --filter @in-the-loop/adapters exec tsx src/runtime/server.ts
```

Default environment variables used by runtime server:

- `PORT` (default: `8080`)
- `RUNTIME_STORE` (`memory` or `postgres`; default: `memory`)
- `DATABASE_URL` (required when `RUNTIME_STORE=postgres`)

## Docker

Build image:

```bash
docker build -t in-the-loop .
```

Run compose stack:

```bash
docker compose up --build
```

## Documentation guide

Start with:

1. `ARCHITECTURE.md` (detailed architecture)
2. `CODE_MAP.md` (file-by-file map)
3. `docs/README.md` (documentation index)
4. `docs/artifacts/*` (security/trust boundaries)
5. `docs/engineering/*_IMPLEMENTATION_STATUS.md` (feature completion status)

## Current status (as validated in this repo)

- Core and adapter test suites pass with full coverage.
- PRD-linked modules are implemented across `core` and `adapters`.
- PRD-11 requirements are documented and tracked; initial one-shot thin-client adapter implementation is in place, with installer and desktop packaging work pending.
- Production-readiness gaps are mostly operational and governance-driven (audit process, external verification artifacts, rollout controls).

## Latest migration note

- Admin UI + options model migration (2026-03-23):
  - `docs/engineering/ADMIN_UI_AND_OPTIONS_MODEL_MIGRATION_2026-03-23.md`

## Contributing workflow

1. Implement changes in the appropriate layer (domain/application/ports/adapters).
2. Add/adjust tests beside source files.
3. Run `pnpm test`, `pnpm lint`, and `pnpm check-arch`.
4. Update `ARCHITECTURE.md`, `CODE_MAP.md`, and relevant docs when architecture or behavior changes.
