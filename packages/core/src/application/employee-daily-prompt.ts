import type { Option } from 'fp-ts/Option';
import { none, some } from 'fp-ts/Option';

export type EmployeeProfileSnapshot = Readonly<{
  readonly managerEmail: string;
  readonly role: string;
  readonly level: string;
}>;

export type EmployeeClientLocalState = Readonly<{
  readonly lastAnsweredDay: Option<string>;
  readonly cachedProfile: Option<EmployeeProfileSnapshot>;
}>;

export type LoginPromptDecision = Readonly<{
  readonly shouldShowPrompt: boolean;
  readonly reason: 'PROMPT_AVAILABLE' | 'ALREADY_FINALIZED_FOR_LOCAL_DAY';
  readonly nextState: EmployeeClientLocalState;
}>;

export type DailyPromptOutcome = 'answered' | 'skipped' | 'delayed';

export const createEmptyEmployeeClientLocalState = (): EmployeeClientLocalState => ({
  lastAnsweredDay: none,
  cachedProfile: none
});

const cacheProfile = (
  localState: EmployeeClientLocalState,
  profile: EmployeeProfileSnapshot
): EmployeeClientLocalState => ({
  ...localState,
  cachedProfile: some(profile)
});

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
