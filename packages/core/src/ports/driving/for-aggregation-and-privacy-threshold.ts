import type { Either } from '../../domain/either.js';
import type {
  AggregateQuestionAnalyticsInput,
  AggregationPolicyError,
  QuestionAggregationResult
} from '../../application/aggregation-privacy-threshold.js';

export type ForAggregatingQuestionAnalytics = (
  input: AggregateQuestionAnalyticsInput
) => Either<AggregationPolicyError, QuestionAggregationResult>;
