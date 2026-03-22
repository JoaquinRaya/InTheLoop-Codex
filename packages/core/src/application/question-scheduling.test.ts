import { describe, expect, it } from 'vitest';
import { left, right, isLeft, isRight } from '../domain/either.js';
import { createTenantWorkCalendarPolicy } from './work-calendar-policy.js';
import {
  createEmptyQuestionSelectionState,
  selectAndPersistQuestionForEmployeeMoment,
  selectQuestionForEmployeeMoment,
  type ScheduledQuestion
} from './question-scheduling.js';

const workingDayPolicy = {
  isWorkingDay: () => true
};

const baseQuestion = (overrides: Partial<ScheduledQuestion>): ScheduledQuestion => ({
  id: 'q-default',
  createdAt: '2026-03-01T00:00:00.000Z',
  text: 'How was your day?',
  category: 'engagement',
  tags: ['default'],
  options: ['1', '2', '3'],
  points: 10,
  allowComments: true,
  schedule: { type: 'queue' },
  ...overrides
});

describe('question scheduling', () => {
  it('prioritizes specific-date schedules over recurring and queue', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T19:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({ id: 'q-queue', schedule: { type: 'queue' } }),
        baseQuestion({
          id: 'q-recurring',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        }),
        baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-22' } })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selected.right.question?.id).toBe('q-specific');
    }
  });

  it('supports timezone-aware local day derivation from UTC timestamp', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-01T00:30:00.000Z', timeZone: 'America/Los_Angeles' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-02-28' } })],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selected.right.localDate).toBe('2026-02-28');
      expect(selected.right.question?.id).toBe('q-specific');
    }
  });

  it('supports month-interval recurrence and clamps to month end when needed', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-02-28T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-monthly',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-31',
            rule: { kind: 'interval-months', intervalMonths: 1 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selected.right.question?.id).toBe('q-monthly');
    }
  });

  it('supports nth-weekday and last-weekday recurring rules', () => {
    const thirdTuesday = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-17T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-third-tuesday',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            rule: { kind: 'nth-weekday-of-month', nth: 3, weekday: 2 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(thirdTuesday)).toBe(true);
    if (isRight(thirdTuesday)) {
      expect(thirdTuesday.right.question?.id).toBe('q-third-tuesday');
    }

    const lastWednesday = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-25T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-last-wednesday',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            rule: { kind: 'last-weekday-of-month', weekday: 3 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(lastWednesday)).toBe(true);
    if (isRight(lastWednesday)) {
      expect(lastWednesday.right.question?.id).toBe('q-last-wednesday');
    }
  });

  it('for recurring ties selects longest recurrence window first', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-weekly',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        }),
        baseQuestion({
          id: 'q-biweekly',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-08',
            rule: { kind: 'interval-days', intervalDays: 14 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selected.right.question?.id).toBe('q-biweekly');
    }
  });

  it('uses most recent createdAt and then alphabetical id as tie-breakers', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-b',
          createdAt: '2026-03-21T10:00:00.000Z',
          schedule: { type: 'specific-date', date: '2026-03-22' }
        }),
        baseQuestion({
          id: 'q-a',
          createdAt: '2026-03-21T10:00:00.000Z',
          schedule: { type: 'specific-date', date: '2026-03-22' }
        }),
        baseQuestion({
          id: 'q-most-recent',
          createdAt: '2026-03-21T11:00:00.000Z',
          schedule: { type: 'specific-date', date: '2026-03-22' }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selected.right.question?.id).toBe('q-most-recent');
    }
  });

  it('supports suppression windows and queue global consumption', () => {
    const initial = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-suppressed',
          schedule: { type: 'specific-date', date: '2026-03-22' },
          suppressionWindows: [{ startDate: '2026-03-20', endDate: '2026-03-25' }]
        }),
        baseQuestion({ id: 'q-queue-1', createdAt: '2026-03-21T09:00:00.000Z', schedule: { type: 'queue' } }),
        baseQuestion({ id: 'q-queue-2', createdAt: '2026-03-21T08:00:00.000Z', schedule: { type: 'queue' } })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(initial)).toBe(true);
    if (!isRight(initial)) {
      return;
    }

    expect(initial.right.question?.id).toBe('q-queue-1');
    expect(initial.right.nextState.consumedQueueQuestionIds).toEqual(['q-queue-1']);

    const second = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-23T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({ id: 'q-queue-1', createdAt: '2026-03-21T09:00:00.000Z', schedule: { type: 'queue' } }),
        baseQuestion({ id: 'q-queue-2', createdAt: '2026-03-21T08:00:00.000Z', schedule: { type: 'queue' } })
      ],
      initial.right.nextState,
      workingDayPolicy
    );

    expect(isRight(second)).toBe(true);
    if (isRight(second)) {
      expect(second.right.question?.id).toBe('q-queue-2');
      expect(second.right.nextState.consumedQueueQuestionIds).toEqual(['q-queue-1', 'q-queue-2']);
    }
  });

  it('returns no question on non-working days based on tenant holiday/weekend policy', () => {
    const calendarPolicy = createTenantWorkCalendarPolicy({
      workingWeekdays: [1, 2, 3, 4, 5],
      holidays: ['2026-03-23']
    });

    const weekend = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-22' } })],
      createEmptyQuestionSelectionState(),
      calendarPolicy
    );

    expect(isRight(weekend)).toBe(true);
    if (isRight(weekend)) {
      expect(weekend.right.question).toBeNull();
    }

    const holiday = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-23T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-23' } })],
      createEmptyQuestionSelectionState(),
      calendarPolicy
    );

    expect(isRight(holiday)).toBe(true);
    if (isRight(holiday)) {
      expect(holiday.right.question).toBeNull();
    }
  });

  it('validates schedule metadata and rejects invalid configurations', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-invalid',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: '2026-02-01',
            rule: { kind: 'interval-days', intervalDays: 0 }
          },
          suppressionWindows: [{ startDate: '2026-03-25', endDate: '2026-03-20' }]
        }),
        baseQuestion({
          id: 'q-invalid-month',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            rule: { kind: 'interval-months', intervalMonths: 0 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left.map((error) => error.code)).toEqual([
        'INVALID_DATE_RANGE',
        'INVALID_INTERVAL_DAYS',
        'INVALID_DATE_RANGE',
        'INVALID_INTERVAL_MONTHS'
      ]);
    }
  });

  it('returns a validation error for invalid timezone', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'Nope/Invalid' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-22' } })],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left[0]?.code).toBe('INVALID_TIMEZONE');
    }
  });

  it('persists queue-consumption state through storage port using optimistic concurrency', () => {
    let state = createEmptyQuestionSelectionState();
    let version = 2;

    const persisted = selectAndPersistQuestionForEmployeeMoment(
      'tenant-a',
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-queue-1', schedule: { type: 'queue' } })],
      {
        loadState: () => ({ state, version }),
        saveState: (_tenantId, nextState, expectedVersion) => {
          if (expectedVersion !== version) {
            return left('VERSION_CONFLICT');
          }

          state = nextState;
          version += 1;
          return right(version);
        }
      },
      workingDayPolicy
    );

    expect(isRight(persisted)).toBe(true);
    if (isRight(persisted)) {
      expect(persisted.right.question?.id).toBe('q-queue-1');
    }

    expect(state.consumedQueueQuestionIds).toEqual(['q-queue-1']);
  });

  it('returns VERSION_CONFLICT when concurrent state update wins', () => {
    const persisted = selectAndPersistQuestionForEmployeeMoment(
      'tenant-a',
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-queue-1', schedule: { type: 'queue' } })],
      {
        loadState: () => ({ state: createEmptyQuestionSelectionState(), version: 4 }),
        saveState: () => left('VERSION_CONFLICT')
      },
      workingDayPolicy
    );

    expect(isLeft(persisted)).toBe(true);
    if (isLeft(persisted)) {
      expect(persisted.left[0]?.code).toBe('VERSION_CONFLICT');
    }
  });
});
