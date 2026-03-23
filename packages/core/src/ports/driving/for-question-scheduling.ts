/**
 * Driving ports for PRD-03 question scheduling use cases.
 */
import type {
  DailyQuestionSelection,
  QuestionSchedulingValidationError,
  QuestionSelectionState,
  ScheduledQuestion,
  SelectionContext
} from '../../application/question-scheduling.js';
import type { Either } from '../../domain/either.js';
import type { ForQuestionSelectionStateStorage } from '../driven/for-question-selection-state-storage.js';
import type { ForWorkCalendarPolicy } from '../driven/for-work-calendar-policy.js';

export type ForSelectingQuestionForEmployeeMoment = (
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  state: QuestionSelectionState,
  calendarPolicy: ForWorkCalendarPolicy
) => Either<readonly QuestionSchedulingValidationError[], DailyQuestionSelection>;

export type ForSelectingAndPersistingQuestionForEmployeeMoment = (
  tenantId: string,
  context: SelectionContext,
  allQuestions: readonly ScheduledQuestion[],
  storage: ForQuestionSelectionStateStorage,
  calendarPolicy: ForWorkCalendarPolicy
) => Either<readonly QuestionSchedulingValidationError[], DailyQuestionSelection>;
