# PRD-10: Strong Anonymity Protocol

## Goal
Define the high-assurance target protocol for cryptographic unlinkability and stronger malicious-operator resistance.

## Core requirements
- Cryptographic anonymity properties must be stated as computational guarantees under explicit assumptions.
- Runtime verification must bind deployed binary and policy to published artifacts.
- Trust boundaries and non-collusion assumptions must be explicit and user-visible.

## Implementation posture (single-language update)
- Primary implementation language remains TypeScript for maintainability and user-audit simplicity.
- Cryptographic operations must rely on vetted primitives/libraries only.
- No bespoke cryptography in application code.

## Ship criteria
Protocol is not eligible for "mathematically strong" product claims until the `artifacts/` documents are complete and implemented controls pass independent review.
