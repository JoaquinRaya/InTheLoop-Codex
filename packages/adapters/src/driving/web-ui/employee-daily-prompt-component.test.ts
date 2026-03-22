import { describe, expect, it } from 'vitest';
import { createEmployeePromptPresentationModel } from './employee-prompt-presentation-model.js';
import { renderEmployeeDailyPromptComponent } from './employee-daily-prompt-component.js';

describe('renderEmployeeDailyPromptComponent', () => {
  it('renders question, options, optional comment, and skip/delay actions', () => {
    const html = renderEmployeeDailyPromptComponent({
      questionId: 'q-1',
      questionText: 'How was your day?',
      options: [
        { id: 'o-1', label: 'Great' },
        { id: 'o-2', label: 'Okay' }
      ],
      model: createEmployeePromptPresentationModel({
        promptLocalDay: '2026-03-22',
        currentLocalDay: '2026-03-22',
        commentEnabled: true
      })
    });

    expect(html).toContain('data-component="employee-daily-prompt"');
    expect(html).toContain('type="radio"');
    expect(html).toContain('Comment (optional)');
    expect(html).toContain('data-action="skip"');
    expect(html).toContain('data-action="delay"');
    expect(html).not.toContain('data-action="delay" disabled');
  });

  it('disables delay action outside prompt local day and omits comment when disabled', () => {
    const html = renderEmployeeDailyPromptComponent({
      questionId: 'q-1',
      questionText: 'How was your day?',
      options: [{ id: 'o-1', label: 'Great' }],
      model: createEmployeePromptPresentationModel({
        promptLocalDay: '2026-03-22',
        currentLocalDay: '2026-03-23',
        commentEnabled: false
      })
    });

    expect(html).toContain('data-action="delay" disabled');
    expect(html).not.toContain('Comment (optional)');
  });
});
