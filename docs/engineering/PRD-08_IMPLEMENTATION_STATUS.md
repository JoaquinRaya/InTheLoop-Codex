# PRD-08 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-08 versus what remains pending.

## Implemented in code

1. **Version endpoint exposes verification metadata**
   - `buildVersionEndpointResponse` now emits commit hash, runtime build hash, expected build hash, build/hash match flag, build time, config schema version, source repository URL, and reproducible build instructions URL.
2. **Published artifact hashes per deployed version**
   - Version response includes published hash references for runtime server binary, policy bundle, and build provenance digest.
3. **Runtime attestation transparency with fallback disclosure**
   - Version response includes runtime attestation status plus a plain-language explanation.
   - Raw attestation report download URL is exposed when available, or explicitly reported unavailable.
4. **Employee-facing transparency panel wiring**
   - `createTransparencyPanelModel` includes build/source links, expected-vs-runtime hash comparison fields, attestation explanation/report link, and published artifact hash values.
5. **Employee-facing transparency UI rendering**
   - `renderTransparencyPanelComponent` renders source/build links, hash comparison, attestation status + explanation, attestation report link/fallback text, and artifact hashes.

## Covered by tests

- verified and reduced-assurance version response mapping
- expected-vs-runtime hash comparison fields in version output
- attestation explanation and report download URL mapping
- transparency model mapping of verification fields and links
- transparency component rendering of hash comparison, artifact hashes, and attestation report controls

## Remaining gaps for production deployment

- No additional PRD-08 scope gaps remain in this repository-level implementation.
