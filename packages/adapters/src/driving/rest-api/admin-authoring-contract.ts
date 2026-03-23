import { left, right, type Either } from '../../../../core/src/domain/either.js';
import {
  type AdminAuthoringEmployeeProfile,
  type AdminAuthoringQuestion,
  type QuestionAudienceTarget
} from '../../../../core/src/application/admin-authoring.js';
import {
  type AuthoringQuestionInput,
  parseAndValidateQuestionAuthoringBatch
} from './question-authoring-contract.js';

export type AuthoringTargetInput =
  | Readonly<{ readonly type: 'whole_company' }>
  | Readonly<{ readonly type: 'manager_subtree'; readonly manager_email: string }>
  | Readonly<{ readonly type: 'group'; readonly group_id: string }>;

export type AdminAuthoringQuestionInput = AuthoringQuestionInput & Readonly<{
  readonly target: AuthoringTargetInput;
  readonly first_displayed_at?: string;
}>;

export type AdminAuthoringBatchInput = Readonly<{
  readonly questions: readonly AdminAuthoringQuestionInput[];
}>;

export type AdminPreviewInput = Readonly<{
  readonly timestamp_utc_iso: string;
  readonly time_zone: string;
  readonly profile: Readonly<{
    readonly manager_email?: string;
    readonly manager_ancestry_emails: readonly string[];
    readonly group_ids: readonly string[];
  }>;
}>;

const toAudienceTarget = (target: AuthoringTargetInput): QuestionAudienceTarget => {
  if (target.type === 'whole_company') {
    return { type: 'whole-company' };
  }

  if (target.type === 'manager_subtree') {
    return { type: 'manager-subtree', managerEmail: target.manager_email };
  }

  return { type: 'group', groupId: target.group_id };
};

const isValidTimestamp = (timestamp: string): boolean => !Number.isNaN(Date.parse(timestamp));

export const parseAndValidateAdminAuthoringBatch = (
  payload: AdminAuthoringBatchInput
): Either<readonly string[], readonly AdminAuthoringQuestion[]> => {
  const scheduleValidated = parseAndValidateQuestionAuthoringBatch({
    questions: payload.questions
  });

  if (scheduleValidated._tag === 'Left') {
    return scheduleValidated;
  }

  const timestampErrors = payload.questions
    .filter((question) => question.first_displayed_at !== undefined && !isValidTimestamp(question.first_displayed_at))
    .map((question) => `INVALID_FIRST_DISPLAYED_AT:${question.id}:first_displayed_at must be a valid ISO timestamp.`);

  if (timestampErrors.length > 0) {
    return left(timestampErrors);
  }

  return right(
    scheduleValidated.right.map((question, index) => ({
      ...question,
      target: toAudienceTarget(payload.questions[index]!.target),
      firstDisplayedAt: payload.questions[index]!.first_displayed_at
    }))
  );
};

export const parseAdminAuthoringPreviewInput = (
  payload: AdminPreviewInput
): Readonly<{
  readonly timestampUtcIso: string;
  readonly timeZone: string;
  readonly profile: AdminAuthoringEmployeeProfile;
}> => ({
  timestampUtcIso: payload.timestamp_utc_iso,
  timeZone: payload.time_zone,
  profile: {
    managerEmail: payload.profile.manager_email,
    managerAncestryEmails: payload.profile.manager_ancestry_emails,
    groupIds: payload.profile.group_ids
  }
});
