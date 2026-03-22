# PRD-03 Implementation Status (Current Repository State)

This document records what is currently implemented for PRD-03 versus what remains pending.

## Implemented in code

1. **Deterministic per-day question selection service**
   - `selectQuestionForEmployeeMoment` chooses one question for a given employee moment and derives local date using timezone context.
2. **Schedule priority order**
   - Selection applies priority `specific-date > recurring > queue`.
3. **Recurring rules with complex expressions**
   - Recurring schedules support:
     - interval-days (`every N days`)
     - interval-months (`every N months`, with month-end clamping)
     - nth weekday of month (e.g., third Tuesday)
     - last weekday of month (e.g., last Wednesday)
4. **Global tie-breakers**
   - Candidate ties use most recent `createdAt`, then alphabetical `id`.
5. **Suppression windows**
   - Questions are excluded on dates inside configured suppression ranges.
6. **Timezone and tenant working-day policy integration**
   - Selection derives `localDate` from UTC timestamp + IANA timezone and evaluates tenant `isWorkingDay(localDate, timeZone)` policy.
   - Helper `createTenantWorkCalendarPolicy` supports configurable working weekdays and explicit holiday dates.
7. **Queue global-consumption with optimistic concurrency**
   - Queue selections append IDs to `consumedQueueQuestionIds`.
   - Durable load/save integration uses a versioned storage port and returns `VERSION_CONFLICT` on concurrent write races.
8. **Schedule metadata validation**
   - Runtime validation rejects invalid dates, invalid date ranges, and invalid recurrence configurations.
9. **Hexagonal ports for scheduling flows**
   - Dedicated driving/driven ports are implemented for scheduling orchestration and persistence boundaries.
10. **Authoring/API contract adapter**
   - REST authoring payload normalization is implemented with snake_case input support and validation mapping to core schedule rules.
11. **Storage adapter implementation for scheduling state**
   - A versioned storage adapter implements the driven state port and enforces optimistic concurrency.

## Covered by tests

- specific-date priority over recurring and queue
- timezone-aware local-day derivation from UTC timestamp
- complex recurring rules: interval-months, third Tuesday, and last Wednesday
- recurring longest-window precedence
- tie-break behavior for `createdAt` then `id`
- suppression-window filtering
- non-working-day behavior for weekends and configured holidays
- invalid schedule metadata rejection (including invalid interval-months)
- invalid timezone rejection
- optimistic-concurrency persistence success and version-conflict failure
- authoring payload normalization + validation error mapping
- versioned storage adapter load/save + stale-write conflict

## Remaining gaps for production deployment

- No additional PRD-03 scope gaps remain in this repository-level implementation.
