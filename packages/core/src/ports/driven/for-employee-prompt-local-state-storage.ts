/**
 * Driven port for reading/writing employee prompt local state.
 */
import type { EmployeeClientLocalState } from '../../application/employee-daily-prompt.js';

/**
 * Adapter contract for local state persistence.
 */
export type ForEmployeePromptLocalStateStorage = Readonly<{
  readonly loadState: () => EmployeeClientLocalState;
  readonly saveState: (state: EmployeeClientLocalState) => void;
}>;
