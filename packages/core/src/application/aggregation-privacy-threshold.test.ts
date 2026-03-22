import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../domain/either.js';
import { none, some } from '../domain/option.js';
import type { ResponsePayload } from '../domain/response-payload.js';
import {
  aggregateQuestionAnalytics,
  aggregateQuestionAnalyticsWithPrivacyThreshold,
  defaultMinimumResponseThreshold
} from './aggregation-privacy-threshold.js';

const buildResponse = (overrides: Readonly<Partial<ResponsePayload>> = {}): ResponsePayload => ({
  questionId: overrides.questionId ?? 'q-1',
  normalizedScore: overrides.normalizedScore ?? 60,
  optionalComment: overrides.optionalComment ?? none(),
  managerEmail: overrides.managerEmail ?? 'manager@example.com',
  role: overrides.role ?? 'engineer',
  level: overrides.level ?? 'l2',
  surveyDay: overrides.surveyDay ?? '2026-03-22'
});

describe('aggregateQuestionAnalyticsWithPrivacyThreshold', () => {
  it('returns insufficient data when current occurrence is below threshold and does not expose count or score', () => {
    const result = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 5,
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [
          buildResponse({ normalizedScore: 40 }),
          buildResponse({ normalizedScore: 50 }),
          buildResponse({ normalizedScore: 60 }),
          buildResponse({ normalizedScore: 70 })
        ]
      },
      previousOccurrence: none()
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right).toEqual({
        status: 'INSUFFICIENT_DATA',
        questionId: 'q-1',
        message: 'insufficient data'
      });
      expect('responseCount' in result.right).toBe(false);
      expect('averageScore' in result.right).toBe(false);
    }
  });

  it('returns count, average score, and verbatim comments when threshold is met', () => {
    const result = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 3,
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [
          buildResponse({ normalizedScore: 40, optionalComment: some('Needs fewer meetings.') }),
          buildResponse({ normalizedScore: 50 }),
          buildResponse({ normalizedScore: 70, optionalComment: some('Great mentorship!') })
        ]
      },
      previousOccurrence: none()
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right).toEqual({
        status: 'THRESHOLD_MET',
        questionId: 'q-1',
        responseCount: 3,
        averageScore: 160 / 3,
        comments: ['Needs fewer meetings.', 'Great mentorship!'],
        comparisonToPreviousOccurrence: none()
      });
    }
  });

  it('computes previous occurrence comparison using the same threshold logic and filter context', () => {
    const result = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 3,
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [
          buildResponse({ normalizedScore: 60 }),
          buildResponse({ normalizedScore: 70 }),
          buildResponse({ normalizedScore: 80 })
        ]
      },
      previousOccurrence: some({
        filterContext: { role: 'engineer', manager_email: 'manager@example.com' },
        responses: [
          buildResponse({ normalizedScore: 50 }),
          buildResponse({ normalizedScore: 50 }),
          buildResponse({ normalizedScore: 60 })
        ]
      })
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result) && result.right.status === 'THRESHOLD_MET') {
      expect(result.right.comparisonToPreviousOccurrence).toEqual(
        some({
          previousAverageScore: 160 / 3,
          previousResponseCount: 3,
          percentageChangeFromPrevious: (((210 / 3) - (160 / 3)) / (160 / 3)) * 100
        })
      );
    }
  });

  it('omits comparison when previous occurrence is below threshold', () => {
    const result = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 3,
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [
          buildResponse({ normalizedScore: 60 }),
          buildResponse({ normalizedScore: 70 }),
          buildResponse({ normalizedScore: 80 })
        ]
      },
      previousOccurrence: some({
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [buildResponse({ normalizedScore: 50 }), buildResponse({ normalizedScore: 60 })]
      })
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result) && result.right.status === 'THRESHOLD_MET') {
      expect(result.right.comparisonToPreviousOccurrence).toEqual(none());
    }
  });

  it('rejects mismatched filter context between current and previous occurrence', () => {
    const result = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 3,
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com', role: 'engineer' },
        responses: [buildResponse(), buildResponse(), buildResponse()]
      },
      previousOccurrence: some({
        filterContext: { manager_email: 'other@example.com', role: 'engineer' },
        responses: [buildResponse(), buildResponse(), buildResponse()]
      })
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('FILTER_CONTEXT_MISMATCH');
    }
  });

  it('rejects non-positive or non-integer thresholds', () => {
    const nonPositiveResult = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 0,
      currentOccurrence: {
        filterContext: {},
        responses: [buildResponse()]
      },
      previousOccurrence: none()
    });

    const nonIntegerResult = aggregateQuestionAnalyticsWithPrivacyThreshold({
      questionId: 'q-1',
      minimumResponseThreshold: 2.5,
      currentOccurrence: {
        filterContext: {},
        responses: [buildResponse(), buildResponse(), buildResponse()]
      },
      previousOccurrence: none()
    });

    expect(isLeft(nonPositiveResult)).toBe(true);
    expect(isLeft(nonIntegerResult)).toBe(true);
  });
});

describe('aggregateQuestionAnalytics', () => {
  it('uses the default minimum threshold of 5', () => {
    const result = aggregateQuestionAnalytics({
      questionId: 'q-1',
      currentOccurrence: {
        filterContext: { manager_email: 'manager@example.com' },
        responses: [
          buildResponse(),
          buildResponse(),
          buildResponse(),
          buildResponse(),
          buildResponse()
        ]
      },
      previousOccurrence: none()
    });

    expect(defaultMinimumResponseThreshold).toBe(5);
    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right.status).toBe('THRESHOLD_MET');
    }
  });
});
