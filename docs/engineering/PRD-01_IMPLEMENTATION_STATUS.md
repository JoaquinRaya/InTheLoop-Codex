# PRD-01 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-01 versus what remains pending.

## Implemented in code

1. **No identity/correlation fields in response payload validation path**
   - `validateResponsePayload` rejects prohibited identity/correlation keys (`employee_id`, `device_id`, `request_id`, `ip`, etc.).
2. **Strict response field allowlist**
   - Payload is rejected when unknown fields are present.
3. **Data-minimized response shape**
   - Accepted payload model maps to: question ID, normalized score, optional comment, manager email, role, level, survey day.
4. **Response-path metadata redaction helper**
   - `redactResponsePathMetadata` removes prohibited identity/correlation keys from log event objects.
5. **Trust-assurance decision logic for verification disclosure**
   - `determineTrustAssurance` evaluates build provenance completeness, expected-vs-runtime build hash match, and runtime attestation status to drive reduced-assurance disclosure requirements.
6. **Build provenance metadata completeness validation**
   - `validateBuildProvenanceMetadata` checks commit/build/config/source/build-instruction fields required for user-verifiable provenance.
7. **Application-layer participation/response unlinkability artifact split**
   - `createUnlinkableSubmissionArtifacts` validates response payloads, validates participation metadata, and rejects non-allowlisted shared fields that would make participation and response artifacts linkable.
8. **Version endpoint response policy wiring (adapter)**
   - `buildVersionEndpointResponse` exposes commit/build/config metadata plus trust-assurance state and a reduced-assurance disclosure string when required.
9. **Employee transparency panel model wiring (adapter)**
   - `createTransparencyPanelModel` composes user-inspectable outbound payload preview, trust assurance level, and source repository link.
10. **Response-path recursive log sanitization (adapter)**
    - `sanitizeResponsePathLogEvent` removes identity/correlation keys and IP-related metadata patterns from nested log objects.

## Covered by tests

- prohibited identity/correlation key rejection
- unknown field rejection
- missing required field rejection
- score-range rejection
- optional comment mapping
- prohibited key list assertions
- response-path metadata redaction assertions
- build provenance completeness validation
- assurance downgrade reasons (`MISSING_BUILD_PROVENANCE`, `BUILD_HASH_MISMATCH`, `ATTESTATION_UNAVAILABLE`, `ATTESTATION_FAILED`)
- unlinkable artifact split with failure cases for invalid response, prohibited participation metadata, and shared-field linkability
- adapter version endpoint trust disclosure mapping
- adapter transparency panel composition
- adapter recursive log sanitization

## Remaining gaps for production deployment

1. **Runtime wiring to actual server/client process boundaries**
   - adapter functions are implemented and tested, but production Fastify/React integration and HTTP/browser contract tests are still required.
2. **Independent reviewer package and deployment attestation evidence publishing**
   - deployment process, key management, and externally verifiable attestation artifacts must be wired in CI/CD and documented.
