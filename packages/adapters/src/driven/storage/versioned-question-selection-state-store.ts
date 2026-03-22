/**
 * Storage-backed adapter for versioned question-selection state persistence.
 */
import { left, right } from '../../../../core/src/domain/either.js';
import {
  createEmptyQuestionSelectionState,
  type QuestionSelectionState
} from '../../../../core/src/application/question-scheduling.js';
import type {
  ForQuestionSelectionStateStorage,
  StoredQuestionSelectionState
} from '../../../../core/src/ports/driven/for-question-selection-state-storage.js';

export type StorageLike = Readonly<{
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}>;

type SerializedVersionedState = Readonly<{
  readonly version: number;
  readonly state: QuestionSelectionState;
}>;

const deserialize = (raw: string | null): StoredQuestionSelectionState => {
  if (raw === null) {
    return {
      state: createEmptyQuestionSelectionState(),
      version: 0
    };
  }

  const parsed = JSON.parse(raw) as SerializedVersionedState;

  return {
    state: parsed.state,
    version: parsed.version
  };
};

const serialize = (stored: StoredQuestionSelectionState): string =>
  JSON.stringify({
    version: stored.version,
    state: stored.state
  } satisfies SerializedVersionedState);

/**
 * Creates a versioned state store that enforces optimistic concurrency.
 */
export const createVersionedQuestionSelectionStateStore = (
  storage: StorageLike,
  storageKeyPrefix = 'question_selection_state'
): ForQuestionSelectionStateStorage => {
  const keyForTenant = (tenantId: string): string => `${storageKeyPrefix}:${tenantId}`;

  return {
    loadState: (tenantId) => deserialize(storage.getItem(keyForTenant(tenantId))),
    saveState: (tenantId, nextState, expectedVersion) => {
      const key = keyForTenant(tenantId);
      const current = deserialize(storage.getItem(key));

      if (current.version !== expectedVersion) {
        return left('VERSION_CONFLICT');
      }

      const nextVersion = current.version + 1;
      storage.setItem(key, serialize({
        state: nextState,
        version: nextVersion
      }));

      return right(nextVersion);
    }
  };
};
