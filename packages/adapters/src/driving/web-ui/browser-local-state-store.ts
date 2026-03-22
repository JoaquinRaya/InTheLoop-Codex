/**
 * Browser storage-driven adapter for employee prompt local state persistence.
 */
import { none, some } from '../../../../core/src/domain/option.js';
import type {
  EmployeeClientLocalState,
  EmployeeProfileSnapshot
} from '../../../../core/src/application/employee-daily-prompt.js';
import {
  createEmptyEmployeeClientLocalState
} from '../../../../core/src/application/employee-daily-prompt.js';
import type { EmployeePromptLocalStateStore } from './employee-daily-prompt-app.js';

/**
 * Minimal browser-storage interface used by the adapter.
 */
export type StorageLike = Readonly<{
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}>;

type SerializedState = Readonly<{
  readonly lastAnsweredDay: string | null;
  readonly cachedProfile: EmployeeProfileSnapshot | null;
}>;

/**
 * Deserializes persisted JSON state into core local-state model.
 */
const deserializeState = (serialized: string | null): EmployeeClientLocalState => {
  if (serialized === null) {
    return createEmptyEmployeeClientLocalState();
  }

  const parsed = JSON.parse(serialized) as SerializedState;

  return {
    lastAnsweredDay: parsed.lastAnsweredDay === null ? none() : some(parsed.lastAnsweredDay),
    cachedProfile: parsed.cachedProfile === null ? none() : some(parsed.cachedProfile)
  };
};

/**
 * Serializes core local-state model to persisted JSON.
 */
const serializeState = (state: EmployeeClientLocalState): string =>
  JSON.stringify({
    lastAnsweredDay: state.lastAnsweredDay._tag === 'Some' ? state.lastAnsweredDay.value : null,
    cachedProfile: state.cachedProfile._tag === 'Some' ? state.cachedProfile.value : null
  } satisfies SerializedState);

/**
 * Creates a browser-backed implementation of the local-state storage port.
 */
export const createBrowserLocalStateStore = (
  storage: StorageLike,
  storageKey = 'employee_daily_prompt_state'
): EmployeePromptLocalStateStore => ({
  loadState: () => deserializeState(storage.getItem(storageKey)),
  saveState: (state) => {
    storage.setItem(storageKey, serializeState(state));
  }
});
