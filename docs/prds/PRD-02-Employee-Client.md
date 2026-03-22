# PRD-02: Employee Client Application

## Goal
Deliver exactly one daily survey prompt at login with local privacy-preserving state.

## Core behavior
- Trigger after employee sign-in on company computer.
- Show at most one question per local day.
- If user skips, day is finalized.
- No catch-up for missed days.

## Local state
- `last_answered_day`
- cached `manager_email`, `role`, `level`

## UX requirements
- Multiple choice, single select
- Optional comment when enabled
- Skip always available
- Delay option allowed (same day only)

## Transparency
Client must show:
- exact outbound payload (human-readable)
- encryption/packaging status
- server version + attestation status + source link

## Constraint
Implementation must remain TypeScript-only for client and service ecosystem consistency.
