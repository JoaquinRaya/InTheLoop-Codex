# PRD-03: Question & Scheduling Engine

## Goal
Select one deterministic question per employee-day.

## Schedule types
1. Specific date
2. Recurring (weekly/monthly/custom interval with start/end)
3. Queue fallback

## Priority and ties
- Priority: specific date > recurring (longest interval first) > queue.
- Tie-break 1: most recently created.
- Tie-break 2: alphabetical ID.

## Additional rules
- Timezone-aware by employee/company policy.
- Workday/weekend/holiday handling is tenant-configurable.
- Suppression windows supported.
- Each question has one schedule.
- Queue is globally consumed.

## Question model
Text, category (single), tags (multi), option list, configurable points, allow comments, schedule metadata.
