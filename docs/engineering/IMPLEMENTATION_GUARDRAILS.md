# Implementation Guardrails (Hexagonal + Functional + TDD)

This document defines the mandatory engineering rules for building **In The Loop**.

## 1) System philosophy

1. **High-Assurance Software**: privacy and trust claims require evidence.
2. **Hexagonal Architecture (Cockburn)**: isolate Core domain logic from infrastructure adapters.
3. **Strict Functional TypeScript**: prefer `fp-ts` style (`Either`, `Option`, `TaskEither`) and explicit effects.
4. **Deep Immutability**: domain/application data is transformed, never mutated.
5. **Red-Green-Refactor-Document TDD**: every change starts with a failing test.
6. **Single-language strategy**: TypeScript only for implementation and review simplicity.

## 2) Absolute development rules

1. No type escape hatches: **no `any`, no `unknown`, no unsafe casts as policy shortcuts**.
2. No exceptions for expected control flow in core/application (use `Either` / `TaskEither`).
3. No `null`/`undefined` for optional domain values (use `Option`).
4. No mutation in core/application code (`let`, `.push`, property reassignment).
5. No mocks in tests; use deterministic **fakes**.
6. No production code change without a failing test first.
7. Tests must demonstrate they can fail (red run evidence before green implementation).

## 3) Target monorepo layout

```text
/in-the-loop
├── packages
│   ├── core
│   │   └── src
│   │       ├── domain
│   │       ├── ports
│   │       │   ├── driving
│   │       │   └── driven
│   │       └── application
│   ├── adapters
│   │   └── src
│   │       ├── driving
│   │       │   ├── rest-api
│   │       │   └── web-ui
│   │       └── driven
│   │           ├── persistence
│   │           ├── i18n
│   │           └── crypto
│   ├── shared
│   └── config
├── dependency-cruiser.cjs
├── .eslintrc.cjs
├── vitest.config.ts
└── pnpm-workspace.yaml
```


## 3.1) Why `packages/<name>/src`?

We keep code under `src` in each package for predictable tooling boundaries:

- `src` is compile input; `dist` is compile output (never mixed).
- TypeScript, Vitest, ESLint, and dependency-cruiser can target source boundaries consistently.
- Package-level ownership is clearer: each package is a mini-module with its own public surface.
- It prevents accidental imports from generated artifacts and keeps hexagonal boundaries enforceable.

## 4) Hexagonal boundary enforcement

Forbidden dependency directions:

- `packages/core` → `packages/adapters`
- `packages/core/src/domain` → `packages/core/src/ports`
- `packages/adapters/src/driven/*` → other `packages/adapters/src/driven/*`

Architecture checks must run in CI and fail on boundary violations.

## 5) Functional TypeScript baseline

- All exported DTOs and entities must be deeply readonly.
- Side effects are only allowed in adapters/composition root.
- Core modules must be referentially transparent.
- Crypto must use vetted libraries only (no custom algorithm implementations).

## 6) TDD protocol (mandatory)

For every task:

1. Write/adjust failing test.
2. Run tests and capture red result.
3. Implement minimal code to pass.
4. Run full suite to green.
5. Refactor safely.
6. Update docs/ADR if architecture or behavior changed.

## 7) Coverage and quality gates

- Coverage threshold target: 100% statements/branches/functions/lines.
- Lint + typecheck + architecture checks are required to merge.
- If a threshold is temporarily relaxed, a dated exception ticket is required.

## 8) Testing policy

- Unit tests for pure domain/application behavior.
- Adapter tests use fakes for collaborators.
- Contract tests for port-adapter compatibility.
- Integration tests for persistence and API boundaries.


## 8.1) Test placement

Test files live close to code for fast feedback and maintainability:

- Unit tests: `packages/<pkg>/src/**/<name>.test.ts`
- Contract tests (port/adapter): `packages/adapters/src/**/<name>.contract.test.ts`
- Integration tests: `packages/adapters/src/**/<name>.integration.test.ts`

Optional end-to-end tests can live in a top-level `tests/e2e` folder if introduced later.

## 9) Localization rule

Localization is first-class: translatable domain messages flow through a translation port, implemented in adapters.

## 10) Trust-specific coding constraints

- No response-path log may include identity-bound metadata.
- No hidden tracking IDs in submission payload paths.
- Claim language in docs must match evidence in `docs/artifacts/SECURITY_CLAIMS.md`.
