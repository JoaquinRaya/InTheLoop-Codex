/**
 * PRD-03 application service for deterministic question selection per employee-day.
 */
import { left, right, type Either } from '../domain/either.js';
import type { ForQuestionSelectionStateStorage } from '../ports/driven/for-question-selection-state-storage.js';

export type DateRange = Readonly<{
  readonly startDate: string;
  readonly endDate: string;
}>;

export type SpecificDateSchedule = Readonly<{
  readonly type: 'specific-date';
  readonly date: string;
}>;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type IntervalDaysRecurringRule = Readonly<{
  readonly kind: 'interval-days';
  readonly intervalDays: number;
}>;

export type IntervalMonthsRecurringRule = Readonly<{
  readonly kind: 'interval-months';
  readonly intervalMonths: number;
}>;

export type NthWeekdayOfMonthRecurringRule = Readonly<{
  readonly kind: 'nth-weekday-of-month';
  readonly nth: 1 | 2 | 3 | 4 | 5;
  readonly weekday: Weekday;
}>;

export type LastWeekdayOfMonthRecurringRule = Readonly<{
  readonly kind: 'last-weekday-of-month';
  readonly weekday: Weekday;
}>;

export type RecurringRule =
  | IntervalDaysRecurringRule
  | IntervalMonthsRecurringRule
  | NthWeekdayOfMonthRecurringRule
  | LastWeekdayOfMonthRecurringRule;

export type RecurringSchedule = Readonly<{
  readonly type: 'recurring';
  readonly startDate: string;
  readonly endDate?: string;
  readonly rule: RecurringRule;
}>;

export type QueueSchedule = Readonly<{
  readonly type: 'queue';
}>;

export type QuestionSchedule = SpecificDateSchedule | RecurringSchedule | QueueSchedule;

export type ScheduledQuestion = Readonly<{
  readonly id: string;
  readonly createdAt: string;
  readonly text: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly options: readonly string[];
  readonly points: number;
  readonly allowComments: boolean;
  readonly schedule: QuestionSchedule;
  readonly suppressionWindows?: readonly DateRange[];
}>;

export type WorkCalendarPolicy = Readonly<{
  readonly isWorkingDay: (localDate: string, timeZone: string) => boolean;
}>;

export type QuestionSelectionState = Readonly<{
  readonly consumedQueueQuestionIds: readonly string[];
}>;

export type DailyQuestionSelection = Readonly<{
  readonly question: ScheduledQuestion | null;
  readonly nextState: QuestionSelectionState;
  readonly localDate: string;
  readonly timeZone: string;
}>;

export type QuestionSchedulingValidationError = Readonly<{
  readonly code:
    | 'INVALID_DATE_FORMAT'
    | 'INVALID_DATE_RANGE'
    | 'INVALID_INTERVAL_DAYS'
    | 'INVALID_INTERVAL_MONTHS'
    | 'INVALID_NTH_WEEKDAY'
    | 'INVALID_TIMEZONE'
    | 'VERSION_CONFLICT';
  readonly message: string;
  readonly questionId?: string;
}>;

export type SelectionContext = Readonly<{
  readonly timestampUtcIso: string;
  readonly timeZone: string;
}>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const isDateString = (value: string): boolean =>
  isoDatePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

const isDateWithinRange = (date: string, range: DateRange): boolean => date >= range.startDate && date <= range.endDate;

const isSuppressedOnDate = (question: ScheduledQuestion, localDate: string): boolean =>
  (question.suppressionWindows ?? []).some((range) => isDateWithinRange(localDate, range));

const parseDateParts = (isoDate: string): Readonly<{ year: number; month: number; day: number }> => ({
  year: Number.parseInt(isoDate.slice(0, 4), 10),
  month: Number.parseInt(isoDate.slice(5, 7), 10),
  day: Number.parseInt(isoDate.slice(8, 10), 10)
});

const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const extractLocalDate = (timestampUtcIso: string, timeZone: string): Either<QuestionSchedulingValidationError, string> => {
  try {
    const utcDate = new Date(timestampUtcIso);

    if (Number.isNaN(utcDate.getTime())) {
      return left({
        code: 'INVALID_DATE_FORMAT',
        message: `Invalid UTC timestamp: ${timestampUtcIso}`
      });
    }

    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const parts = formatter.formatToParts(utcDate);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (year === undefined || month === undefined || day === undefined) {
      return left({
        code: 'INVALID_TIMEZONE',
        message: `Failed to derive local date for timezone: ${timeZone}`
      });
    }

    return right(`${year}-${month}-${day}`);
  } catch {
    return left({
      code: 'INVALID_TIMEZONE',
      message: `Invalid timezone: ${timeZone}`
    });
  }
};

const weekdayFromDate = (date: string): Weekday => new Date(`${date}T00:00:00.000Z`).getUTCDay() as Weekday;

const dayOfMonthFromDate = (date: string): number => Number.parseInt(date.slice(8, 10), 10);

const isLastWeekdayOfMonth = (localDate: string, weekday: Weekday): boolean => {
  if (weekdayFromDate(localDate) !== weekday) {
    return false;
  }

  const current = new Date(`${localDate}T00:00:00.000Z`);
  const nextWeek = new Date(current);
  nextWeek.setUTCDate(current.getUTCDate() + 7);

  return nextWeek.getUTCMonth() !== current.getUTCMonth();
};

const isNthWeekdayOfMonth = (localDate: string, nth: 1 | 2 | 3 | 4 | 5, weekday: Weekday): boolean => {
  if (weekdayFromDate(localDate) !== weekday) {
    return false;
  }

  const dayOfMonth = dayOfMonthFromDate(localDate);
  return Math.ceil(dayOfMonth / 7) === nth;
};

const isIntervalMonthsDueOnDate = (localDate: string, startDate: string, intervalMonths: number): boolean => {
  const local = parseDateParts(localDate);
  const start = parseDateParts(startDate);
  const monthsDelta = (local.year - start.year) * 12 + (local.month - start.month);

  if (monthsDelta < 0 || monthsDelta % intervalMonths !== 0) {
    return false;
  }

  const clampedStartDay = Math.min(start.day, daysInMonth(local.year, local.month));
  return local.day === clampedStartDay;
};

const isRecurringScheduleDueOnDate = (schedule: RecurringSchedule, localDate: string): boolean => {
  if (localDate < schedule.startDate) {
    return false;
  }

  if (schedule.endDate !== undefined && localDate > schedule.endDate) {
    return false;
  }

  if (schedule.rule.kind === 'interval-days') {
    const localDayMs = Date.parse(`${localDate}T00:00:00.000Z`);
    const startDayMs = Date.parse(`${schedule.startDate}T00:00:00.000Z`);
    const elapsedDays = Math.floor((localDayMs - startDayMs) / (24 * 60 * 60 * 1000));
    return elapsedDays % schedule.rule.intervalDays === 0;
  }

  if (schedule.rule.kind === 'interval-months') {
    return isIntervalMonthsDueOnDate(localDate, schedule.startDate, schedule.rule.intervalMonths);
  }

  if (schedule.rule.kind === 'nth-weekday-of-month') {
    return isNthWeekdayOfMonth(localDate, schedule.rule.nth, schedule.rule.weekday);
  }

  return isLastWeekdayOfMonth(localDate, schedule.rule.weekday);
};

const byMostRecentCreatedAtThenAlphabeticalId = (a: ScheduledQuestion, b: ScheduledQuestion): number => {
  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return a.id.localeCompare(b.id);
};

const recurringPriority = (schedule: RecurringSchedule): number => {
  if (schedule.rule.kind === 'interval-days') {
    return schedule.rule.intervalDays;
  }

  if (schedule.rule.kind === 'interval-months') {
    return schedule.rule.intervalMonths * 31;
  }

  if (schedule.rule.kind === 'last-weekday-of-month') {
    return 31;
  }

  return schedule.rule.nth * 7;
};

const validateDateRange = (range: DateRange, questionId: string): QuestionSchedulingValidationError[] => {
  if (!isDateString(range.startDate) || !isDateString(range.endDate)) {
    return [{
      code: 'INVALID_DATE_FORMAT',
      questionId,
      message: 'Suppression window requires ISO yyyy-mm-dd start and end dates.'
    }];
  }

  if (range.startDate > range.endDate) {
    return [{
      code: 'INVALID_DATE_RANGE',
      questionId,
      message: 'Suppression window startDate cannot be after endDate.'
    }];
  }

  return [];
};

export const validateQuestionSchedules = (
  questions: readonly ScheduledQuestion[]
): Either<readonly QuestionSchedulingValidationError[], readonly ScheduledQuestion[]> => {
  const errors: QuestionSchedulingValidationError[] = [];

  for (const question of questions) {
    if (question.schedule.type === 'specific-date' && !isDateString(question.schedule.date)) {
      errors.push({
        code: 'INVALID_DATE_FORMAT',
        questionId: question.id,
        message: 'Specific-date schedule requires an ISO yyyy-mm-dd date.'
      });
    }

    if (question.schedule.type === 'recurring') {
      if (!isDateString(question.schedule.startDate)) {
        errors.push({
          code: 'INVALID_DATE_FORMAT',
          questionId: question.id,
          message: 'Recurring schedule requires an ISO yyyy-mm-dd startDate.'
        });
      }

      if (question.schedule.endDate !== undefined) {
        if (!isDateString(question.schedule.endDate)) {
          errors.push({
            code: 'INVALID_DATE_FORMAT',
            questionId: question.id,
            message: 'Recurring schedule endDate must be ISO yyyy-mm-dd when provided.'
          });
        } else if (question.schedule.endDate < question.schedule.startDate) {
          errors.push({
            code: 'INVALID_DATE_RANGE',
            questionId: question.id,
            message: 'Recurring schedule endDate cannot be before startDate.'
          });
        }
      }

      if (question.schedule.rule.kind === 'interval-days' && question.schedule.rule.intervalDays < 1) {
        errors.push({
          code: 'INVALID_INTERVAL_DAYS',
          questionId: question.id,
          message: 'intervalDays must be at least 1.'
        });
      }

      if (question.schedule.rule.kind === 'interval-months' && question.schedule.rule.intervalMonths < 1) {
        errors.push({
          code: 'INVALID_INTERVAL_MONTHS',
          questionId: question.id,
          message: 'intervalMonths must be at least 1.'
        });
      }

      if (question.schedule.rule.kind === 'nth-weekday-of-month' && (question.schedule.rule.nth < 1 || question.schedule.rule.nth > 5)) {
        errors.push({
          code: 'INVALID_NTH_WEEKDAY',
          questionId: question.id,
          message: 'nth-weekday-of-month requires nth in [1..5].'
        });
      }
    }

    for (const window of question.suppressionWindows ?? []) {
      errors.push(...validateDateRange(window, question.id));
    }
  }

  if (errors.length > 0) {
    return left(errors);
  }

  return right(questions);
};

export const createEmptyQuestionSelectionState = (): QuestionSelectionState => ({
  consumedQueueQuestionIds: []
});

export const selectQuestionForEmployeeMoment = (
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  state: QuestionSelectionState,
  calendarPolicy: WorkCalendarPolicy
): Either<readonly QuestionSchedulingValidationError[], DailyQuestionSelection> => {
  const validatedQuestions = validateQuestionSchedules(allQuestions);

  if (validatedQuestions._tag === 'Left') {
    return left(validatedQuestions.left);
  }

  const localDateResult = extractLocalDate(context.timestampUtcIso, context.timeZone);

  if (localDateResult._tag === 'Left') {
    return left([localDateResult.left]);
  }

  const localDate = localDateResult.right;

  if (!calendarPolicy.isWorkingDay(localDate, context.timeZone)) {
    return right({
      question: null,
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const eligibleQuestions = validatedQuestions.right.filter((question) => !isSuppressedOnDate(question, localDate));

  const specificDateCandidates = eligibleQuestions
    .filter((question) => question.schedule.type === 'specific-date' && question.schedule.date === localDate)
    .sort(byMostRecentCreatedAtThenAlphabeticalId);

  if (specificDateCandidates.length > 0) {
    return right({
      question: specificDateCandidates[0],
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const recurringCandidates = eligibleQuestions
    .filter((question) => question.schedule.type === 'recurring' && isRecurringScheduleDueOnDate(question.schedule, localDate))
    .sort((a, b) => {
      const intervalDelta = b.schedule.type === 'recurring' && a.schedule.type === 'recurring'
        ? recurringPriority(b.schedule) - recurringPriority(a.schedule)
        : 0;

      if (intervalDelta !== 0) {
        return intervalDelta;
      }

      return byMostRecentCreatedAtThenAlphabeticalId(a, b);
    });

  if (recurringCandidates.length > 0) {
    return right({
      question: recurringCandidates[0],
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const consumedSet = new Set(state.consumedQueueQuestionIds);
  const queueCandidates = eligibleQuestions
    .filter((question) => question.schedule.type === 'queue' && !consumedSet.has(question.id))
    .sort(byMostRecentCreatedAtThenAlphabeticalId);

  if (queueCandidates.length === 0) {
    return right({
      question: null,
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const selectedQueueQuestion = queueCandidates[0];

  return right({
    question: selectedQueueQuestion,
    nextState: {
      consumedQueueQuestionIds: [...state.consumedQueueQuestionIds, selectedQueueQuestion.id]
    },
    localDate,
    timeZone: context.timeZone
  });
};

export const selectAndPersistQuestionForEmployeeMoment = (
  tenantId: string,
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  storage: ForQuestionSelectionStateStorage,
  calendarPolicy: WorkCalendarPolicy
): Either<readonly QuestionSchedulingValidationError[], DailyQuestionSelection> => {
  const stored = storage.loadState(tenantId);

  const selection = selectQuestionForEmployeeMoment(context, allQuestions, stored.state, calendarPolicy);

  if (selection._tag === 'Left') {
    return selection;
  }

  const persisted = storage.saveState(tenantId, selection.right.nextState, stored.version);

  if (persisted._tag === 'Left') {
    return left([
      {
        code: 'VERSION_CONFLICT',
        message: 'Question-selection state version conflict while persisting queue consumption.'
      }
    ]);
  }

  return selection;
};
