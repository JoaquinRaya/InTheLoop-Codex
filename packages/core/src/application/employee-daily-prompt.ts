/**
 * PRD-02 application service for daily prompt decisioning and local-day finalization.
 */
import type { Option } from '../domain/option.js';
import { none, some } from '../domain/option.js';

/**
 * Locally cached employee profile attributes used for payload context.
 */
export type EmployeeProfileSnapshot = Readonly<{
  readonly managerEmail: string;
  readonly role: string;
  readonly level: string;
}>;

/**
 * Client-local state used to enforce one finalized prompt per local day.
 */
export type EmployeeClientLocalState = Readonly<{
  readonly lastAnsweredDay: Option<string>;
  readonly cachedProfile: Option<EmployeeProfileSnapshot>;
}>;

/**
 * Decision emitted at login for whether the prompt should be shown.
 */
export type LoginPromptDecision = Readonly<{
  readonly shouldShowPrompt: boolean;
  readonly reason: 'PROMPT_AVAILABLE' | 'ALREADY_FINALIZED_FOR_LOCAL_DAY';
  readonly nextState: EmployeeClientLocalState;
}>;

/**
 * Prompt outcomes relevant to local-day finalization semantics.
 */
export type DailyPromptOutcome = 'answered' | 'skipped' | 'delayed';

/**
 * Creates an empty local state for first-time runtime initialization.
 */
export const createEmptyEmployeeClientLocalState = (): EmployeeClientLocalState => ({
  lastAnsweredDay: none(),
  cachedProfile: none()
});

/**
 * Returns local state with the latest profile snapshot cached.
 */
const cacheProfile = (
  localState: EmployeeClientLocalState,
  profile: EmployeeProfileSnapshot
): EmployeeClientLocalState => ({
  ...localState,
  cachedProfile: some(profile)
});

/**
 * Resolves whether prompt is available on login for the current local day.
 */
export const resolveLoginPromptDecision = (
  localDay: string,
  localState: EmployeeClientLocalState,
  profile: EmployeeProfileSnapshot
): LoginPromptDecision => {
  const stateWithCachedProfile = cacheProfile(localState, profile);

  if (stateWithCachedProfile.lastAnsweredDay._tag === 'Some' && stateWithCachedProfile.lastAnsweredDay.value === localDay) {
    return {
      shouldShowPrompt: false,
      reason: 'ALREADY_FINALIZED_FOR_LOCAL_DAY',
      nextState: stateWithCachedProfile
    };
  }

  return {
    shouldShowPrompt: true,
    reason: 'PROMPT_AVAILABLE',
    nextState: stateWithCachedProfile
  };
};

/**
 * Applies prompt outcome to local state, finalizing day on answer or skip.
 */
export const applyDailyPromptOutcome = (
  localDay: string,
  localState: EmployeeClientLocalState,
  outcome: DailyPromptOutcome
): EmployeeClientLocalState => {
  if (outcome === 'answered' || outcome === 'skipped') {
    return {
      ...localState,
      lastAnsweredDay: some(localDay)
    };
  }

  return localState;
};
