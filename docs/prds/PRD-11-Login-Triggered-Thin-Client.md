# PRD-11: Login-Triggered Thin Client

## Goal
Deliver a very thin installed employee client that runs once at user login, fetches whether a question is available, displays the question only when available, submits the answer, and exits immediately.

## Product principles
1. Thin client only: display question, collect answer, submit response, exit.
2. Login-triggered only: no background daemon, no polling loop, no tray process.
3. Privacy-first: preserve unlinkability and data minimization constraints from PRD-01/04/09/10.
4. Trust-visible: keep employee-verifiable server/build/runtime checks from PRD-08.

## Core behavior
1. Client process starts automatically at OS login.
2. Client performs exactly one fetch to determine prompt availability for the current local day.
3. If no prompt is available, the client exits immediately.
4. If a prompt is available, the client renders minimal UI for:
   - single-select answer
   - optional comment (when question allows)
   - skip action
5. On submit or skip, client sends response through existing anonymous submission path.
6. Client shows trust/transparency panel before submission confirmation.
7. Client exits after completion (or after non-recoverable error with user-visible message).

## Explicitly accepted behavior
- If users remain logged in for multiple days without a new login event, no new prompt is shown until the next login.
- This is acceptable by design for this PRD.

## Startup and installer requirements

### macOS
- Installer must install the app under `/Applications`.
- Installer must register login auto-start using LaunchAgent plist.
- LaunchAgent registration must be created by installer and not require manual user setup.

### Windows
- Installer must register per-user login auto-start using OS startup mechanism (Run key or Startup folder shortcut).
- Startup registration must be created by installer and not require manual user setup.
- Client must not require a tray icon/process for normal operation.

### Linux
- Installer must install desktop-session auto-start entry via XDG autostart `.desktop` file.
- Auto-start entry must be created by installer and not require manual user setup.

## Non-goals
- No always-on background service.
- No periodic polling or long-lived socket connection.
- No non-survey desktop features.
- No local analytics dashboard surface.

## Privacy and anonymity requirements
1. No identity-bound auth material or device identifiers may be attached to response payload path.
2. Response payload remains data-minimized as defined in PRD-04.
3. No persistent client-generated correlation key across submissions.
4. Client logging must exclude response payload correlators and direct identifiers.
5. Client must preserve local-only daily finalization semantics (including skip finalization and no catch-up).

## Trust and verification requirements
1. Client must expose the exact outbound payload preview before submission completion.
2. Client must display packaging/encryption status used for the outgoing submission.
3. Client must display server verification signals:
   - version/build identifiers
   - expected vs observed hash comparison status
   - runtime attestation status with clear reduced-assurance disclosure when not verified
4. Client must provide source/build reference links needed for user verification.
5. Claim language in product UI/docs must remain assumption-bounded and must not claim absolute guarantees.

## Error handling and resilience
1. Network failure during initial fetch:
   - show minimal error state
   - allow user to close
   - process exits
2. Submission failure:
   - show explicit failure state with retry action in the same session
   - if user closes without success, process exits (no background retry worker in this PRD)
3. Invalid or unverifiable trust metadata:
   - continue functioning
   - downgrade assurance display and explain reason

## Security constraints
1. TypeScript-only implementation posture remains in effect.
2. No bespoke cryptography in client code.
3. Only vetted platform/runtime cryptographic primitives and approved libraries may be used.

## API contract expectations (client-facing)
1. One endpoint to fetch prompt availability for login moment (question or no-question response).
2. One endpoint to submit answer/skip outcome through unlinkable submission path.
3. One endpoint (or embedded response fields) to provide trust/version/attestation metadata for transparency UI.

## Acceptance criteria
1. On macOS, Windows, and Linux, installer configures startup successfully for a standard user account.
2. After login, client starts automatically and performs exactly one prompt-availability fetch.
3. When no question is available, process exits without persistent background presence.
4. When question is available, user can answer/skip and submit successfully.
5. Client process exits after completion.
6. Transparency panel shows payload + packaging + trust verification fields required by PRD-08.
7. Privacy constraints remain compliant with PRD-01/04/09/10 and corresponding tests/docs.

## Dependencies
- PRD-01 Trust & Anonymity Foundation
- PRD-02 Employee Client
- PRD-04 Anonymous Submission Pipeline
- PRD-08 Verification & Transparency
- PRD-09 Practical Anonymity Protocol
- PRD-10 Strong Anonymity Protocol
