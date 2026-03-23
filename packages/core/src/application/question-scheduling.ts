/**
 * PRD-03 application service for deterministic question selection per employee-day.
 */
import { left, right, type Either } from '../domain/either.js';
import { none, some, type Option } from '../domain/option.js';
import type { ForQuestionSelectionStateStorage } from '../ports/driven/for-question-selection-state-storage.js';
import type { ForWorkCalendarPolicy } from '../ports/driven/for-work-calendar-policy.js';

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
  readonly nth: number;
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
  readonly endDate: Option<string>;
  readonly rule: RecurringRule;
}>;

export type QueueSchedule = Readonly<{
  readonly type: 'queue';
}>;

export type QuestionSchedule = SpecificDateSchedule | RecurringSchedule | QueueSchedule;

export type ScheduledQuestionOption = Readonly<{
  readonly text: string;
  readonly points: number;
}>;

export type ScheduledQuestion = Readonly<{
  readonly id: string;
  readonly createdAt: string;
  readonly text: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly options: readonly ScheduledQuestionOption[];
  readonly points: number;
  readonly allowComments: boolean;
  readonly schedule: QuestionSchedule;
  readonly suppressionWindows: readonly DateRange[];
}>;

export type QuestionSelectionState = Readonly<{
  readonly consumedQueueQuestionIds: readonly string[];
}>;

export type DailyQuestionSelection = Readonly<{
  readonly question: Option<ScheduledQuestion>;
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
  readonly questionId: Option<string>;
}>;

export type SelectionContext = Readonly<{
  readonly timestampUtcIso: string;
  readonly timeZone: string;
}>;

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/**
 * isDateString.
 */
const isDateString = (value: string): boolean =>
  isoDatePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

/**
 * isDateWithinRange.
 */
const isDateWithinRange = (date: string, range: DateRange): boolean => date >= range.startDate && date <= range.endDate;

/**
 * isSuppressedOnDate.
 */
const isSuppressedOnDate = (question: ScheduledQuestion, localDate: string): boolean =>
  question.suppressionWindows.some((range) => isDateWithinRange(localDate, range));

/**
 * parseDateParts.
 */
const parseDateParts = (
  isoDate: string
): Readonly<{ readonly year: number; readonly month: number; readonly day: number }> => ({
  year: Number.parseInt(isoDate.slice(0, 4), 10),
  month: Number.parseInt(isoDate.slice(5, 7), 10),
  day: Number.parseInt(isoDate.slice(8, 10), 10)
});

/**
 * daysInMonth.
 */
const daysInMonth = (year: number, month: number): number => new Date(Date.UTC(year, month, 0)).getUTCDate();

const canonicalTimeZoneAliases = ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT'] as const;

/**
 * isValidTimeZone.
 */
const isValidTimeZone = (timeZone: string): boolean =>
  canonicalTimeZoneAliases.some((alias) => alias === timeZone) ||
  Intl.supportedValuesOf('timeZone').some((supported) => supported === timeZone);

/**
 * extractLocalDate.
 */
const extractLocalDate = (timestampUtcIso: string, timeZone: string): Either<QuestionSchedulingValidationError, string> => {
  const utcDate = new Date(timestampUtcIso);

  if (Number.isNaN(utcDate.getTime())) {
    return left({
      code: 'INVALID_DATE_FORMAT',
      message: `Invalid UTC timestamp: ${timestampUtcIso}`,
      questionId: none()
    });
  }

  if (!isValidTimeZone(timeZone)) {
    return left({
      code: 'INVALID_TIMEZONE',
      message: `Invalid timezone: ${timeZone}`,
      questionId: none()
    });
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const partEntries = formatter
    .formatToParts(utcDate)
    .map((part) => [part.type, part.value] as const);
  const partMap = Object.fromEntries(partEntries) as Readonly<Record<string, string>>;

  return right(`${partMap.year}-${partMap.month}-${partMap.day}`);
};

/**
 * weekdayFromDate.
 */
const weekdayFromDate = (date: string): Weekday => new Date(`${date}T00:00:00.000Z`).getUTCDay() as Weekday;

/**
 * dayOfMonthFromDate.
 */
const dayOfMonthFromDate = (date: string): number => Number.parseInt(date.slice(8, 10), 10);

/**
 * isLastWeekdayOfMonth.
 */
const isLastWeekdayOfMonth = (localDate: string, weekday: Weekday): boolean => {
  if (weekdayFromDate(localDate) !== weekday) {
    return false;
  }

  const current = new Date(`${localDate}T00:00:00.000Z`);
  const nextWeek = new Date(current);
  nextWeek.setUTCDate(current.getUTCDate() + 7);

  return nextWeek.getUTCMonth() !== current.getUTCMonth();
};

/**
 * isNthWeekdayOfMonth.
 */
const isNthWeekdayOfMonth = (localDate: string, nth: number, weekday: Weekday): boolean => {
  if (weekdayFromDate(localDate) !== weekday) {
    return false;
  }

  const dayOfMonth = dayOfMonthFromDate(localDate);
  return Math.ceil(dayOfMonth / 7) === nth;
};

/**
 * isIntervalMonthsDueOnDate.
 */
const isIntervalMonthsDueOnDate = (localDate: string, startDate: string, intervalMonths: number): boolean => {
  const local = parseDateParts(localDate);
  const start = parseDateParts(startDate);
  /**
   * monthsDelta.
   */
  const monthsDelta = (local.year - start.year) * 12 + (local.month - start.month);

  if (monthsDelta < 0 || monthsDelta % intervalMonths !== 0) {
    return false;
  }

  const clampedStartDay = Math.min(start.day, daysInMonth(local.year, local.month));
  return local.day === clampedStartDay;
};

/**
 * isRecurringScheduleDueOnDate.
 */
const isRecurringScheduleDueOnDate = (schedule: RecurringSchedule, localDate: string): boolean => {
  if (localDate < schedule.startDate) {
    return false;
  }

  if (schedule.endDate._tag === 'Some' && localDate > schedule.endDate.value) {
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

/**
 * byMostRecentCreatedAtThenAlphabeticalId.
 */
const byMostRecentCreatedAtThenAlphabeticalId = (a: ScheduledQuestion, b: ScheduledQuestion): number => {
  if (a.createdAt > b.createdAt) {
    return -1;
  }

  if (a.createdAt < b.createdAt) {
    return 1;
  }

  return a.id.localeCompare(b.id);
};

/**
 * recurringPriority.
 */
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

type RecurringScheduledQuestion = ScheduledQuestion & Readonly<{ readonly schedule: RecurringSchedule }>;
type SpecificDateScheduledQuestion = ScheduledQuestion & Readonly<{ readonly schedule: SpecificDateSchedule }>;
type QueueScheduledQuestion = ScheduledQuestion & Readonly<{ readonly schedule: QueueSchedule }>;

/**
 * isRecurringScheduledQuestion.
 */
const isRecurringScheduledQuestion = (question: ScheduledQuestion): question is RecurringScheduledQuestion =>
  question.schedule.type === 'recurring';

/**
 * isSpecificDateScheduledQuestion.
 */
const isSpecificDateScheduledQuestion = (question: ScheduledQuestion): question is SpecificDateScheduledQuestion =>
  question.schedule.type === 'specific-date';

/**
 * isQueueScheduledQuestion.
 */
const isQueueScheduledQuestion = (question: ScheduledQuestion): question is QueueScheduledQuestion =>
  question.schedule.type === 'queue';

/**
 * validateDateRange.
 */
const validateDateRange = (
  range: DateRange,
  questionId: string
): readonly QuestionSchedulingValidationError[] => {
  if (!isDateString(range.startDate) || !isDateString(range.endDate)) {
    return [{
      code: 'INVALID_DATE_FORMAT',
      questionId: some(questionId),
      message: 'Suppression window requires ISO yyyy-mm-dd start and end dates.'
    }];
  }

  if (range.startDate > range.endDate) {
    return [{
      code: 'INVALID_DATE_RANGE',
      questionId: some(questionId),
      message: 'Suppression window startDate cannot be after endDate.'
    }];
  }

  return [];
};

/**
 * validateQuestionSchedules.
 */
export const validateQuestionSchedules = (
  questions: readonly ScheduledQuestion[]
): Either<readonly QuestionSchedulingValidationError[], readonly ScheduledQuestion[]> => {
  const errors = questions.flatMap((question) => {
    const specificDateErrors =
      question.schedule.type === 'specific-date' && !isDateString(question.schedule.date)
              ? [
                  {
                    code: 'INVALID_DATE_FORMAT' as const,
                    questionId: some(question.id),
                    message: 'Specific-date schedule requires an ISO yyyy-mm-dd date.'
                  }
                ]
        : [];

    const recurringErrors =
      question.schedule.type !== 'recurring'
        ? []
        : [
            ...(!isDateString(question.schedule.startDate)
              ? [
                  {
                    code: 'INVALID_DATE_FORMAT' as const,
                    questionId: some(question.id),
                    message: 'Recurring schedule requires an ISO yyyy-mm-dd startDate.'
                  }
                ]
              : []),
            ...(question.schedule.endDate._tag === 'None'
              ? []
              : !isDateString(question.schedule.endDate.value)
                ? [
                    {
                      code: 'INVALID_DATE_FORMAT' as const,
                      questionId: some(question.id),
                      message: 'Recurring schedule endDate must be ISO yyyy-mm-dd when provided.'
                    }
                  ]
                : question.schedule.endDate.value < question.schedule.startDate
                  ? [
                      {
                        code: 'INVALID_DATE_RANGE' as const,
                        questionId: some(question.id),
                        message: 'Recurring schedule endDate cannot be before startDate.'
                      }
                    ]
                  : []),
            ...(question.schedule.rule.kind === 'interval-days' && question.schedule.rule.intervalDays < 1
              ? [
                  {
                    code: 'INVALID_INTERVAL_DAYS' as const,
                    questionId: some(question.id),
                    message: 'intervalDays must be at least 1.'
                  }
                ]
              : []),
            ...(question.schedule.rule.kind === 'interval-months' && question.schedule.rule.intervalMonths < 1
              ? [
                  {
                    code: 'INVALID_INTERVAL_MONTHS' as const,
                    questionId: some(question.id),
                    message: 'intervalMonths must be at least 1.'
                  }
                ]
              : []),
            ...(question.schedule.rule.kind === 'nth-weekday-of-month' &&
            (question.schedule.rule.nth < 1 || question.schedule.rule.nth > 5)
              ? [
                  {
                    code: 'INVALID_NTH_WEEKDAY' as const,
                    questionId: some(question.id),
                    message: 'nth-weekday-of-month requires nth in [1..5].'
                  }
                ]
              : [])
          ];

    const suppressionWindowErrors = question.suppressionWindows.flatMap((window) =>
      validateDateRange(window, question.id)
    );

    return [...specificDateErrors, ...recurringErrors, ...suppressionWindowErrors];
  });

  if (errors.length > 0) {
    return left(errors);
  }

  return right(questions);
};

/**
 * createEmptyQuestionSelectionState.
 */
export const createEmptyQuestionSelectionState = (): QuestionSelectionState => ({
  consumedQueueQuestionIds: []
});

/**
 * selectQuestionForEmployeeMoment.
 */
export const selectQuestionForEmployeeMoment = (
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  state: QuestionSelectionState,
  calendarPolicy: ForWorkCalendarPolicy
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
      question: none(),
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const eligibleQuestions = validatedQuestions.right.filter((question) => !isSuppressedOnDate(question, localDate));

  const specificDateCandidates = eligibleQuestions
    .filter(isSpecificDateScheduledQuestion)
    .filter((question) => question.schedule.date === localDate)
    .sort(byMostRecentCreatedAtThenAlphabeticalId);
  const [selectedSpecificDateQuestion] = specificDateCandidates;

  if (selectedSpecificDateQuestion !== undefined) {
    return right({
      question: some(selectedSpecificDateQuestion),
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const recurringCandidates = eligibleQuestions
    .filter(isRecurringScheduledQuestion)
    .filter((question) => isRecurringScheduleDueOnDate(question.schedule, localDate))
    .sort((a, b) => {
      const intervalDelta = recurringPriority(b.schedule) - recurringPriority(a.schedule);

      if (intervalDelta !== 0) {
        return intervalDelta;
      }

      return byMostRecentCreatedAtThenAlphabeticalId(a, b);
    });
  const [selectedRecurringQuestion] = recurringCandidates;

  if (selectedRecurringQuestion !== undefined) {
    return right({
      question: some(selectedRecurringQuestion),
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  const consumedSet = new Set(state.consumedQueueQuestionIds);
  const queueCandidates = eligibleQuestions
    .filter(isQueueScheduledQuestion)
    .filter((question) => !consumedSet.has(question.id))
    .sort(byMostRecentCreatedAtThenAlphabeticalId);
  const [selectedQueueQuestion] = queueCandidates;
  if (selectedQueueQuestion === undefined) {
    return right({
      question: none(),
      nextState: state,
      localDate,
      timeZone: context.timeZone
    });
  }

  return right({
    question: some(selectedQueueQuestion),
    nextState: {
      consumedQueueQuestionIds: [...state.consumedQueueQuestionIds, selectedQueueQuestion.id]
    },
    localDate,
    timeZone: context.timeZone
  });
};

/**
 * selectAndPersistQuestionForEmployeeMoment.
 */
export const selectAndPersistQuestionForEmployeeMoment = (
  tenantId: string,
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  storage: ForQuestionSelectionStateStorage,
  calendarPolicy: ForWorkCalendarPolicy
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
        message: 'Question-selection state version conflict while persisting queue consumption.',
        questionId: none()
      }
    ]);
  }

  return selection;
};
