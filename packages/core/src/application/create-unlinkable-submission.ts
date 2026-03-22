/**
 * PRD-01 application service for building unlinkable participation/response artifacts.
 */
import type { Either } from '../domain/either.js';
import { left, right } from '../domain/either.js';
import { validateResponsePayload } from './validate-response-payload.js';
import { isProhibitedIdentityOrCorrelationKey } from '../domain/prd-01-trust-rules.js';
import type { ResponsePayload } from '../domain/response-payload.js';

/**
 * Prompt-state outcome carried by participation artifact records.
 */
export type ParticipationPromptState = 'answered' | 'skipped' | 'delayed';

/**
 * Raw participation artifact input constrained to allowlisted fields.
 */
export type ParticipationEventInput = Readonly<Record<string, string>> &
  Readonly<{
    readonly participation_day: string;
    readonly prompt_state: ParticipationPromptState;
  }>;

/**
 * Input contract for generating unlinkable submission artifacts.
 */
export type CreateUnlinkableSubmissionArtifactsInput = Readonly<{
  readonly responsePayload: Readonly<Partial<Record<string, string | number>>>;
  readonly participationEvent: ParticipationEventInput;
}>;

/**
 * Participation-side artifact after policy validation.
 */
export type ParticipationArtifact = Readonly<{
  readonly participationDay: string;
  readonly promptState: ParticipationPromptState;
}>;

/**
 * Linkability audit result between participation and response artifacts.
 */
export type SubmissionUnlinkabilityAudit = Readonly<{
  readonly unexpectedSharedFields: ReadonlyArray<string>;
  readonly containsCorrelationKey: boolean;
}>;

/**
 * Error model for unlinkable-submission artifact generation.
 */
export type CreateUnlinkableSubmissionArtifactsError = Readonly<{
  readonly code: 'INVALID_RESPONSE_PAYLOAD' | 'PROHIBITED_PARTICIPATION_METADATA' | 'LINKABILITY_DETECTED';
  readonly message: string;
}>;

/**
 * Successful unlinkable submission artifacts and audit details.
 */
export type CreateUnlinkableSubmissionArtifactsResult = Readonly<{
  readonly participationArtifact: ParticipationArtifact;
  readonly responseArtifact: ResponsePayload;
  readonly audit: SubmissionUnlinkabilityAudit;
}>;

const sharedFieldAllowlist = ['survey_day'] as const;

const isAllowedSharedField = (field: string): boolean =>
  sharedFieldAllowlist.some((allowedField) => allowedField === field);

/**
 * Normalizes canonical response keys for shared-field linkability checks.
 */
const normalizeResponseKeys = (payload: ResponsePayload): ReadonlyArray<string> => [
  'question_id',
  'normalized_score',
  'optional_comment',
  'manager_email',
  'role',
  'level',
  'survey_day'
].filter((key) => key !== 'optional_comment' || payload.optionalComment._tag === 'Some');

/**
 * Creates a typed unlinkable-artifacts error.
 */
const createError = (
  code: CreateUnlinkableSubmissionArtifactsError['code'],
  message: string
): CreateUnlinkableSubmissionArtifactsError => ({
  code,
  message
});

/**
 * Validates participation input against prohibited identity/correlation metadata.
 */
const validateParticipationEvent = (
  participationEvent: ParticipationEventInput
): Either<CreateUnlinkableSubmissionArtifactsError, ParticipationArtifact> => {
  const participationKeys = Object.keys(participationEvent);

  if (participationKeys.some((key) => isProhibitedIdentityOrCorrelationKey(key))) {
    return left(
      createError(
        'PROHIBITED_PARTICIPATION_METADATA',
        'Participation artifact contains prohibited identity or correlation metadata.'
      )
    );
  }

  return right({
    participationDay: participationEvent.participation_day,
    promptState: participationEvent.prompt_state
  });
};

/**
 * Computes cross-artifact linkability signals.
 */
const auditLinkability = (
  participationEvent: ParticipationEventInput,
  responsePayload: ResponsePayload
): SubmissionUnlinkabilityAudit => {
  const responseKeys = normalizeResponseKeys(responsePayload);
  const participationKeys = Object.keys(participationEvent);
  const unexpectedSharedFields = participationKeys.filter(
    (key) => responseKeys.some((responseKey) => responseKey === key) && !isAllowedSharedField(key)
  );

  return {
    unexpectedSharedFields,
    containsCorrelationKey: participationKeys.some((key) => isProhibitedIdentityOrCorrelationKey(key))
  };
};

/**
 * Produces unlinkable participation and response artifacts from raw inputs.
 */
export const createUnlinkableSubmissionArtifacts = (
  input: CreateUnlinkableSubmissionArtifactsInput
): Either<CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult> => {
  const responseValidation = validateResponsePayload(input.responsePayload);

  if (responseValidation._tag === 'Left') {
    return left(
      createError('INVALID_RESPONSE_PAYLOAD', responseValidation.left.message)
    );
  }

  const participationValidation = validateParticipationEvent(input.participationEvent);

  if (participationValidation._tag === 'Left') {
    return left(participationValidation.left);
  }

  const audit = auditLinkability(input.participationEvent, responseValidation.right);

  if (audit.unexpectedSharedFields.length > 0 || audit.containsCorrelationKey) {
    return left(
      createError(
        'LINKABILITY_DETECTED',
        'Participation and response artifacts are linkable and cannot be accepted.'
      )
    );
  }

  return right({
    participationArtifact: participationValidation.right,
    responseArtifact: responseValidation.right,
    audit
  });
};
