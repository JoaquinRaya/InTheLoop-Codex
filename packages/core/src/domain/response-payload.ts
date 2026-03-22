/**
 * Domain model for accepted response payload fields (PRD-01 trust constraints).
 */
import type { Option } from './option.js';

/**
 * Allowlisted fields accepted on inbound response payloads.
 */
export const allowedResponseKeys = [
  'question_id',
  'normalized_score',
  'optional_comment',
  'manager_email',
  'role',
  'level',
  'survey_day'
] as const;

export type AllowedResponseKey = (typeof allowedResponseKeys)[number];

/**
 * Canonical domain representation for a validated response payload.
 */
export type ResponsePayload = Readonly<{
  readonly questionId: string;
  readonly normalizedScore: number;
  readonly optionalComment: Option<string>;
  readonly managerEmail: string;
  readonly role: string;
  readonly level: string;
  readonly surveyDay: string;
}>;

/**
 * Validation error model returned when payload policy constraints fail.
 */
export type PayloadValidationError = Readonly<{
  readonly code: 'PROHIBITED_OR_UNKNOWN_FIELD' | 'INVALID_SCORE_RANGE' | 'MISSING_REQUIRED_FIELD';
  readonly message: string;
}>;
