# In The Loop Architecture (Detailed)

## 1. System purpose and intent

In The Loop is an anonymity-preserving employee feedback system designed to collect daily pulse responses while minimizing identity linkage risk. The architecture centers on three intentions:

1. **Preserve participation/response unlinkability** wherever possible.
2. **Provide threshold-safe analytics** that reduce re-identification risk at low sample sizes.
3. **Expose transparency evidence** (build provenance, runtime assurance, and trust assumptions) so users can reason about system trust.

The design in this repository follows a **TypeScript-only monorepo** with **hexagonal architecture** and strict layering constraints.

---

## 2. High-level architecture

### 2.1 Layers

- **Domain (`packages/core/src/domain`)**
  - Pure value types, Option/Either primitives, trust rules, strong-anonymity disclosure primitives.
- **Application (`packages/core/src/application`)**
  - Business use cases: question scheduling, payload validation, submission unlinkability packaging, aggregation/privacy-threshold analytics, admin authoring, employee prompt flow.
- **Ports (`packages/core/src/ports`)**
  - Driving ports (use-case entry points), driven ports (storage/time/calendar integrations).
- **Adapters (`packages/adapters`)**
  - Driving adapters: REST contracts, browser UI rendering/runtime.
  - Driven adapters: local/browser storage, queue/batch processor, log sanitizer.
  - Runtime adapters: Fastify runtime server + in-memory/Postgres stores.

### 2.2 Architectural constraints

- `core` is independent of `adapters`.
- Domain logic avoids infrastructure dependencies.
- Adapters translate external contracts into domain/application models.
- Tests target both pure use-cases and adapter contract mapping.

---

## 3. Trust and privacy model mapped to code

### 3.1 Input hardening and anti-correlation rules

- `validateResponsePayload` enforces allowed keys and rejects prohibited identity/correlation keys.
- Redaction utilities sanitize response-path metadata and nested log events.

### 3.2 Unlinkable submission packaging

- `createUnlinkableSubmissionArtifacts` separates participation metadata from response payload.
- Shared fields are restricted to an explicit allowlist.
- Rejected conditions include correlation-like keys in participation metadata or disallowed overlaps.

### 3.3 Privacy-threshold analytics

- Aggregation and dashboard services return `INSUFFICIENT_DATA` when threshold requirements are not met.
- Drill-down and trend comparison are only returned under threshold-safe conditions.

### 3.4 Runtime trust assurance disclosure

- Trust-assurance logic downgrades confidence when build provenance is missing, hash mismatch occurs, or attestation is unavailable/failed.
- Version endpoint and transparency panel expose assurance signals to users.

---

## 4. Core flows

### 4.1 Employee prompt flow

1. Employee signs in.
2. Local state determines whether prompt should be shown/skipped.
3. Daily selection logic picks question for local survey day and scheduling rules.
4. UI model renders question/options and captures response.
5. Response is validated and packaged into unlinkable artifacts.
6. Submission is delayed/queued and eventually processed in shuffled batch mode.

### 4.2 Admin authoring flow

1. API contract adapter parses authoring payload.
2. Validation ensures schedule consistency and target validity.
3. Persisted question set is saved in runtime store.
4. Selection state versioning protects against concurrent update conflicts.

### 4.3 Analytics flow

1. Aggregated records are filtered by manager/role/level/category/tags/time window.
2. Privacy threshold checks gate visibility.
3. Engagement chart and drill-down metrics are computed.
4. REST contract adapter maps camelCase domain output to snake_case API payload.

---

## 5. Data model concepts

- **ResponsePayload**: normalized score + optional comment + analysis dimensions (manager/role/level/surveyDay).
- **Question scheduling model**: specific-date, recurring, and queue-based schedules with suppression windows.
- **Selection state**: consumed queue IDs + version stamp for optimistic concurrency.
- **Assurance model**: provenance metadata, expected/runtime build hashes, attestation status.

---

## 6. Runtime/deployment topology

- **Monorepo tooling**: pnpm workspaces.
- **Test framework**: Vitest with strict coverage gates.
- **Server runtime adapter**: Fastify-based API/UI shell.
- **Storage runtime adapters**:
  - In-memory runtime store (local/dev).
  - Postgres runtime store (durable mode).
- **Containerization**: Dockerfile and docker-compose included.

---

## 7. Current implementation completeness assessment

Based on implementation status documents and test outcomes:

- PRD-01 through PRD-10 are represented by dedicated core/adapters modules and status documents.
- PRD-11 (login-triggered thin client) now has initial one-shot adapter flow implementation and tests; installer/startup registration and desktop packaging work remains.
- Core anonymity, thresholding, scheduling, prompt, admin authoring, dashboard analytics, and trust disclosure paths are implemented and tested.
- Remaining production gaps are primarily operational:
  - external audit/independent review process,
  - full production wiring/deployment evidence publication,
  - organizational controls (key lifecycle and governance) beyond code-only scope.

---

## 8. Security and risk boundaries

The architecture intentionally distinguishes:

- **Strong guarantee zone**: transport/storage unlinkability and key-level anti-correlation controls.
- **Accepted-risk zone**: content-level inferencing risks (e.g., comments/filter differencing) that can still reveal identity in edge contexts.

These assumptions are documented in `docs/artifacts/*` and should be surfaced in deployment/customer documentation.

---

## 9. Quality controls

- 100% statements/branches/functions/lines coverage target configured and currently passing.
- Unit + contract + runtime-focused tests across core and adapter packages.
- Dependency-cruiser and lint/build scripts configured in workspace root.

---

## 10. Suggested next architecture hardening steps

1. Publish formal threat model table as an executable artifact used in CI release checks.
2. Add runtime attestation verification integration tests against signed fixture reports.
3. Add explicit tenancy isolation tests for storage and analytics boundaries.
4. Add abuse-resilience telemetry design that avoids identity linkage.
5. Add operational runbooks for key rotation/revocation tied to deployment pipelines.
