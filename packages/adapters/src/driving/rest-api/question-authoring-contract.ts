/**
 * REST authoring contract adapter for PRD-03 scheduling inputs.
 */
import { left, right, type Either } from '../../../../core/src/domain/either.js';
import { isSome, none, some } from '../../../../core/src/domain/option.js';
import {
  validateQuestionSchedules,
  type RecurringRule,
  type ScheduledQuestion
} from '../../../../core/src/application/question-scheduling.js';

export type AuthoringRecurringRuleInput =
  | Readonly<{ readonly kind: 'interval_days'; readonly interval_days: number }>
  | Readonly<{ readonly kind: 'interval_months'; readonly interval_months: number }>
  | Readonly<{ readonly kind: 'nth_weekday_of_month'; readonly nth: 1 | 2 | 3 | 4 | 5; readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }>
  | Readonly<{ readonly kind: 'last_weekday_of_month'; readonly weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6 }>;

export type AuthoringScheduleInput =
  | Readonly<{ readonly type: 'specific_date'; readonly date: string }>
  | Readonly<{
      readonly type: 'recurring';
      readonly start_date: string;
      readonly end_date?: string;
      readonly rule: AuthoringRecurringRuleInput;
    }>
  | Readonly<{ readonly type: 'queue' }>;

export type AuthoringQuestionInput = Readonly<{
  readonly id: string;
  readonly created_at: string;
  readonly text: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly options: readonly Readonly<{ readonly text: string; readonly points: number }>[];
  readonly points: number;
  readonly allow_comments: boolean;
  readonly schedule: AuthoringScheduleInput;
  readonly suppression_windows?: readonly Readonly<{ readonly start_date: string; readonly end_date: string }>[];
}>;

export type AuthoringBatchInput = Readonly<{
  readonly questions: readonly AuthoringQuestionInput[];
}>;

/**
 * toRecurringRule.
 */
const toRecurringRule = (rule: AuthoringRecurringRuleInput): RecurringRule => {
  if (rule.kind === 'interval_days') {
    return {
      kind: 'interval-days',
      intervalDays: rule.interval_days
    };
  }

  if (rule.kind === 'interval_months') {
    return {
      kind: 'interval-months',
      intervalMonths: rule.interval_months
    };
  }

  if (rule.kind === 'nth_weekday_of_month') {
    return {
      kind: 'nth-weekday-of-month',
      nth: rule.nth,
      weekday: rule.weekday
    };
  }

  return {
    kind: 'last-weekday-of-month',
    weekday: rule.weekday
  };
};

/**
 * toScheduledQuestion.
 */
const toScheduledQuestion = (input: AuthoringQuestionInput): ScheduledQuestion => ({
  id: input.id,
  createdAt: input.created_at,
  text: input.text,
  category: input.category,
  tags: input.tags,
  options: input.options,
  points: input.points,
  allowComments: input.allow_comments,
  schedule:
    input.schedule.type === 'specific_date'
      ? { type: 'specific-date', date: input.schedule.date }
      : input.schedule.type === 'queue'
        ? { type: 'queue' }
        : {
            type: 'recurring',
            startDate: input.schedule.start_date,
            endDate: input.schedule.end_date === undefined ? none() : some(input.schedule.end_date),
            rule: toRecurringRule(input.schedule.rule)
          },
  suppressionWindows: (input.suppression_windows ?? []).map((window) => ({
    startDate: window.start_date,
    endDate: window.end_date
  }))
});

/**
 * Normalizes REST authoring payload and validates schedule metadata using core PRD-03 rules.
 */
export const parseAndValidateQuestionAuthoringBatch = (
  payload: AuthoringBatchInput
): Either<readonly string[], readonly ScheduledQuestion[]> => {
  const normalized = payload.questions.map(toScheduledQuestion);
  const validation = validateQuestionSchedules(normalized);

  if (validation._tag === 'Left') {
    return left(
      validation.left.map(
        (error) =>
          `${error.code}${isSome(error.questionId) ? `:${error.questionId.value}` : ''}:${error.message}`
      )
    );
  }

  return right(validation.right);
};
