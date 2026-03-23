# PRD-11 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-11 versus what remains pending.

## Implemented in code

1. **Reusable prompt rendering and action orchestration primitives**
   - Existing web-ui adapters provide prompt presentation, submit/skip handling, and transparency rendering primitives that can be reused by a desktop thin client implementation.
2. **Reusable transparency/trust model components**
   - Version/trust-assurance contracts and transparency panel model/component already expose build hash comparison, attestation status, and source/build links required by PRD-11.
3. **Reusable submission-path privacy controls**
   - Response payload validation, unlinkable artifact construction, and submission-pipeline controls are implemented in core/application modules and can be reused by the thin client flow.
4. **One-shot login thin-client flow adapter**
   - `runLoginTriggeredThinClient` now implements a one-shot flow that:
     - performs exactly one prompt fetch
     - exits immediately if no prompt is available
     - conditionally renders prompt UI
     - handles answered/skipped outcomes
     - submits outcome through an injected transport callback
     - exits after submission/failure
5. **PRD-11 login-flow behavior tests**
   - Dedicated tests now cover:
     - single-fetch/no-prompt immediate exit
     - answered flow submission path
     - validation failure path (no option selected)
     - submission-failure exit path
6. **Executable one-shot desktop runtime entrypoint**
   - Runtime command now executes the thin-client flow as a process (`start:desktop-login`) with real API fetch/submit wiring.
   - Prompt fetch uses `/employee/prompt`; trust metadata fetch uses `/version`; answered submissions post to `/employee/score`.
   - Runtime now supports an interactive prompt mode that serves a local UI and waits for real answer/skip user actions before submission.
7. **Version metadata endpoint for trust UI**
   - Runtime server now exposes `/version` using env-backed provenance/attestation metadata and existing trust-assurance response mapping.
8. **Installer startup artifact templates**
   - Installer-facing startup templates now exist for:
     - macOS LaunchAgent
     - Windows per-user Run registration script
     - Linux XDG autostart desktop entry
9. **Process-level e2e validation with real Postgres**
   - New e2e test boots runtime server + real Postgres, runs desktop client as a child process, interacts with the prompt UI, submits a response, and verifies persisted `response_scores` row data in database.

## Covered by tests

- prompt interaction model constraints (single-select, optional comment, skip behavior, delay affordance rules)
- transparency panel rendering and reduced-assurance disclosure behavior
- payload validation and unlinkable artifact generation rules
- submission-pipeline randomized delay and correlator sanitization controls
- one-shot login thin-client fetch/render/submit/exit semantics
- one-shot runtime process integration against real API and database persistence

## Remaining gaps for production deployment

1. **Installer packaging hook-up**
   - Startup templates exist, but installer pipelines (MSI/pkg/deb/rpm/app bundle) still need to copy/register these artifacts automatically in release packaging.
2. **Native desktop window shell**
   - Current interactive mode serves a local prompt UI endpoint.
   - A production native desktop-window wrapper still needs to be wired for packaged app UX on macOS/Windows/Linux.
3. **Desktop packaging and distribution path**
   - Repository currently has no desktop packaging/signing flow for macOS/Windows/Linux client distribution.
4. **Installer/runtime integration tests**
   - No cross-platform tests currently verify real login auto-start registration and one-shot process launch from installed startup entries.
