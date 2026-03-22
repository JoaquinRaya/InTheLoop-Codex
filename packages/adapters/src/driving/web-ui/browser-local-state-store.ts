import { none, some } from 'fp-ts/Option';
import type {
  EmployeeClientLocalState,
  EmployeeProfileSnapshot
} from '../../../../core/src/application/employee-daily-prompt.js';
import {
  createEmptyEmployeeClientLocalState
} from '../../../../core/src/application/employee-daily-prompt.js';
import type { EmployeePromptLocalStateStore } from './employee-daily-prompt-app.js';

export type StorageLike = Readonly<{
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}>;

type SerializedState = Readonly<{
  readonly lastAnsweredDay: string | null;
  readonly cachedProfile: EmployeeProfileSnapshot | null;
}>;

const deserializeState = (serialized: string | null): EmployeeClientLocalState => {
  if (serialized === null) {
    return createEmptyEmployeeClientLocalState();
  }

  const parsed = JSON.parse(serialized) as SerializedState;

  return {
    lastAnsweredDay: parsed.lastAnsweredDay === null ? none : some(parsed.lastAnsweredDay),
    cachedProfile: parsed.cachedProfile === null ? none : some(parsed.cachedProfile)
  };
};

const serializeState = (state: EmployeeClientLocalState): string =>
  JSON.stringify({
    lastAnsweredDay: state.lastAnsweredDay._tag === 'Some' ? state.lastAnsweredDay.value : null,
    cachedProfile: state.cachedProfile._tag === 'Some' ? state.cachedProfile.value : null
  } satisfies SerializedState);

export const createBrowserLocalStateStore = (
  storage: StorageLike,
  storageKey = 'employee_daily_prompt_state'
): EmployeePromptLocalStateStore => ({
  load: () => deserializeState(storage.getItem(storageKey)),
  save: (state) => {
    storage.setItem(storageKey, serializeState(state));
  }
});
