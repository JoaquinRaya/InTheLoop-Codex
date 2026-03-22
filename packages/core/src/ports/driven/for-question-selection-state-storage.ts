/**
 * Driven port for durable question-selection state storage with optimistic concurrency.
 */
import type { Either } from '../../domain/either.js';
import type { QuestionSelectionState } from '../../application/question-scheduling.js';

export type StoredQuestionSelectionState = Readonly<{
  readonly state: QuestionSelectionState;
  readonly version: number;
}>;

export type ForQuestionSelectionStateStorage = Readonly<{
  readonly loadState: (tenantId: string) => StoredQuestionSelectionState;
  readonly saveState: (
    tenantId: string,
    nextState: QuestionSelectionState,
    expectedVersion: number
  ) => Either<'VERSION_CONFLICT', number>;
}>;
