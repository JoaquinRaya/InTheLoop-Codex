# Admin UI And Options Model Migration (2026-03-23)

## Summary

This update converts the runtime admin from a JSON-oriented harness into a production-style admin workflow, while also migrating question options from primitive strings to structured objects.

## Key changes

1. Admin UI architecture
- Split runtime page renderers into separate files:
  - `packages/adapters/src/runtime/admin-ui-page.ts`
  - `packages/adapters/src/runtime/people-dashboard-page.ts`
- `server.ts` now imports each page independently.

2. Admin authoring UX
- Questions screen now supports:
  - search
  - sort
  - add
  - edit
  - delete
- Question ID is no longer editable in the UI.
- IDs are server-generated on create.

3. Rich editor controls
- Tags:
  - chip-based add/remove UI
  - no CSV authoring
- Options:
  - object-based option builder (`text` + `points`)
  - add/remove
  - drag-and-drop ordering
  - in-place editing for both text and points

4. Preview UX
- Preview now renders an end-user style answer interface:
  - question text
  - selectable options
  - optional comment field when enabled
  - preview submit button (disabled)
- Replaced raw JSON-only preview with UI rendering.

5. Question options domain model migration
- Core model changed from:
  - `options: string[]`
- To:
  - `options: { text: string; points: number }[]`
- This is now end-to-end through:
  - core scheduling model
  - REST authoring contract
  - runtime admin UI payloads
  - e2e fixtures/tests

6. Runtime API updates
- Added single-question create endpoint with server-generated IDs:
  - `POST /admin/questions/single`
- Updated update semantics:
  - `PUT /admin/questions/:questionId` enforces route ID as source of truth.

## Validation

Validated on this branch with:

- `pnpm -r build`
- `pnpm lint`
- `pnpm e2e`

All passing.

