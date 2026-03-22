import type { EmployeeProfileSnapshot } from '../../../../core/src/application/employee-daily-prompt.js';
import {
  handleEmployeePromptAction,
  runEmployeePromptLoginFlow,
  type EmployeePromptQuestion,
  type PackagingPipelineSignal,
  type PromptActionResult
} from './employee-daily-prompt-app.js';
import type { EmployeePromptLocalStateStore } from './employee-daily-prompt-app.js';
import type { VersionEndpointInput } from '../rest-api/version-endpoint.js';
import {
  noText,
  type AnonymousSubmissionTransportInput,
  type PromptActionInput
} from './employee-daily-prompt-app.js';

export type BrowserSignInInput = Readonly<{
  readonly isCompanyComputer: boolean;
  readonly localDay: string;
  readonly profile: EmployeeProfileSnapshot;
  readonly question: EmployeePromptQuestion;
  readonly stateStore: EmployeePromptLocalStateStore;
}>;

export type BrowserSignInResult = Readonly<{
  readonly promptHtml: string | null;
  readonly reason: 'NOT_COMPANY_COMPUTER' | 'PROMPT_NOT_AVAILABLE' | 'PROMPT_RENDERED';
}>;

export const runPromptOnEmployeeSignIn = (input: BrowserSignInInput): BrowserSignInResult => {
  if (!input.isCompanyComputer) {
    return {
      promptHtml: null,
      reason: 'NOT_COMPANY_COMPUTER'
    };
  }

  const loginFlow = runEmployeePromptLoginFlow(
    input.localDay,
    input.profile,
    input.question,
    input.stateStore
  );

  if (loginFlow.promptComponentHtml === null) {
    return {
      promptHtml: null,
      reason: 'PROMPT_NOT_AVAILABLE'
    };
  }

  return {
    promptHtml: loginFlow.promptComponentHtml,
    reason: 'PROMPT_RENDERED'
  };
};

export type BrowserPromptActionInput = Readonly<{
  readonly localDay: string;
  readonly question: EmployeePromptQuestion;
  readonly versionInput: VersionEndpointInput;
  readonly stateStore: EmployeePromptLocalStateStore;
  readonly packagingPipelineSignal: PackagingPipelineSignal | null;
  readonly anonymousSubmissionTransport: AnonymousSubmissionTransportInput | null;
}>;

export const skipPromptInBrowserRuntime = (input: BrowserPromptActionInput): PromptActionResult =>
  handleEmployeePromptAction({
    localDay: input.localDay,
    action: 'skipped',
    question: input.question,
    selectedOptionId: noText(),
    comment: noText(),
    versionInput: input.versionInput,
    stateStore: input.stateStore,
    packagingPipelineSignal: input.packagingPipelineSignal,
    anonymousSubmissionTransport: input.anonymousSubmissionTransport
  } satisfies PromptActionInput);
