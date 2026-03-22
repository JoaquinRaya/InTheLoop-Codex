# PRD-02 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-02 versus what remains pending.

## Implemented in code

1. **Login-time daily prompt decisioning**
   - `resolveLoginPromptDecision` determines whether to show the daily survey prompt immediately after sign-in.
2. **At-most-one finalized prompt per local day**
   - Prompt display is blocked for a local day when that day is already finalized in client-local state.
3. **Skip finalizes the day**
   - `applyDailyPromptOutcome` marks the local day as completed for `skipped` outcomes.
4. **No catch-up behavior for missed days**
   - Decisioning only evaluates the current local day and does not generate retroactive prompts for missed dates.
5. **Local profile cache for payload context**
   - Local state captures a cached profile snapshot (`managerEmail`, `role`, `level`) at login.
6. **Delay is same-day non-finalizing behavior**
   - `delayed` outcome leaves the day unfinalized so the same day can still present the prompt later.
7. **Prompt interaction presentation rules + UI component**
   - A web-UI presentation model enforces single-select input, optional comments, always-available skip, and same-day-only delay affordance.
   - A UI component renderer is implemented to output question options, optional comments, and submit/skip/delay controls.
8. **Transparency packaging + verification surface model + UI component**
   - Transparency model includes outbound payload preview, packaging/encryption status, server version hashes, runtime attestation status, and source link.
   - A UI component renderer is implemented to surface packaging, assurance, version/attestation, source link, and payload preview fields.
9. **Headless app wiring flow for login/action handling**
   - A web-ui app orchestrator wires login decisioning, local-state persistence, prompt component rendering, action handling, payload validation/packaging status derivation, and transparency panel rendering.
10. **Browser runtime helpers and durable local store adapter**
   - Browser runtime helpers now gate sign-in behavior by company-computer context and expose skip-action integration helpers.
   - A browser local-state store adapter now serializes/deserializes daily-prompt state to durable storage APIs (`getItem`/`setItem`).
11. **Packaging signal plumbing input**
   - Action handling now accepts explicit packaging pipeline runtime signals and maps them into user-facing packaging status for transparency.

## Covered by tests

- prompt shown when local day is not yet finalized
- skip path blocks second prompt for that same local day
- missed days do not trigger catch-up prompts
- delayed outcome does not finalize the day
- login updates cached manager/role/level profile snapshot
- single-select/optional-comment/skip prompt presentation constraints
- same-day-only delay affordance
- prompt UI component rendering for controls and delay enabled/disabled state
- transparency panel packaging status + version/attestation fields
- rejected payload handling in transparency payload preview
- transparency UI component rendering including reduced-assurance disclosure handling
- app-level login/action wiring with state persistence and packaging status derivation
- browser runtime sign-in gating + skip helper integration
- durable local-state storage serialization/deserialization adapter
- packaging pipeline signal mapping into transparency status

## Remaining gaps for production deployment

1. **Framework-level mounting**
   - The repository now includes renderers and browser runtime helpers, but direct integration into a concrete React/Vite route tree is still a packaging step outside these adapter modules.
2. **Production cryptography backend hookup**
   - Packaging signal input plumbing is implemented, but runtime signal producers (from production crypto transport pipeline) still need to be connected by the hosting app.
