/**
 * Driving web-ui adapter that orchestrates PRD-02 prompt flows with core use cases.
 */
import type { Either } from '../../../../core/src/domain/either.js';
import { none, some, type Option } from '../../../../core/src/domain/option.js';
import {
  applyDailyPromptOutcome,
  createEmptyEmployeeClientLocalState,
  resolveLoginPromptDecision,
  type EmployeeClientLocalState,
  type EmployeeProfileSnapshot
} from '../../../../core/src/application/employee-daily-prompt.js';
import type { ForEmployeePromptLocalStateStorage } from '../../../../core/src/ports/driven/for-employee-prompt-local-state-storage.js';
import type {
  ForApplyingEmployeeDailyPromptOutcome,
  ForResolvingEmployeeDailyPromptDecision
} from '../../../../core/src/ports/driving/for-employee-daily-prompt.js';
import type { ForCreatingUnlinkableSubmissionArtifacts } from '../../../../core/src/ports/driving/for-unlinkable-submission-artifacts.js';
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
import {
  prepareDelayedAnonymousSubmission,
  type AnonymousSubmissionDelayConfig
} from './anonymous-submission-client.js';

/**
 * View-model input for a prompt question rendered to employees.
 */
export type EmployeePromptQuestion = Readonly<{
  readonly id: string;
  readonly text: string;
  readonly options: readonly (EmployeePromptQuestionOption & Readonly<{ readonly normalizedScore: number }>)[];
  readonly commentEnabled: boolean;
}>;

/**
 * Adapter-local alias for the driven state-storage port.
 */
export type EmployeePromptLocalStateStore = ForEmployeePromptLocalStateStorage;

/**
 * Result of the sign-in prompt decision/rendering flow.
 */
export type LoginFlowResult = Readonly<{
  readonly decision: ReturnType<typeof resolveLoginPromptDecision>;
  readonly promptComponentHtml: string | null;
}>;

/**
 * Default driving-port binding for prompt decision resolution.
 */
const resolveDailyPromptDecisionPort: ForResolvingEmployeeDailyPromptDecision = resolveLoginPromptDecision;
/**
 * Default driving-port binding for prompt outcome application.
 */
const applyDailyPromptOutcomePort: ForApplyingEmployeeDailyPromptOutcome = applyDailyPromptOutcome;
/**
 * Default driving-port binding for unlinkable artifact generation.
 */
const createUnlinkableSubmissionArtifactsPort: ForCreatingUnlinkableSubmissionArtifacts =
  createUnlinkableSubmissionArtifacts;

/**
 * Runs sign-in flow and returns prompt HTML when prompt is available.
 */
export const runEmployeePromptLoginFlow = (
  localDay: string,
  profile: EmployeeProfileSnapshot,
  question: EmployeePromptQuestion,
  stateStore: EmployeePromptLocalStateStore
): LoginFlowResult => {
  const loadedState = stateStore.loadState();
  const decision = resolveDailyPromptDecisionPort(localDay, loadedState, profile);
  stateStore.saveState(decision.nextState);

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

/**
 * Runtime signal from packaging/encryption pipeline.
 */
export type PackagingPipelineSignal = 'ENCRYPTED_TRANSPORT_READY' | 'UNAVAILABLE' | 'FAILED';

/**
 * Input contract for handling employee prompt actions.
 */
export type PromptActionInput = Readonly<{
  readonly localDay: string;
  readonly action: ParticipationPromptState;
  readonly question: EmployeePromptQuestion;
  readonly selectedOptionId: Option<string>;
  readonly comment: Option<string>;
  readonly versionInput: VersionEndpointInput;
  readonly stateStore: EmployeePromptLocalStateStore;
  readonly packagingPipelineSignal: PackagingPipelineSignal | null;
  readonly anonymousSubmissionTransport: AnonymousSubmissionTransportInput | null;
}>;

/**
 * Optional runtime transport inputs for PRD-04 delayed anonymous submission.
 */
export type AnonymousSubmissionTransportInput = Readonly<{
  readonly encryptedPayload: string;
  readonly receivedAtEpochMs: number;
  readonly transportMetadata: Readonly<Record<string, string>>;
  readonly randomUnitInterval: number;
  readonly delayConfig: AnonymousSubmissionDelayConfig;
}>;

/**
 * Result contract for handled prompt actions.
 */
export type PromptActionResult = Readonly<{
  readonly nextState: EmployeeClientLocalState;
  readonly packagingStatus: PackagingStatus;
  readonly transparencyPanelHtml: string;
  readonly responseValidationError: string | null;
  readonly scheduledAnonymousSubmissionDelayMs: number | null;
}>;

/**
 * Builds a raw response payload from action input and cached profile context.
 */
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

/**
 * Produces unlinkable artifacts only for answered actions.
 */
const buildArtifactResult = (
  input: PromptActionInput,
  responsePayload: Readonly<Partial<Record<string, string | number>>>
): Either<CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult> | null => {
  if (input.action !== 'answered') {
    return null;
  }

  return createUnlinkableSubmissionArtifactsPort({
    responsePayload,
    participationEvent: {
      participation_day: input.localDay,
      prompt_state: input.action
    }
  });
};

/**
 * Maps packaging/runtime signals and artifact outcomes to a display status.
 */
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

/**
 * Handles answered/skipped/delayed prompt actions and returns transparency output.
 */
export const handleEmployeePromptAction = (input: PromptActionInput): PromptActionResult => {
  const loadedState = input.stateStore.loadState();

  if (input.action === 'answered' && input.selectedOptionId._tag === 'None') {
    return {
      nextState: loadedState,
      packagingStatus: 'NOT_PACKAGED',
      transparencyPanelHtml: renderTransparencyPanelComponent(
        createTransparencyPanelModel({}, input.versionInput, 'NOT_PACKAGED')
      ),
      responseValidationError: 'A single option must be selected before submitting.',
      scheduledAnonymousSubmissionDelayMs: null
    };
  }

  const profile = loadedState.cachedProfile._tag === 'Some' ? loadedState.cachedProfile.value : null;
  const responsePayload = buildResponsePayload(input, profile);
  const artifactResult = buildArtifactResult(input, responsePayload);
  const delayedAnonymousSubmission =
    artifactResult !== null &&
    artifactResult._tag === 'Right' &&
    input.anonymousSubmissionTransport !== null
      ? prepareDelayedAnonymousSubmission({
          payloadCiphertext: input.anonymousSubmissionTransport.encryptedPayload,
          receivedAtEpochMs: input.anonymousSubmissionTransport.receivedAtEpochMs,
          transportMetadata: input.anonymousSubmissionTransport.transportMetadata,
          randomUnitInterval: input.anonymousSubmissionTransport.randomUnitInterval,
          delayConfig: input.anonymousSubmissionTransport.delayConfig
        })
      : null;

  const derivedPackagingSignal: PackagingPipelineSignal | null =
    delayedAnonymousSubmission !== null && delayedAnonymousSubmission._tag === 'Left'
      ? 'FAILED'
      : input.packagingPipelineSignal;

  const packagingStatus = mapPackagingSignal(artifactResult, derivedPackagingSignal);

  const updatedState = applyDailyPromptOutcomePort(input.localDay, loadedState, input.action);
  input.stateStore.saveState(updatedState);

  return {
    nextState: updatedState,
    packagingStatus,
    transparencyPanelHtml: renderTransparencyPanelComponent(
      createTransparencyPanelModel(responsePayload, input.versionInput, packagingStatus)
    ),
    responseValidationError:
      delayedAnonymousSubmission !== null && delayedAnonymousSubmission._tag === 'Left'
        ? delayedAnonymousSubmission.left.message
        :
      artifactResult !== null && artifactResult._tag === 'Left'
        ? artifactResult.left.message
        : null,
    scheduledAnonymousSubmissionDelayMs:
      delayedAnonymousSubmission !== null && delayedAnonymousSubmission._tag === 'Right'
        ? delayedAnonymousSubmission.right.delayMs
        : null
  };
};

/**
 * Creates in-memory implementation of the state-storage driven port.
 */
export const createInMemoryEmployeePromptStateStore = (
  initialState: EmployeeClientLocalState = createEmptyEmployeeClientLocalState()
): EmployeePromptLocalStateStore => {
  const stateStore = new Map<'current', EmployeeClientLocalState>([['current', initialState]]);
  const currentState = (): EmployeeClientLocalState => stateStore.get('current') ?? initialState;

  return {
    loadState: () => currentState(),
    saveState: (state) => {
      stateStore.set('current', state);
    }
  };
};

/**
 * Convenience helper to create `Some<string>` for UI actions.
 */
export const someText = (value: string): Option<string> => some(value);
/**
 * Convenience helper to create `None<string>` for UI actions.
 */
export const noText = (): Option<string> => none();
