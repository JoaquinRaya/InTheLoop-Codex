import type { EmployeePromptPresentationModel } from './employee-prompt-presentation-model.js';

export type EmployeePromptQuestionOption = Readonly<{
  readonly id: string;
  readonly label: string;
}>;

export type EmployeeDailyPromptComponentInput = Readonly<{
  readonly questionId: string;
  readonly questionText: string;
  readonly options: readonly EmployeePromptQuestionOption[];
  readonly model: EmployeePromptPresentationModel;
}>;

/**
 * renderOptions.
 */
const renderOptions = (questionId: string, options: readonly EmployeePromptQuestionOption[]): string =>
  options
    .map(
      (option) =>
        `<label><input type="radio" name="${questionId}" value="${option.id}" /> ${option.label}</label>`
    )
    .join('');

/**
 * renderEmployeeDailyPromptComponent.
 */
export const renderEmployeeDailyPromptComponent = (
  input: EmployeeDailyPromptComponentInput
): string => {
  const commentSection = input.model.commentInput.enabled
    ? '<label>Comment (optional)<textarea name="comment"></textarea></label>'
    : '';

  const delayDisabledAttribute = input.model.actions.canDelay ? '' : ' disabled';

  return `<section data-component="employee-daily-prompt"><h2>${input.questionText}</h2><form>${renderOptions(input.questionId, input.options)}${commentSection}<div><button type="submit">Submit</button><button type="button" data-action="skip">Skip</button><button type="button" data-action="delay"${delayDisabledAttribute}>Delay</button></div></form></section>`;
};
