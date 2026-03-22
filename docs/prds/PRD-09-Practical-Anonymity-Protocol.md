# PRD-09: Practical Anonymity Protocol

## Goal
Define a deployable v1 protocol that provides strong practical anonymity with operational simplicity.

## Design
- Client constructs response envelope locally.
- Envelope is encrypted before transit.
- Submission timing is randomized.
- Server batches and shuffles processing.

## Guarantee level
Strong practical unlinkability at app/data layers, but not formal cryptographic anonymity against all correlation channels.

## Intended use
Initial production rollout with clear disclosure of residual risks.
