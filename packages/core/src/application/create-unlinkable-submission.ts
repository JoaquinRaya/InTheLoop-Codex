import type { Either } from 'fp-ts/Either';
import { left, right } from 'fp-ts/Either';
import { validateResponsePayload } from './validate-response-payload.js';
import { isProhibitedIdentityOrCorrelationKey } from '../domain/prd-01-trust-rules.js';
import type { ResponsePayload } from '../domain/response-payload.js';

export type ParticipationPromptState = 'answered' | 'skipped' | 'delayed';

export type ParticipationEventInput = Readonly<Record<string, string>> &
  Readonly<{
    readonly participation_day: string;
    readonly prompt_state: ParticipationPromptState;
  }>;

export type CreateUnlinkableSubmissionArtifactsInput = Readonly<{
  readonly responsePayload: Readonly<Partial<Record<string, string | number>>>;
  readonly participationEvent: ParticipationEventInput;
}>;

export type ParticipationArtifact = Readonly<{
  readonly participationDay: string;
  readonly promptState: ParticipationPromptState;
}>;

export type SubmissionUnlinkabilityAudit = Readonly<{
  readonly unexpectedSharedFields: ReadonlyArray<string>;
  readonly containsCorrelationKey: boolean;
}>;

export type CreateUnlinkableSubmissionArtifactsError = Readonly<{
  readonly code: 'INVALID_RESPONSE_PAYLOAD' | 'PROHIBITED_PARTICIPATION_METADATA' | 'LINKABILITY_DETECTED';
  readonly message: string;
}>;

export type CreateUnlinkableSubmissionArtifactsResult = Readonly<{
  readonly participationArtifact: ParticipationArtifact;
  readonly responseArtifact: ResponsePayload;
  readonly audit: SubmissionUnlinkabilityAudit;
}>;

const sharedFieldAllowlist = ['survey_day'] as const;

const isAllowedSharedField = (field: string): boolean =>
  sharedFieldAllowlist.some((allowedField) => allowedField === field);

const normalizeResponseKeys = (payload: ResponsePayload): ReadonlyArray<string> => [
  'question_id',
  'normalized_score',
  'optional_comment',
  'manager_email',
  'role',
  'level',
  'survey_day'
].filter((key) => key !== 'optional_comment' || payload.optionalComment._tag === 'Some');

const createError = (
  code: CreateUnlinkableSubmissionArtifactsError['code'],
  message: string
): CreateUnlinkableSubmissionArtifactsError => ({
  code,
  message
});

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
