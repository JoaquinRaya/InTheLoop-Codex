# In The Loop — Product Documentation Set

This folder consolidates the PRD and implementation references described in the planning conversation, with corrections and explicit trust constraints.

## Language strategy (updated)

To maximize user verifiability and reduce audit complexity, the system should be implemented in a **single primary language: TypeScript** across client and server components.

- No custom cryptography is allowed.
- Only vetted cryptographic libraries and platform primitives may be used.
- Trust-critical modules must follow strict coding and dependency rules documented in `artifacts/SECURITY_CLAIMS.md`.

## Structure

- `prds/PRD-01` … `PRD-10`: feature-scoped PRDs
- `artifacts/`: cross-cutting security/trust artifacts
- `engineering/`: implementation guardrails, monorepo specs, and TDD rules

## Engineering policy

Hexagonal ports-and-adapters plus red-green-refactor-document TDD are formalized here:
- `engineering/IMPLEMENTATION_GUARDRAILS.md`
- `engineering/MONOREPO_TECH_SPEC.md`

## Important caveat

Absolute anonymity claims are only valid under the assumptions in `artifacts/TRUST_BOUNDARIES.md` and `artifacts/SECURITY_CLAIMS.md`.
