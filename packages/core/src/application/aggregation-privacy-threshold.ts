import type { Either } from '../domain/either.js';
import { left, right } from '../domain/either.js';
import { isSome, none, type Option, some } from '../domain/option.js';
import type { ResponsePayload } from '../domain/response-payload.js';

export const defaultMinimumResponseThreshold = 5;

export type AggregationFilterContext = Readonly<Record<string, string>>;

export type QuestionAggregationOccurrence = Readonly<{
  readonly filterContext: AggregationFilterContext;
  readonly responses: ReadonlyArray<ResponsePayload>;
}>;

export type ThresholdMetComparison = Readonly<{
  readonly previousAverageScore: number;
  readonly previousResponseCount: number;
  readonly percentageChangeFromPrevious: number;
}>;

export type QuestionAggregationThresholdMetResult = Readonly<{
  readonly status: 'THRESHOLD_MET';
  readonly questionId: string;
  readonly responseCount: number;
  readonly averageScore: number;
  readonly comments: ReadonlyArray<string>;
  readonly comparisonToPreviousOccurrence: Option<ThresholdMetComparison>;
}>;

export type QuestionAggregationInsufficientDataResult = Readonly<{
  readonly status: 'INSUFFICIENT_DATA';
  readonly questionId: string;
  readonly message: string;
}>;

export type QuestionAggregationResult =
  | QuestionAggregationThresholdMetResult
  | QuestionAggregationInsufficientDataResult;

export type AggregateQuestionAnalyticsInput = Readonly<{
  readonly questionId: string;
  readonly currentOccurrence: QuestionAggregationOccurrence;
  readonly previousOccurrence: Option<QuestionAggregationOccurrence>;
  readonly minimumResponseThreshold: number;
}>;

export type AggregationPolicyError = Readonly<{
  readonly code: 'INVALID_THRESHOLD' | 'FILTER_CONTEXT_MISMATCH';
  readonly message: string;
}>;

const createPolicyError = (
  code: AggregationPolicyError['code'],
  message: string
): AggregationPolicyError => ({
  code,
  message
});

const normalizeFilterContext = (context: AggregationFilterContext): string =>
  Object.keys(context)
    .sort((leftKey, rightKey) => leftKey.localeCompare(rightKey))
    .map((key) => `${key}:${context[key]}`)
    .join('|');

const responsesForQuestion = (
  occurrence: QuestionAggregationOccurrence,
  questionId: string
): ReadonlyArray<ResponsePayload> =>
  occurrence.responses.filter((response) => response.questionId === questionId);

const averageScore = (responses: ReadonlyArray<ResponsePayload>): number =>
  responses.reduce((total, response) => total + response.normalizedScore, 0) / responses.length;

const commentsFromResponses = (responses: ReadonlyArray<ResponsePayload>): ReadonlyArray<string> =>
  responses.flatMap((response) =>
    isSome(response.optionalComment) ? [response.optionalComment.value] : []
  );

const computeComparison = (
  currentAverage: number,
  previousResponses: ReadonlyArray<ResponsePayload>
): Option<ThresholdMetComparison> => {
  const previousAverage = averageScore(previousResponses);

  return some({
    previousAverageScore: previousAverage,
    previousResponseCount: previousResponses.length,
    percentageChangeFromPrevious: ((currentAverage - previousAverage) / previousAverage) * 100
  });
};

export const aggregateQuestionAnalyticsWithPrivacyThreshold = (
  input: AggregateQuestionAnalyticsInput
): Either<AggregationPolicyError, QuestionAggregationResult> => {
  if (!Number.isInteger(input.minimumResponseThreshold) || input.minimumResponseThreshold <= 0) {
    return left(
      createPolicyError(
        'INVALID_THRESHOLD',
        'minimumResponseThreshold must be a positive integer.'
      )
    );
  }

  if (
    isSome(input.previousOccurrence) &&
    normalizeFilterContext(input.currentOccurrence.filterContext) !==
      normalizeFilterContext(input.previousOccurrence.value.filterContext)
  ) {
    return left(
      createPolicyError(
        'FILTER_CONTEXT_MISMATCH',
        'Current and previous occurrence filters must match exactly for comparison.'
      )
    );
  }

  const currentQuestionResponses = responsesForQuestion(input.currentOccurrence, input.questionId);

  if (currentQuestionResponses.length < input.minimumResponseThreshold) {
    return right({
      status: 'INSUFFICIENT_DATA',
      questionId: input.questionId,
      message: 'insufficient data'
    });
  }

  const currentAverage = averageScore(currentQuestionResponses);
  const eligiblePreviousResponses =
    isSome(input.previousOccurrence)
      ? responsesForQuestion(input.previousOccurrence.value, input.questionId)
      : [];

  const comparisonToPreviousOccurrence =
    eligiblePreviousResponses.length >= input.minimumResponseThreshold
      ? computeComparison(currentAverage, eligiblePreviousResponses)
      : none();

  return right({
    status: 'THRESHOLD_MET',
    questionId: input.questionId,
    responseCount: currentQuestionResponses.length,
    averageScore: currentAverage,
    comments: commentsFromResponses(currentQuestionResponses),
    comparisonToPreviousOccurrence
  });
};

export const aggregateQuestionAnalytics = (
  input: Omit<AggregateQuestionAnalyticsInput, 'minimumResponseThreshold'>
): Either<AggregationPolicyError, QuestionAggregationResult> =>
  aggregateQuestionAnalyticsWithPrivacyThreshold({
    ...input,
    minimumResponseThreshold: defaultMinimumResponseThreshold
  });
