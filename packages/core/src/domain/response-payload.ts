import type { Option } from 'fp-ts/Option';

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

export type ResponsePayload = Readonly<{
  readonly questionId: string;
  readonly normalizedScore: number;
  readonly optionalComment: Option<string>;
  readonly managerEmail: string;
  readonly role: string;
  readonly level: string;
  readonly surveyDay: string;
}>;

export type PayloadValidationError = Readonly<{
  readonly code: 'PROHIBITED_OR_UNKNOWN_FIELD' | 'INVALID_SCORE_RANGE' | 'MISSING_REQUIRED_FIELD';
  readonly message: string;
}>;
