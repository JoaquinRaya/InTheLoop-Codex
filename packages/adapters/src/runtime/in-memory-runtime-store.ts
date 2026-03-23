import type { AdminAuthoringQuestion } from '../../../core/src/application/admin-authoring.js';
import {
  createEmptyQuestionSelectionState,
  type QuestionSelectionState
} from '../../../core/src/application/question-scheduling.js';
import { left, right, type Either } from '../../../core/src/domain/either.js';
import type { StoredQuestionSelectionState } from '../../../core/src/ports/driven/for-question-selection-state-storage.js';
import type { RuntimeStore } from './runtime-store.js';

type VersionedState = Readonly<{
  readonly state: QuestionSelectionState;
  readonly version: number;
}>;

export const createInMemoryRuntimeStore = (): RuntimeStore => {
  const questionMap = new Map<string, readonly AdminAuthoringQuestion[]>();
  const selectionStateMap = new Map<string, VersionedState>();

  return {
    initialize: async () => undefined,
    upsertQuestions: async (tenantId, questions) => {
      questionMap.set(tenantId, questions);
    },
    loadQuestions: async (tenantId) => questionMap.get(tenantId) ?? [],
    loadSelectionState: async (tenantId): Promise<StoredQuestionSelectionState> => {
      const existing = selectionStateMap.get(tenantId);

      if (existing === undefined) {
        return {
          state: createEmptyQuestionSelectionState(),
          version: 0
        };
      }

      return existing;
    },
    saveSelectionState: async (
      tenantId,
      nextState,
      expectedVersion
    ): Promise<Either<'VERSION_CONFLICT', number>> => {
      const current = selectionStateMap.get(tenantId);
      const currentVersion = current?.version ?? 0;

      if (currentVersion !== expectedVersion) {
        return left('VERSION_CONFLICT');
      }

      const nextVersion = currentVersion + 1;
      selectionStateMap.set(tenantId, {
        state: nextState,
        version: nextVersion
      });

      return right(nextVersion);
    },
    close: async () => undefined
  };
};
