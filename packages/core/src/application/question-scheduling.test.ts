import { describe, expect, it } from 'vitest';
import { left, right, isLeft, isRight } from '../domain/either.js';
import { none, some, type Option } from '../domain/option.js';
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

const selectedQuestionId = (question: Option<ScheduledQuestion>): string | null =>
  question._tag === 'Some' ? question.value.id : null;

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
  suppressionWindows: [],
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
            endDate: none(),
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
      expect(selectedQuestionId(selected.right.question)).toBe('q-specific');
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
      expect(selectedQuestionId(selected.right.question)).toBe('q-specific');
    }
  });



  it('does not select recurring schedules before startDate or after endDate', () => {
    const beforeStart = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-02-28T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-recurring-windowed',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: some('2026-03-31'),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(beforeStart)).toBe(true);
    if (isRight(beforeStart)) {
      expect(selectedQuestionId(beforeStart.right.question)).toBeNull();
    }

    const afterEnd = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-04-01T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-recurring-windowed',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: some('2026-03-31'),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(afterEnd)).toBe(true);
    if (isRight(afterEnd)) {
      expect(selectedQuestionId(afterEnd.right.question)).toBeNull();
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
            endDate: none(),
            rule: { kind: 'interval-months', intervalMonths: 1 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBe('q-monthly');
    }
  });



  it('does not select recurring candidates when nth weekday mismatches or interval-month cadence is not due', () => {
    const nthMismatch = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-16T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-nth-mismatch',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            endDate: none(),
            rule: { kind: 'nth-weekday-of-month', nth: 3, weekday: 2 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(nthMismatch)).toBe(true);
    if (isRight(nthMismatch)) {
      expect(selectedQuestionId(nthMismatch.right.question)).toBeNull();
    }

    const intervalMonthsNotDue = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-02-28T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-interval-months-not-due',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-31',
            endDate: none(),
            rule: { kind: 'interval-months', intervalMonths: 2 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(intervalMonthsNotDue)).toBe(true);
    if (isRight(intervalMonthsNotDue)) {
      expect(selectedQuestionId(intervalMonthsNotDue.right.question)).toBeNull();
    }
  });



  it('does not select last-weekday recurring rule when weekday does not match', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-24T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-last-weekday-mismatch',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            endDate: none(),
            rule: { kind: 'last-weekday-of-month', weekday: 3 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBeNull();
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
            endDate: none(),
            rule: { kind: 'nth-weekday-of-month', nth: 3, weekday: 2 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(thirdTuesday)).toBe(true);
    if (isRight(thirdTuesday)) {
      expect(selectedQuestionId(thirdTuesday.right.question)).toBe('q-third-tuesday');
    }

    const lastWednesday = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-25T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-last-wednesday',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            endDate: none(),
            rule: { kind: 'last-weekday-of-month', weekday: 3 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(lastWednesday)).toBe(true);
    if (isRight(lastWednesday)) {
      expect(selectedQuestionId(lastWednesday.right.question)).toBe('q-last-wednesday');
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
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        }),
        baseQuestion({
          id: 'q-biweekly',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-08',
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 14 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBe('q-biweekly');
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
      expect(selectedQuestionId(selected.right.question)).toBe('q-most-recent');
    }
  });



  it('uses createdAt/id tie-breakers when recurring priority is equal', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-15T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-recurring-b',
          createdAt: '2026-03-10T10:00:00.000Z',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        }),
        baseQuestion({
          id: 'q-recurring-a',
          createdAt: '2026-03-11T10:00:00.000Z',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBe('q-recurring-a');
    }
  });

  it('falls back to queue when no specific-date or recurring candidates are due', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-recurring-not-due',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 5 }
          }
        }),
        baseQuestion({
          id: 'q-queue-fallback',
          createdAt: '2026-03-21T10:00:00.000Z',
          schedule: { type: 'queue' }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBe('q-queue-fallback');
      expect(selected.right.nextState.consumedQueueQuestionIds).toEqual(['q-queue-fallback']);
    }
  });



  it('orders recurring candidates across interval-months, last-weekday, and nth-weekday priorities', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-25T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-interval-months',
          createdAt: '2026-03-20T10:00:00.000Z',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-25',
            endDate: none(),
            rule: { kind: 'interval-months', intervalMonths: 1 }
          }
        }),
        baseQuestion({
          id: 'q-last-weekday',
          createdAt: '2026-03-21T10:00:00.000Z',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            endDate: none(),
            rule: { kind: 'last-weekday-of-month', weekday: 3 }
          }
        }),
        baseQuestion({
          id: 'q-nth-weekday',
          createdAt: '2026-03-22T10:00:00.000Z',
          schedule: {
            type: 'recurring',
            startDate: '2026-01-01',
            endDate: none(),
            rule: { kind: 'nth-weekday-of-month', nth: 4, weekday: 3 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBe('q-last-weekday');
    }
  });

  it('rejects suppression windows with invalid date format', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-invalid-suppression-format',
          schedule: { type: 'queue' },
          suppressionWindows: [{ startDate: '2026/03/01', endDate: '2026-03-10' }]
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left[0]?.code).toBe('INVALID_DATE_FORMAT');
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

    expect(selectedQuestionId(initial.right.question)).toBe('q-queue-1');
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
      expect(selectedQuestionId(second.right.question)).toBe('q-queue-2');
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
      expect(selectedQuestionId(weekend.right.question)).toBeNull();
    }

    const holiday = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-23T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-23' } })],
      createEmptyQuestionSelectionState(),
      calendarPolicy
    );

    expect(isRight(holiday)).toBe(true);
    if (isRight(holiday)) {
      expect(selectedQuestionId(holiday.right.question)).toBeNull();
    }
  });



  it('rejects invalid specific-date and recurring startDate formats', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-invalid-specific-date',
          schedule: { type: 'specific-date', date: '03-22-2026' }
        }),
        baseQuestion({
          id: 'q-invalid-recurring-start-date',
          schedule: {
            type: 'recurring',
            startDate: '03-01-2026',
            endDate: none(),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left.map((error) => error.code)).toEqual([
        'INVALID_DATE_FORMAT',
        'INVALID_DATE_FORMAT'
      ]);
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
            endDate: some('2026-02-01'),
            rule: { kind: 'interval-days', intervalDays: 0 }
          },
          suppressionWindows: [{ startDate: '2026-03-25', endDate: '2026-03-20' }]
        }),
        baseQuestion({
          id: 'q-invalid-month',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: none(),
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



  it('rejects invalid recurring endDate format and invalid nth weekday configuration', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [
        baseQuestion({
          id: 'q-invalid-end-date-format',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: some('03-31-2026'),
            rule: { kind: 'interval-days', intervalDays: 7 }
          }
        }),
        baseQuestion({
          id: 'q-invalid-nth',
          schedule: {
            type: 'recurring',
            startDate: '2026-03-01',
            endDate: none(),
            rule: { kind: 'nth-weekday-of-month', nth: 6, weekday: 1 }
          }
        })
      ],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left.map((error) => error.code)).toEqual([
        'INVALID_DATE_FORMAT',
        'INVALID_NTH_WEEKDAY'
      ]);
    }
  });



  it('returns INVALID_DATE_FORMAT for invalid UTC timestamp input', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: 'not-a-timestamp', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-22' } })],
      createEmptyQuestionSelectionState(),
      workingDayPolicy
    );

    expect(isLeft(selected)).toBe(true);
    if (isLeft(selected)) {
      expect(selected.left[0]?.code).toBe('INVALID_DATE_FORMAT');
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



  it('returns null question when all queue candidates are already consumed', () => {
    const selected = selectQuestionForEmployeeMoment(
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-queue-1', schedule: { type: 'queue' } })],
      { consumedQueueQuestionIds: ['q-queue-1'] },
      workingDayPolicy
    );

    expect(isRight(selected)).toBe(true);
    if (isRight(selected)) {
      expect(selectedQuestionId(selected.right.question)).toBeNull();
      expect(selected.right.nextState.consumedQueueQuestionIds).toEqual(['q-queue-1']);
    }
  });

  it('returns selection validation errors without attempting persistence', () => {
    const persisted = selectAndPersistQuestionForEmployeeMoment(
      'tenant-a',
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'Nope/Invalid' },
      [baseQuestion({ id: 'q-specific', schedule: { type: 'specific-date', date: '2026-03-22' } })],
      {
        loadState: () => ({ state: createEmptyQuestionSelectionState(), version: 1 }),
        saveState: () => right(2)
      },
      workingDayPolicy
    );

    expect(isLeft(persisted)).toBe(true);
    if (isLeft(persisted)) {
      expect(persisted.left[0]?.code).toBe('INVALID_TIMEZONE');
    }
  });

  it('persists queue-consumption state through storage port using optimistic concurrency', () => {
    const stateContainer = new Map<'state', ReturnType<typeof createEmptyQuestionSelectionState>>([
      ['state', createEmptyQuestionSelectionState()]
    ]);
    const versionContainer = new Map<'version', number>([['version', 2]]);

    const persisted = selectAndPersistQuestionForEmployeeMoment(
      'tenant-a',
      { timestampUtcIso: '2026-03-22T12:00:00.000Z', timeZone: 'UTC' },
      [baseQuestion({ id: 'q-queue-1', schedule: { type: 'queue' } })],
      {
        loadState: () => ({
          state: stateContainer.get('state') ?? createEmptyQuestionSelectionState(),
          version: versionContainer.get('version') ?? 0
        }),
        saveState: (_tenantId, nextState, expectedVersion) => {
          const currentVersion = versionContainer.get('version') ?? 0;

          if (expectedVersion !== currentVersion) {
            return left('VERSION_CONFLICT');
          }

          stateContainer.set('state', nextState);
          versionContainer.set('version', currentVersion + 1);
          return right(versionContainer.get('version') ?? currentVersion + 1);
        }
      },
      workingDayPolicy
    );

    expect(isRight(persisted)).toBe(true);
    if (isRight(persisted)) {
      expect(selectedQuestionId(persisted.right.question)).toBe('q-queue-1');
    }

    expect((stateContainer.get('state') ?? createEmptyQuestionSelectionState()).consumedQueueQuestionIds).toEqual([
      'q-queue-1'
    ]);
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
