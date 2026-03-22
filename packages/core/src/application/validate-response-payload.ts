import { none, some } from 'fp-ts/Option';
import type { Either } from 'fp-ts/Either';
import { left, right } from 'fp-ts/Either';
import {
  allowedResponseKeys,
  type PayloadValidationError,
  type ResponsePayload
} from '../domain/response-payload.js';
import { isProhibitedIdentityOrCorrelationKey } from '../domain/prd-01-trust-rules.js';

const requiredKeys = [
  'question_id',
  'normalized_score',
  'manager_email',
  'role',
  'level',
  'survey_day'
] as const;

const isAllowedKey = (key: string): boolean =>
  allowedResponseKeys.some((allowedKey) => allowedKey === key);

const hasAllRequiredFields = (
  payload: Readonly<Partial<Record<(typeof allowedResponseKeys)[number], string | number>>>
): payload is Readonly<
  Partial<Record<(typeof allowedResponseKeys)[number], string | number>> &
    Record<(typeof requiredKeys)[number], string | number>
> => requiredKeys.every((key) => payload[key] !== undefined);

const error = (code: PayloadValidationError['code'], message: string): PayloadValidationError => ({
  code,
  message
});

export const validateResponsePayload = (
  payload: Readonly<Partial<Record<string, string | number>>>
): Either<PayloadValidationError, ResponsePayload> => {
  const keys = Object.keys(payload);

  if (keys.some((key) => isProhibitedIdentityOrCorrelationKey(key))) {
    return left(
      error(
        'PROHIBITED_OR_UNKNOWN_FIELD',
        'Payload contains prohibited identity or correlation metadata and cannot be accepted.'
      )
    );
  }

  if (keys.some((key) => !isAllowedKey(key))) {
    return left(
      error(
        'PROHIBITED_OR_UNKNOWN_FIELD',
        'Payload contains prohibited or unknown fields and cannot be accepted.'
      )
    );
  }

  if (!hasAllRequiredFields(payload)) {
    return left(error('MISSING_REQUIRED_FIELD', 'Payload is missing one or more required fields.'));
  }

  const normalizedScore = payload.normalized_score;

  if (typeof normalizedScore !== 'number' || normalizedScore < 1 || normalizedScore > 100) {
    return left(error('INVALID_SCORE_RANGE', 'normalized_score must be a number between 1 and 100.'));
  }

  const optionalCommentValue = payload.optional_comment;

  return right({
    questionId: String(payload.question_id),
    normalizedScore,
    optionalComment:
      typeof optionalCommentValue === 'string' && optionalCommentValue.length > 0
        ? some(optionalCommentValue)
        : none,
    managerEmail: String(payload.manager_email),
    role: String(payload.role),
    level: String(payload.level),
    surveyDay: String(payload.survey_day)
  });
};
