import type { Either } from 'fp-ts/Either';
import { none, some, type Option } from 'fp-ts/Option';
import {
  applyDailyPromptOutcome,
  createEmptyEmployeeClientLocalState,
  resolveLoginPromptDecision,
  type EmployeeClientLocalState,
  type EmployeeProfileSnapshot
} from '../../../../core/src/application/employee-daily-prompt.js';
import {
  createUnlinkableSubmissionArtifacts,
  type CreateUnlinkableSubmissionArtifactsError,
  type CreateUnlinkableSubmissionArtifactsResult,
  type ParticipationPromptState
} from '../../../../core/src/application/create-unlinkable-submission.js';
import type { VersionEndpointInput } from '../rest-api/version-endpoint.js';
import { createEmployeePromptPresentationModel } from './employee-prompt-presentation-model.js';
import {
  renderEmployeeDailyPromptComponent,
  type EmployeePromptQuestionOption
} from './employee-daily-prompt-component.js';
import { createTransparencyPanelModel, type PackagingStatus } from './transparency-panel-model.js';
import { renderTransparencyPanelComponent } from './transparency-panel-component.js';

export type EmployeePromptQuestion = Readonly<{
  readonly id: string;
  readonly text: string;
  readonly options: readonly (EmployeePromptQuestionOption & Readonly<{ readonly normalizedScore: number }>)[];
  readonly commentEnabled: boolean;
}>;

export type EmployeePromptLocalStateStore = Readonly<{
  readonly load: () => EmployeeClientLocalState;
  readonly save: (state: EmployeeClientLocalState) => void;
}>;

export type LoginFlowResult = Readonly<{
  readonly decision: ReturnType<typeof resolveLoginPromptDecision>;
  readonly promptComponentHtml: string | null;
}>;

export const runEmployeePromptLoginFlow = (
  localDay: string,
  profile: EmployeeProfileSnapshot,
  question: EmployeePromptQuestion,
  stateStore: EmployeePromptLocalStateStore
): LoginFlowResult => {
  const loadedState = stateStore.load();
  const decision = resolveLoginPromptDecision(localDay, loadedState, profile);
  stateStore.save(decision.nextState);

  if (!decision.shouldShowPrompt) {
    return {
      decision,
      promptComponentHtml: null
    };
  }

  const promptModel = createEmployeePromptPresentationModel({
    promptLocalDay: localDay,
    currentLocalDay: localDay,
    commentEnabled: question.commentEnabled
  });

  return {
    decision,
    promptComponentHtml: renderEmployeeDailyPromptComponent({
      questionId: question.id,
      questionText: question.text,
      options: question.options,
      model: promptModel
    })
  };
};

export type PackagingPipelineSignal = 'ENCRYPTED_TRANSPORT_READY' | 'UNAVAILABLE' | 'FAILED';

export type PromptActionInput = Readonly<{
  readonly localDay: string;
  readonly action: ParticipationPromptState;
  readonly question: EmployeePromptQuestion;
  readonly selectedOptionId: Option<string>;
  readonly comment: Option<string>;
  readonly versionInput: VersionEndpointInput;
  readonly stateStore: EmployeePromptLocalStateStore;
  readonly packagingPipelineSignal: PackagingPipelineSignal | null;
}>;

export type PromptActionResult = Readonly<{
  readonly nextState: EmployeeClientLocalState;
  readonly packagingStatus: PackagingStatus;
  readonly transparencyPanelHtml: string;
  readonly responseValidationError: string | null;
}>;

const buildResponsePayload = (
  input: PromptActionInput,
  profile: EmployeeProfileSnapshot | null
): Readonly<Partial<Record<string, string | number>>> => {
  if (input.action !== 'answered' || profile === null || input.selectedOptionId._tag === 'None') {
    return {};
  }

  const selectedOptionId = input.selectedOptionId.value;
  const selectedOption = input.question.options.find((option) => option.id === selectedOptionId);

  if (selectedOption === undefined) {
    return {};
  }

  return {
    question_id: input.question.id,
    normalized_score: selectedOption.normalizedScore,
    manager_email: profile.managerEmail,
    role: profile.role,
    level: profile.level,
    survey_day: input.localDay,
    ...(input.comment._tag === 'Some' && input.comment.value.length > 0
      ? { optional_comment: input.comment.value }
      : {})
  };
};

const buildArtifactResult = (
  input: PromptActionInput,
  responsePayload: Readonly<Partial<Record<string, string | number>>>
): Either<CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult> | null => {
  if (input.action !== 'answered') {
    return null;
  }

  return createUnlinkableSubmissionArtifacts({
    responsePayload,
    participationEvent: {
      participation_day: input.localDay,
      prompt_state: input.action
    }
  });
};

const mapPackagingSignal = (
  artifactResult: Either<CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult> | null,
  signal: PackagingPipelineSignal | null
): PackagingStatus => {
  if (signal === 'ENCRYPTED_TRANSPORT_READY') {
    return 'PACKAGED_AND_ENCRYPTED';
  }

  if (signal === 'FAILED' || signal === 'UNAVAILABLE') {
    return 'NOT_PACKAGED';
  }

  return artifactResult !== null && artifactResult._tag === 'Right'
    ? 'PACKAGED_AND_ENCRYPTED'
    : 'NOT_PACKAGED';
};

export const handleEmployeePromptAction = (input: PromptActionInput): PromptActionResult => {
  const loadedState = input.stateStore.load();

  if (input.action === 'answered' && input.selectedOptionId._tag === 'None') {
    return {
      nextState: loadedState,
      packagingStatus: 'NOT_PACKAGED',
      transparencyPanelHtml: renderTransparencyPanelComponent(
        createTransparencyPanelModel({}, input.versionInput, 'NOT_PACKAGED')
      ),
      responseValidationError: 'A single option must be selected before submitting.'
    };
  }

  const profile = loadedState.cachedProfile._tag === 'Some' ? loadedState.cachedProfile.value : null;
  const responsePayload = buildResponsePayload(input, profile);
  const artifactResult = buildArtifactResult(input, responsePayload);
  const packagingStatus = mapPackagingSignal(artifactResult, input.packagingPipelineSignal);

  const updatedState = applyDailyPromptOutcome(input.localDay, loadedState, input.action);
  input.stateStore.save(updatedState);

  return {
    nextState: updatedState,
    packagingStatus,
    transparencyPanelHtml: renderTransparencyPanelComponent(
      createTransparencyPanelModel(responsePayload, input.versionInput, packagingStatus)
    ),
    responseValidationError:
      artifactResult !== null && artifactResult._tag === 'Left'
        ? artifactResult.left.message
        : null
  };
};

export const createInMemoryEmployeePromptStateStore = (
  initialState: EmployeeClientLocalState = createEmptyEmployeeClientLocalState()
): EmployeePromptLocalStateStore => {
  let currentState = initialState;

  return {
    load: () => currentState,
    save: (state) => {
      currentState = state;
    }
  };
};

export const someText = (value: string): Option<string> => some(value);
export const noText = (): Option<string> => none;
