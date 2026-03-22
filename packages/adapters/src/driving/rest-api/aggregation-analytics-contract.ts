import type {
  AggregationPolicyError,
  QuestionAggregationResult,
  ThresholdMetComparison
} from '../../../../core/src/index.js';
import { isSome } from '../../../../core/src/index.js';

export type AggregationApiErrorResponse = Readonly<{
  readonly status: 'error';
  readonly error_code: AggregationPolicyError['code'];
  readonly message: string;
}>;

export type AggregationApiInsufficientDataResponse = Readonly<{
  readonly status: 'insufficient_data';
  readonly question_id: string;
  readonly message: string;
}>;

export type AggregationApiThresholdMetResponse = Readonly<{
  readonly status: 'ok';
  readonly question_id: string;
  readonly response_count: number;
  readonly average_score: number;
  readonly comments: ReadonlyArray<string>;
  readonly comparison_to_previous_occurrence: Readonly<{
    readonly previous_average_score: number;
    readonly previous_response_count: number;
    readonly percentage_change_from_previous: number;
  }> | null;
}>;

export type AggregationApiResponse =
  | AggregationApiErrorResponse
  | AggregationApiInsufficientDataResponse
  | AggregationApiThresholdMetResponse;

const mapComparison = (
  comparison: ThresholdMetComparison
): AggregationApiThresholdMetResponse['comparison_to_previous_occurrence'] => ({
  previous_average_score: comparison.previousAverageScore,
  previous_response_count: comparison.previousResponseCount,
  percentage_change_from_previous: comparison.percentageChangeFromPrevious
});

export const buildAggregationApiResponse = (
  result: QuestionAggregationResult
): AggregationApiInsufficientDataResponse | AggregationApiThresholdMetResponse => {
  if (result.status === 'INSUFFICIENT_DATA') {
    return {
      status: 'insufficient_data',
      question_id: result.questionId,
      message: result.message
    };
  }

  return {
    status: 'ok',
    question_id: result.questionId,
    response_count: result.responseCount,
    average_score: result.averageScore,
    comments: result.comments,
    comparison_to_previous_occurrence: isSome(result.comparisonToPreviousOccurrence)
      ? mapComparison(result.comparisonToPreviousOccurrence.value)
      : null
  };
};

export const buildAggregationApiErrorResponse = (
  error: AggregationPolicyError
): AggregationApiErrorResponse => ({
  status: 'error',
  error_code: error.code,
  message: error.message
});
