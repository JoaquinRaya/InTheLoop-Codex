import { left, right, type Either } from '../domain/either.js';
import { some, type Option } from '../domain/option.js';
import {
  selectQuestionForEmployeeMoment,
  type DailyQuestionSelection,
  type QuestionSchedulingValidationError,
  type ScheduledQuestion,
  type SelectionContext,
  type QuestionSelectionState
} from './question-scheduling.js';
import type { ForWorkCalendarPolicy } from '../ports/driven/for-work-calendar-policy.js';

export type QuestionAudienceTarget =
  | Readonly<{ readonly type: 'whole-company' }>
  | Readonly<{ readonly type: 'manager-subtree'; readonly managerEmail: string }>
  | Readonly<{ readonly type: 'group'; readonly groupId: string }>;

export type AdminAuthoringQuestion = Readonly<{
  readonly target: QuestionAudienceTarget;
  readonly firstDisplayedAt: Option<string>;
}> & ScheduledQuestion;

export type AdminAuthoringEmployeeProfile = Readonly<{
  readonly managerEmail: Option<string>;
  readonly managerAncestryEmails: readonly string[];
  readonly groupIds: readonly string[];
}>;

export type AdminAuthoringValidationError = Readonly<{
  readonly code: 'INVALID_DISPLAY_TIMESTAMP' | 'QUESTION_IMMUTABLE';
  readonly message: string;
}>;

/**
 * isValidIsoTimestamp.
 */
const isValidIsoTimestamp = (value: string): boolean => !Number.isNaN(Date.parse(value));

/**
 * targetMatchesProfile.
 */
const targetMatchesProfile = (
  target: QuestionAudienceTarget,
  profile: AdminAuthoringEmployeeProfile
): boolean => {
  if (target.type === 'whole-company') {
    return true;
  }

  if (target.type === 'group') {
    return profile.groupIds.includes(target.groupId);
  }

  return (
    (profile.managerEmail._tag === 'Some' && profile.managerEmail.value === target.managerEmail) ||
    profile.managerAncestryEmails.includes(target.managerEmail)
  );
};

/**
 * canEditAdminAuthoringQuestion.
 */
export const canEditAdminAuthoringQuestion = (question: AdminAuthoringQuestion): boolean =>
  question.firstDisplayedAt._tag === 'None';

/**
 * applyAdminQuestionEdit.
 */
export const applyAdminQuestionEdit = (
  existing: AdminAuthoringQuestion,
  updated: ScheduledQuestion & Readonly<{ readonly target: QuestionAudienceTarget }>
): Either<AdminAuthoringValidationError, AdminAuthoringQuestion> => {
  if (!canEditAdminAuthoringQuestion(existing)) {
    return left({
      code: 'QUESTION_IMMUTABLE',
      message: `Question ${existing.id} is immutable after first display.`
    });
  }

  return right({
    ...updated,
    firstDisplayedAt: existing.firstDisplayedAt
  });
};

/**
 * recordQuestionFirstDisplay.
 */
export const recordQuestionFirstDisplay = (
  question: AdminAuthoringQuestion,
  displayedAtIso: string
): Either<AdminAuthoringValidationError, AdminAuthoringQuestion> => {
  if (!isValidIsoTimestamp(displayedAtIso)) {
    return left({
      code: 'INVALID_DISPLAY_TIMESTAMP',
      message: `Invalid first-display timestamp: ${displayedAtIso}`
    });
  }

  if (question.firstDisplayedAt._tag === 'Some') {
    return right(question);
  }

  return right({
    ...question,
    firstDisplayedAt: some(displayedAtIso)
  });
};

/**
 * previewQuestionResolutionForEmployee.
 */
export const previewQuestionResolutionForEmployee = (
  context: SelectionContext,
  profile: AdminAuthoringEmployeeProfile,
  questions: readonly AdminAuthoringQuestion[],
  state: QuestionSelectionState,
  calendarPolicy: ForWorkCalendarPolicy
): Either<readonly QuestionSchedulingValidationError[], DailyQuestionSelection> => {
  const targetedQuestions = questions.filter((question) => targetMatchesProfile(question.target, profile));
  return selectQuestionForEmployeeMoment(context, targetedQuestions, state, calendarPolicy);
};
