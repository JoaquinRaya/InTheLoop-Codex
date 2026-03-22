# TRUST_BOUNDARIES

## Actors
- Employee client
- Survey API plane
- Scheduling service
- Aggregation service
- Dashboard service
- Build/signing pipeline

## Boundary principles
- Identity context must never enter response aggregation storage.
- Response submission path and analytics path must stay logically separated.
- Tenant data must be isolated by tenant-scoped keys and storage partitions.

## Assumptions to declare
- Cryptographic primitives remain unbroken.
- Build provenance and signature keys are protected.
- Attestation verifier trusts configured roots.

## Non-collusion statement (must be explicit in production)
If strong anonymity depends on split control planes, required non-collusion relationships must be published to users.
