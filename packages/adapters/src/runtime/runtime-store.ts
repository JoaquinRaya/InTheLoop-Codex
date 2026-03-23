import type { AdminAuthoringQuestion } from '../../../core/src/application/admin-authoring.js';
import type { QuestionSelectionState } from '../../../core/src/application/question-scheduling.js';
import type { Either } from '../../../core/src/domain/either.js';
import type { ResponsePayload } from '../../../core/src/domain/response-payload.js';
import type { StoredQuestionSelectionState } from '../../../core/src/ports/driven/for-question-selection-state-storage.js';

export type StoredScoreRecord = Readonly<{
  readonly questionId: string;
  readonly normalizedScore: number;
  readonly optionalComment: string | null;
  readonly managerEmail: string;
  readonly role: string;
  readonly level: string;
  readonly surveyDay: string;
}>;

export type RuntimeStore = Readonly<{
  readonly initialize: () => Promise<void>;
  readonly upsertQuestions: (tenantId: string, questions: readonly AdminAuthoringQuestion[]) => Promise<void>;
  readonly loadQuestions: (tenantId: string) => Promise<readonly AdminAuthoringQuestion[]>;
  readonly saveScore: (tenantId: string, payload: ResponsePayload) => Promise<void>;
  readonly loadScores: (tenantId: string) => Promise<readonly StoredScoreRecord[]>;
  readonly loadSelectionState: (tenantId: string) => Promise<StoredQuestionSelectionState>;
  readonly saveSelectionState: (
    tenantId: string,
    nextState: QuestionSelectionState,
    expectedVersion: number
  ) => Promise<Either<'VERSION_CONFLICT', number>>;
  readonly close: () => Promise<void>;
}>;
