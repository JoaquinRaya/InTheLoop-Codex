/**
 * Driving ports for PRD-02 daily prompt use cases.
 */
import type {
  DailyPromptOutcome,
  EmployeeClientLocalState,
  EmployeeProfileSnapshot,
  LoginPromptDecision
} from '../../application/employee-daily-prompt.js';

/**
 * Driving port for resolving prompt visibility at login.
 */
export type ForResolvingEmployeeDailyPromptDecision = (
  localDay: string,
  localState: EmployeeClientLocalState,
  profile: EmployeeProfileSnapshot
) => LoginPromptDecision;

/**
 * Driving port for applying prompt outcomes to local state.
 */
export type ForApplyingEmployeeDailyPromptOutcome = (
  localDay: string,
  localState: EmployeeClientLocalState,
  outcome: DailyPromptOutcome
) => EmployeeClientLocalState;
