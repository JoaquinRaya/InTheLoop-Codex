# PRD-07 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-07 versus what remains pending.

## Implemented in code

1. **Admin authoring targeting model**
   - `AdminAuthoringQuestion` now includes explicit audience targeting for whole company, manager subtree, or arbitrary group.
2. **Editing policy: immutable after first display event**
   - `canEditAdminAuthoringQuestion` and `applyAdminQuestionEdit` enforce editability only before `firstDisplayedAt` is set.
3. **First-display lifecycle recording**
   - `recordQuestionFirstDisplay` marks first display timestamp once and validates timestamp shape.
4. **Preview future question resolution by date/profile**
   - `previewQuestionResolutionForEmployee` applies target filtering and reuses deterministic scheduling logic to preview the resolved question.
5. **REST contract normalization for admin authoring + preview**
   - `parseAndValidateAdminAuthoringBatch` maps snake_case authoring payloads with target metadata and validates optional `first_displayed_at`.
   - `parseAdminAuthoringPreviewInput` normalizes preview request payloads into core input shape.

## Covered by tests

- immutable-after-first-display enforcement
- editable-before-display behavior
- target-aware preview resolution by manager subtree/group/company scopes
- invalid first-display timestamp rejection
- REST contract mapping for targets and preview payload normalization

## Remaining gaps for production deployment

- No additional PRD-07 scope gaps remain in this repository-level implementation.
