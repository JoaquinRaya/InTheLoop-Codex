# Deployment Runbook

This repository now ships a deployable Fastify runtime in:

- `packages/adapters/src/runtime/server.ts`
- desktop one-shot login client runtime entrypoint:
  - `packages/adapters/src/runtime/desktop-login-client.ts`

## Runtime contract

Required environment variables:

- `DATABASE_URL` (PostgreSQL connection string)
- `PORT` (default `3000`)
- `HOST` (default `0.0.0.0`)

## Build + run locally

```bash
pnpm install
pnpm -r build
DATABASE_URL=postgres://in_the_loop:in_the_loop@localhost:5432/in_the_loop pnpm --filter @in-the-loop/adapters start
```

Run desktop login client (one-shot mode):

```bash
ITL_API_BASE_URL=http://127.0.0.1:3000 \
ITL_TENANT_ID=tenant-a \
ITL_MANAGER_EMAIL=lead@example.com \
ITL_ROLE=ic \
ITL_LEVEL=l3 \
pnpm --filter @in-the-loop/adapters start:desktop-login
```

## Docker Compose (recommended quickstart)

```bash
docker compose up --build
```

This starts:

- PostgreSQL 16
- In The Loop API on `http://localhost:3000`

## End-to-end CUJ validation with Playwright

Run the CUJ suite:

```bash
pnpm e2e
```

Coverage in `tests/e2e/runtime-cujs.e2e.test.ts` includes:

- admin authoring upload + first employee prompt
- queue progression over multiple days
- target filtering by manager subtree
- admin preview resolution
- invalid authoring payload rejection

Additional browser + real-Postgres path:

- `tests/e2e/runtime-browser-postgres.e2e.test.ts` boots a real PostgreSQL instance (`initdb`/`pg_ctl`) and drives the runtime through the actual runtime UI page (`/ui`) with Playwright.
- `tests/e2e/desktop-login-client-postgres.e2e.test.ts` boots real PostgreSQL + runtime server, runs the desktop login client as a process, interacts with prompt UI, and verifies persisted `response_scores` rows.

## Runtime verification endpoint

- `GET /version` exposes build/version/provenance hashes and attestation status for trust/transparency surfaces.

## API sequence for first question delivery

1. Create questions:

```bash
curl -X POST http://localhost:3000/admin/questions \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"tenant-a",
    "questions":[
      {
        "id":"q1",
        "created_at":"2026-03-23T00:00:00.000Z",
        "text":"How was your day?",
        "category":"engagement",
        "tags":["daily"],
        "options":["1","2","3","4","5"],
        "points":10,
        "allow_comments":true,
        "schedule":{"type":"queue"},
        "target":{"type":"whole_company"}
      }
    ]
  }'
```

2. Request a prompt for an employee:

```bash
curl -X POST http://localhost:3000/employee/prompt \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"tenant-a",
    "timestampUtcIso":"2026-03-24T09:00:00.000Z",
    "timeZone":"UTC",
    "profile":{
      "managerEmail":"lead@example.com",
      "managerAncestryEmails":["vp@example.com"],
      "groupIds":["grp-a"]
    }
  }'
```

3. Preview admin-target resolution:

```bash
curl -X POST http://localhost:3000/admin/preview \
  -H "content-type: application/json" \
  -d '{
    "tenantId":"tenant-a",
    "timestampUtcIso":"2026-03-24T09:00:00.000Z",
    "timeZone":"UTC",
    "profile":{
      "managerEmail":"lead@example.com",
      "managerAncestryEmails":["vp@example.com"],
      "groupIds":["grp-a"]
    }
  }'
```

## Notes

- Startup automatically creates runtime tables:
  - `admin_questions`
  - `question_selection_state`
- Question-selection state persistence uses optimistic versioning.
