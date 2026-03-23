export type EmployeePromptPresentationModel = Readonly<{
  readonly questionInputMode: 'SINGLE_SELECT';
  readonly commentInput: Readonly<{
    readonly enabled: boolean;
    readonly required: false;
  }>;
  readonly actions: Readonly<{
    readonly canSkip: true;
    readonly canDelay: boolean;
  }>;
}>;

export type EmployeePromptPresentationInput = Readonly<{
  readonly promptLocalDay: string;
  readonly currentLocalDay: string;
  readonly commentEnabled: boolean;
}>;

/**
 * createEmployeePromptPresentationModel.
 */
export const createEmployeePromptPresentationModel = (
  input: EmployeePromptPresentationInput
): EmployeePromptPresentationModel => ({
  questionInputMode: 'SINGLE_SELECT',
  commentInput: {
    enabled: input.commentEnabled,
    required: false
  },
  actions: {
    canSkip: true,
    canDelay: input.promptLocalDay === input.currentLocalDay
  }
});
