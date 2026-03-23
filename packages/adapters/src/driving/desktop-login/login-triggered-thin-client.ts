import type { EmployeeProfileSnapshot } from '../../../../core/src/application/employee-daily-prompt.js';
import type { Option } from '../../../../core/src/domain/option.js';
import { none } from '../../../../core/src/domain/option.js';
import type { VersionEndpointInput } from '../rest-api/version-endpoint.js';
import type {
  AnonymousSubmissionTransportInput,
  EmployeePromptLocalStateStore,
  EmployeePromptQuestion,
  PackagingPipelineSignal,
  PromptActionResult
} from '../web-ui/employee-daily-prompt-app.js';
import { handleEmployeePromptAction, runEmployeePromptLoginFlow } from '../web-ui/employee-daily-prompt-app.js';

export type ThinClientFetchResult = Readonly<
  | {
      readonly status: 'PROMPT_AVAILABLE';
      readonly localDay: string;
      readonly question: EmployeePromptQuestion;
      readonly versionInput: VersionEndpointInput;
      readonly packagingPipelineSignal: PackagingPipelineSignal | null;
      readonly anonymousSubmissionTransport: AnonymousSubmissionTransportInput | null;
    }
  | {
      readonly status: 'NO_PROMPT_AVAILABLE';
    }
  | {
      readonly status: 'FETCH_FAILED';
      readonly message: string;
    }
>;

export type ThinClientUserAction = Readonly<
  | {
      readonly action: 'answered';
      readonly selectedOptionId: Option<string>;
      readonly comment: Option<string>;
    }
  | {
      readonly action: 'skipped';
    }
>;

export type ThinClientSubmissionInput = Readonly<{
  readonly localDay: string;
  readonly question: EmployeePromptQuestion;
  readonly userAction: ThinClientUserAction;
  readonly promptActionResult: PromptActionResult;
}>;

export type ThinClientSubmissionResult = Readonly<
  | {
      readonly status: 'SUBMITTED';
    }
  | {
      readonly status: 'SUBMISSION_FAILED';
      readonly message: string;
    }
>;

export type ThinClientLaunchResult = Readonly<
  | {
      readonly status: 'EXITED_NO_PROMPT';
    }
  | {
      readonly status: 'EXITED_AFTER_SUBMISSION';
      readonly packagingStatus: PromptActionResult['packagingStatus'];
    }
  | {
      readonly status: 'EXITED_FETCH_FAILED';
      readonly message: string;
    }
  | {
      readonly status: 'EXITED_VALIDATION_FAILED';
      readonly message: string;
    }
  | {
      readonly status: 'EXITED_SUBMISSION_FAILED';
      readonly message: string;
    }
>;

export type LoginTriggeredThinClientInput = Readonly<{
  readonly profile: EmployeeProfileSnapshot;
  readonly stateStore: EmployeePromptLocalStateStore;
  readonly fetchPrompt: () => Promise<ThinClientFetchResult>;
  readonly presentPrompt: (input: Readonly<{ readonly promptHtml: string; readonly question: EmployeePromptQuestion }>) => Promise<ThinClientUserAction>;
  readonly submitPromptOutcome: (input: ThinClientSubmissionInput) => Promise<ThinClientSubmissionResult>;
}>;

/**
 * Runs one-shot login client flow:
 * fetch once, optionally render prompt, submit answer/skip, then exit.
 */
export const runLoginTriggeredThinClient = async (
  input: LoginTriggeredThinClientInput
): Promise<ThinClientLaunchResult> => {
  const fetched = await input.fetchPrompt();

  if (fetched.status === 'NO_PROMPT_AVAILABLE') {
    return { status: 'EXITED_NO_PROMPT' };
  }

  if (fetched.status === 'FETCH_FAILED') {
    return {
      status: 'EXITED_FETCH_FAILED',
      message: fetched.message
    };
  }

  const loginFlow = runEmployeePromptLoginFlow(
    fetched.localDay,
    input.profile,
    fetched.question,
    input.stateStore
  );

  if (loginFlow.promptComponentHtml === null) {
    return { status: 'EXITED_NO_PROMPT' };
  }

  const userAction = await input.presentPrompt({
    promptHtml: loginFlow.promptComponentHtml,
    question: fetched.question
  });

  const selectedOptionId =
    userAction.action === 'answered' ? userAction.selectedOptionId : none<string>();
  const comment = userAction.action === 'answered' ? userAction.comment : none<string>();

  const actionResult = handleEmployeePromptAction({
    localDay: fetched.localDay,
    action: userAction.action,
    question: fetched.question,
    selectedOptionId,
    comment,
    versionInput: fetched.versionInput,
    stateStore: input.stateStore,
    packagingPipelineSignal: fetched.packagingPipelineSignal,
    anonymousSubmissionTransport: fetched.anonymousSubmissionTransport
  });

  if (actionResult.responseValidationError !== null) {
    return {
      status: 'EXITED_VALIDATION_FAILED',
      message: actionResult.responseValidationError
    };
  }

  const submission = await input.submitPromptOutcome({
    localDay: fetched.localDay,
    question: fetched.question,
    userAction,
    promptActionResult: actionResult
  });

  if (submission.status === 'SUBMISSION_FAILED') {
    return {
      status: 'EXITED_SUBMISSION_FAILED',
      message: submission.message
    };
  }

  return {
    status: 'EXITED_AFTER_SUBMISSION',
    packagingStatus: actionResult.packagingStatus
  };
};
