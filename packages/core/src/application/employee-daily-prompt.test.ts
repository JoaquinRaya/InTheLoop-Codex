import { isSome } from '../domain/option.js';
import { describe, expect, it } from 'vitest';
import {
  applyDailyPromptOutcome,
  createEmptyEmployeeClientLocalState,
  resolveLoginPromptDecision
} from './employee-daily-prompt.js';

describe('employee daily prompt', () => {
  it('shows a prompt after login when local day has not been finalized', () => {
    const state = createEmptyEmployeeClientLocalState();

    const decision = resolveLoginPromptDecision('2026-03-22', state, {
      managerEmail: 'mgr@example.com',
      role: 'engineer',
      level: 'l4'
    });

    expect(decision.shouldShowPrompt).toBe(true);
    expect(decision.reason).toBe('PROMPT_AVAILABLE');
    expect(decision.nextState.cachedProfile._tag).toBe('Some');
  });

  it('does not show a second prompt after the day has been skipped', () => {
    const initialState = createEmptyEmployeeClientLocalState();
    const finalizedState = applyDailyPromptOutcome('2026-03-22', initialState, 'skipped');

    const decision = resolveLoginPromptDecision('2026-03-22', finalizedState, {
      managerEmail: 'mgr@example.com',
      role: 'engineer',
      level: 'l4'
    });

    expect(decision.shouldShowPrompt).toBe(false);
    expect(decision.reason).toBe('ALREADY_FINALIZED_FOR_LOCAL_DAY');
  });

  it('does not create catch-up prompts for missed days', () => {
    const stateAfterAnsweringPriorDay = applyDailyPromptOutcome(
      '2026-03-20',
      createEmptyEmployeeClientLocalState(),
      'answered'
    );

    const decision = resolveLoginPromptDecision('2026-03-22', stateAfterAnsweringPriorDay, {
      managerEmail: 'mgr@example.com',
      role: 'engineer',
      level: 'l4'
    });

    expect(decision.shouldShowPrompt).toBe(true);
    expect(decision.reason).toBe('PROMPT_AVAILABLE');
  });

  it('keeps the day unfinalized when prompt is delayed on the same day', () => {
    const initialState = createEmptyEmployeeClientLocalState();
    const delayedState = applyDailyPromptOutcome('2026-03-22', initialState, 'delayed');

    expect(delayedState.lastAnsweredDay._tag).toBe('None');

    const decision = resolveLoginPromptDecision('2026-03-22', delayedState, {
      managerEmail: 'mgr@example.com',
      role: 'engineer',
      level: 'l4'
    });

    expect(decision.shouldShowPrompt).toBe(true);
  });

  it('updates local profile cache on login for payload composition', () => {
    const decision = resolveLoginPromptDecision('2026-03-22', createEmptyEmployeeClientLocalState(), {
      managerEmail: 'new-manager@example.com',
      role: 'designer',
      level: 'l5'
    });

    expect(isSome(decision.nextState.cachedProfile)).toBe(true);

    if (isSome(decision.nextState.cachedProfile)) {
      expect(decision.nextState.cachedProfile.value).toEqual({
        managerEmail: 'new-manager@example.com',
        role: 'designer',
        level: 'l5'
      });
    }
  });
});
