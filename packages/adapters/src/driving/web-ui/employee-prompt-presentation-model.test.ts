import { describe, expect, it } from 'vitest';
import { createEmployeePromptPresentationModel } from './employee-prompt-presentation-model.js';

describe('createEmployeePromptPresentationModel', () => {
  it('enforces single-select with optional comments and always-available skip', () => {
    const model = createEmployeePromptPresentationModel({
      promptLocalDay: '2026-03-22',
      currentLocalDay: '2026-03-22',
      commentEnabled: true
    });

    expect(model.questionInputMode).toBe('SINGLE_SELECT');
    expect(model.commentInput).toEqual({
      enabled: true,
      required: false
    });
    expect(model.actions.canSkip).toBe(true);
  });

  it('allows delay only when the prompt day matches the current local day', () => {
    const sameDay = createEmployeePromptPresentationModel({
      promptLocalDay: '2026-03-22',
      currentLocalDay: '2026-03-22',
      commentEnabled: false
    });

    const nextDay = createEmployeePromptPresentationModel({
      promptLocalDay: '2026-03-22',
      currentLocalDay: '2026-03-23',
      commentEnabled: false
    });

    expect(sameDay.actions.canDelay).toBe(true);
    expect(nextDay.actions.canDelay).toBe(false);
  });
});
