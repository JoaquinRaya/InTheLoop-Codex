# Monorepo Technical Specification (TypeScript)

## 1) `pnpm-workspace.yaml`

```yaml
packages:
  - 'packages/core'
  - 'packages/adapters'
  - 'packages/config'
  - 'packages/shared'
```

## 2) Root `package.json` (target)

```json
{
  "name": "in-the-loop-monorepo",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run --coverage",
    "lint": "eslint . --ext .ts,.tsx",
    "check-arch": "depcruise packages --config dependency-cruiser.cjs",
    "build": "pnpm -r build"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vitest": "^1.2.1",
    "@vitest/coverage-v8": "^1.2.1",
    "eslint": "^8.56.0",
    "eslint-plugin-functional": "^6.0.0",
    "dependency-cruiser": "^16.0.0",
    "type-fest": "^4.10.1",
    "fp-ts": "^2.16.0"
  }
}
```

## 3) `dependency-cruiser.cjs` rules (target)

- forbid `core -> adapters`
- forbid `core/domain -> core/ports`
- forbid `adapters/driven/X -> adapters/driven/Y`

## 4) `.eslintrc.cjs` functional rules (target)

- `functional/no-let`
- `functional/immutable-data`
- `functional/prefer-readonly-type`
- `@typescript-eslint/no-explicit-any`
- project rule to ban `unknown` usage except tightly-scoped decode boundaries with explicit refinement

## 5) `vitest.config.ts` quality gate (target)

Coverage thresholds:
- statements: 100
- branches: 100
- functions: 100
- lines: 100

## 6) Runtime/deployment target

- Backend: Fastify on Node 20
- DB: PostgreSQL (adapter-owned)
- Frontend: React SPA via Vite
- Package manager: pnpm


## 7) Test directory conventions

- Co-locate tests with source under `src` using suffixes:
  - `*.test.ts` (unit)
  - `*.contract.test.ts` (port/adapter contracts)
  - `*.integration.test.ts` (integration)
- If browser/system E2E is added later, use root `tests/e2e`.
- Coverage includes all package `src` trees.
