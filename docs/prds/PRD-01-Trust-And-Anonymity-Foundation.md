# PRD-01: Trust & Anonymity Foundation

## Goal
Guarantee unlinkability between employee identity and survey participation/response, with transparent, user-verifiable controls.

## Non-negotiables
1. No identity-bound identifier may be attached to response payloads.
2. Participation and response must be unlinkable at the application layer.
3. The system must publish source and build provenance for verification.
4. If runtime equivalence cannot be proven, UI must disclose reduced assurance.

## Accepted exceptions (explicit)
- Verbatim comments may self-identify an employee.
- Filter differencing/inference attacks are accepted in v1.

## Data minimization
Allowed per response: question ID, normalized score (1-100), optional comment, manager email, role, level, coarse survey day.

## Hard prohibitions
- No IP retention in application logs.
- No persistent user/device ID tied to response records.
- No correlation keys across submissions.

## Success criteria
- Independent reviewers can reproduce documented anonymity claims.
- Users can inspect code and payload composition from product UI.
