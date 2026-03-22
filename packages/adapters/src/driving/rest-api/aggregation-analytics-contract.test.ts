import { describe, expect, it } from 'vitest';
import { none, some } from '../../../../core/src/index.js';
import {
  buildAggregationApiErrorResponse,
  buildAggregationApiResponse
} from './aggregation-analytics-contract.js';

describe('buildAggregationApiResponse', () => {
  it('maps insufficient data results without exposing count/score', () => {
    const response = buildAggregationApiResponse({
      status: 'INSUFFICIENT_DATA',
      questionId: 'q-1',
      message: 'insufficient data'
    });

    expect(response).toEqual({
      status: 'insufficient_data',
      question_id: 'q-1',
      message: 'insufficient data'
    });
    expect('response_count' in response).toBe(false);
    expect('average_score' in response).toBe(false);
  });

  it('maps threshold-met results including optional previous comparison', () => {
    const response = buildAggregationApiResponse({
      status: 'THRESHOLD_MET',
      questionId: 'q-1',
      responseCount: 6,
      averageScore: 72,
      comments: ['Helpful feedback', 'Need clearer planning'],
      comparisonToPreviousOccurrence: some({
        previousAverageScore: 60,
        previousResponseCount: 5,
        percentageChangeFromPrevious: 20
      })
    });

    expect(response).toEqual({
      status: 'ok',
      question_id: 'q-1',
      response_count: 6,
      average_score: 72,
      comments: ['Helpful feedback', 'Need clearer planning'],
      comparison_to_previous_occurrence: {
        previous_average_score: 60,
        previous_response_count: 5,
        percentage_change_from_previous: 20
      }
    });
  });

  it('returns null when no previous comparison is eligible', () => {
    const response = buildAggregationApiResponse({
      status: 'THRESHOLD_MET',
      questionId: 'q-1',
      responseCount: 5,
      averageScore: 70,
      comments: [],
      comparisonToPreviousOccurrence: none()
    });

    expect(response).toEqual({
      status: 'ok',
      question_id: 'q-1',
      response_count: 5,
      average_score: 70,
      comments: [],
      comparison_to_previous_occurrence: null
    });
  });
});

describe('buildAggregationApiErrorResponse', () => {
  it('maps policy errors for API responses', () => {
    const response = buildAggregationApiErrorResponse({
      code: 'FILTER_CONTEXT_MISMATCH',
      message: 'Current and previous filters must match.'
    });

    expect(response).toEqual({
      status: 'error',
      error_code: 'FILTER_CONTEXT_MISMATCH',
      message: 'Current and previous filters must match.'
    });
  });
});
