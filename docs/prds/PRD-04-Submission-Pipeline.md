# PRD-04: Anonymous Submission Pipeline

## Goal
Submit responses with strong unlinkability and low metadata leakage.

## Payload
- question_id
- normalized_score (1-100)
- optional_comment
- manager_email
- role
- level
- survey_day (coarse date)

## Pipeline controls
- Client-side randomized send delay.
- Server-side batching and random shuffle before persistence.
- No identity-bound auth material in response payload path.

## Logging policy
- Do not persist raw IP/application-layer request identifiers in survey-response storage path.
- Operational logs must exclude payload-level correlators.

## Integrity tradeoff
Duplicate prevention is local-only in v1 by design to preserve privacy; abuse resistance is intentionally limited.
