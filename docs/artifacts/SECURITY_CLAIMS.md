# SECURITY_CLAIMS

## Claim taxonomy
1. **Implemented Control**: present in code and validated in tests.
2. **Assumption**: external condition required for guarantee.
3. **Accepted Risk**: known gap intentionally retained.

## Current target claims
- Response records do not contain direct user/device identifiers.
- Dashboard output is threshold-gated.
- Source/build metadata is published for user inspection.

## Prohibited claim language
Do not claim "impossible" or "absolute" unless assumptions and verification evidence are explicitly shown.

## Evidence required per claim
- design reference
- code reference
- test reference
- runtime verification reference
