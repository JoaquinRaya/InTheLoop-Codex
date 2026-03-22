import { describe, expect, it } from 'vitest';
import { none, some } from '../../../../core/src/index.js';
import {
  buildDashboardAnalyticsApiErrorResponse,
  buildDashboardAnalyticsApiResponse
} from './dashboard-analytics-contract.js';

describe('buildDashboardAnalyticsApiResponse', () => {
  it('maps insufficient data result into explicit API response', () => {
    const response = buildDashboardAnalyticsApiResponse({
      status: 'INSUFFICIENT_DATA',
      message: 'Not enough responses in selected window.'
    });

    expect(response).toEqual({
      status: 'insufficient_data',
      message: 'Not enough responses in selected window.'
    });
  });

  it('maps analytics payload to snake_case API fields', () => {
    const response = buildDashboardAnalyticsApiResponse({
      status: 'OK',
      engagementChart: [{ surveyDay: '2026-03-21', averageScore: 72, respondentCount: 8 }],
      drillDown: [{
        questionId: 'q-1',
        averageScore: 72,
        responseCount: 8,
        percentageChangeFromPreviousOccurrence: some(12.5),
        comments: ['Clear roadmap']
      }, {
        questionId: 'q-2',
        averageScore: 66,
        responseCount: 6,
        percentageChangeFromPreviousOccurrence: none(),
        comments: []
      }]
    });

    expect(response).toEqual({
      status: 'ok',
      engagement_chart: [{ survey_day: '2026-03-21', average_score: 72, respondent_count: 8 }],
      drill_down: [{
        question_id: 'q-1',
        average_score: 72,
        response_count: 8,
        percentage_change_from_previous_occurrence: 12.5,
        comments: ['Clear roadmap']
      }, {
        question_id: 'q-2',
        average_score: 66,
        response_count: 6,
        percentage_change_from_previous_occurrence: null,
        comments: []
      }]
    });
  });
});

describe('buildDashboardAnalyticsApiErrorResponse', () => {
  it('maps analytics policy errors', () => {
    const response = buildDashboardAnalyticsApiErrorResponse({
      code: 'INVALID_TIME_PERIOD',
      message: 'timePeriod must contain valid ISO days where startDay <= endDay.'
    });

    expect(response).toEqual({
      status: 'error',
      error_code: 'INVALID_TIME_PERIOD',
      message: 'timePeriod must contain valid ISO days where startDay <= endDay.'
    });
  });
});
