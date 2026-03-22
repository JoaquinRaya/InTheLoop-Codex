import { describe, expect, it } from 'vitest';
import { isLeft, isRight, none, some } from '../index.js';
import type { ResponsePayload } from '../domain/response-payload.js';
import {
  buildDashboardAnalytics,
  type DashboardQuestionMetadata,
  type DashboardResponseRecord,
  type ManagerHierarchyEntry
} from './dashboard-analytics.js';

const buildResponse = (overrides: Readonly<Partial<ResponsePayload>> = {}): ResponsePayload => ({
  questionId: overrides.questionId ?? 'q-1',
  normalizedScore: overrides.normalizedScore ?? 80,
  optionalComment: overrides.optionalComment ?? none(),
  managerEmail: overrides.managerEmail ?? 'manager@example.com',
  role: overrides.role ?? 'engineer',
  level: overrides.level ?? 'l2',
  surveyDay: overrides.surveyDay ?? '2026-03-22'
});

const metadata: ReadonlyArray<DashboardQuestionMetadata> = [
  { questionId: 'q-1', category: 'culture', tags: ['teamwork', 'trust'] },
  { questionId: 'q-2', category: 'execution', tags: ['delivery'] }
];

const hierarchy: ReadonlyArray<ManagerHierarchyEntry> = [
  { managerEmail: 'director@example.com', parentManagerEmail: none() },
  { managerEmail: 'manager@example.com', parentManagerEmail: some('director@example.com') },
  { managerEmail: 'lead@example.com', parentManagerEmail: some('manager@example.com') }
];

const records: ReadonlyArray<DashboardResponseRecord> = [
  { response: buildResponse({ questionId: 'q-1', managerEmail: 'manager@example.com', surveyDay: '2026-03-20', normalizedScore: 70, optionalComment: some('Good momentum') }) },
  { response: buildResponse({ questionId: 'q-1', managerEmail: 'lead@example.com', surveyDay: '2026-03-20', normalizedScore: 90 }) },
  { response: buildResponse({ questionId: 'q-2', managerEmail: 'lead@example.com', surveyDay: '2026-03-21', normalizedScore: 50, optionalComment: some('Need clearer goals') }) },
  { response: buildResponse({ questionId: 'q-2', managerEmail: 'director@example.com', surveyDay: '2026-03-21', normalizedScore: 75 }) },
  { response: buildResponse({ questionId: 'q-1', managerEmail: 'manager@example.com', surveyDay: '2026-03-18', normalizedScore: 60 }) },
  { response: buildResponse({ questionId: 'q-1', managerEmail: 'lead@example.com', surveyDay: '2026-03-19', normalizedScore: 68 }) },
  { response: buildResponse({ questionId: 'q-2', managerEmail: 'lead@example.com', surveyDay: '2026-03-19', normalizedScore: 55 }) }
];

describe('buildDashboardAnalytics', () => {
  it('returns explicit insufficient data message when filtered window is below privacy threshold', () => {
    const result = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'direct', managerEmail: 'director@example.com' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual({
        status: 'INSUFFICIENT_DATA',
        message: 'Not enough responses in the selected filter window to protect anonymity.'
      });
    }
  });

  it('computes engagement chart and drill-down analytics with recursive manager scope and filters', () => {
    const result = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'recursive', managerEmail: 'manager@example.com' },
        role: some('engineer'),
        level: some('l2'),
        category: some('culture'),
        tags: some(['trust']),
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      expect(result.right.engagementChart).toEqual([
        { surveyDay: '2026-03-20', averageScore: 80, respondentCount: 2 }
      ]);
      expect(result.right.drillDown).toHaveLength(1);
      expect(result.right.drillDown[0]).toMatchObject({
        questionId: 'q-1',
        averageScore: 80,
        responseCount: 2,
        comments: ['Good momentum']
      });
    }
  });

  it('includes previous occurrence percentage delta for drill-down when previous window has enough data', () => {
    const result = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      const questionOne = result.right.drillDown.find((item) => item.questionId === 'q-1');
      expect(questionOne?.percentageChangeFromPreviousOccurrence).toEqual(some(25));
    }
  });

  it('returns no delta when previous occurrence average is zero', () => {
    const zeroPreviousRecords: ReadonlyArray<DashboardResponseRecord> = [
      { response: buildResponse({ questionId: 'q-1', surveyDay: '2026-03-20', normalizedScore: 60 }) },
      { response: buildResponse({ questionId: 'q-1', surveyDay: '2026-03-21', normalizedScore: 80 }) },
      { response: buildResponse({ questionId: 'q-1', surveyDay: '2026-03-18', normalizedScore: 0 }) },
      { response: buildResponse({ questionId: 'q-1', surveyDay: '2026-03-19', normalizedScore: 0 }) }
    ];

    const result = buildDashboardAnalytics({
      records: zeroPreviousRecords,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      expect(result.right.drillDown[0]?.percentageChangeFromPreviousOccurrence).toEqual(none());
    }
  });

  it('applies metadata and attribute filters by rejecting non-matching records', () => {
    const result = buildDashboardAnalytics({
      records: [
        { response: buildResponse({ questionId: 'unknown', role: 'designer', level: 'l3', surveyDay: '2026-03-20' }) },
        { response: buildResponse({ questionId: 'q-2', role: 'engineer', level: 'l2', surveyDay: '2026-03-20' }) },
        { response: buildResponse({ questionId: 'q-1', role: 'engineer', level: 'l2', surveyDay: '2026-03-20', normalizedScore: 90 }) },
        { response: buildResponse({ questionId: 'q-1', role: 'engineer', level: 'l2', surveyDay: '2026-03-21', normalizedScore: 70 }) }
      ],
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        role: some('engineer'),
        level: some('l2'),
        category: some('culture'),
        tags: some(['trust']),
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      expect(result.right.engagementChart).toEqual([
        { surveyDay: '2026-03-20', averageScore: 90, respondentCount: 1 },
        { surveyDay: '2026-03-21', averageScore: 70, respondentCount: 1 }
      ]);
      expect(result.right.drillDown).toHaveLength(1);
      expect(result.right.drillDown[0]?.questionId).toBe('q-1');
    }
  });



  it('ignores records with unknown question metadata', () => {
    const result = buildDashboardAnalytics({
      records: [
        { response: buildResponse({ questionId: 'unknown', surveyDay: '2026-03-20', normalizedScore: 99 }) },
        { response: buildResponse({ questionId: 'q-1', surveyDay: '2026-03-20', normalizedScore: 80 }) }
      ],
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-20' }
      },
      minimumResponseThreshold: 1
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      expect(result.right.drillDown).toEqual([{
        questionId: 'q-1',
        averageScore: 80,
        responseCount: 1,
        percentageChangeFromPreviousOccurrence: none(),
        comments: []
      }]);
    }
  });

  it('rejects records when required tags are not present', () => {
    const result = buildDashboardAnalytics({
      records: [
        { response: buildResponse({ questionId: 'q-2', surveyDay: '2026-03-20', normalizedScore: 80 }) },
        { response: buildResponse({ questionId: 'q-2', surveyDay: '2026-03-20', normalizedScore: 85 }) }
      ],
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        category: some('execution'),
        tags: some(['trust']),
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-20' }
      },
      minimumResponseThreshold: 1
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual({
        status: 'INSUFFICIENT_DATA',
        message: 'Not enough responses in the selected filter window to protect anonymity.'
      });
    }
  });



  it('rejects recursive manager scope when response manager is outside subtree', () => {
    const result = buildDashboardAnalytics({
      records: [
        { response: buildResponse({ questionId: 'q-1', managerEmail: 'outsider@example.com', surveyDay: '2026-03-20' }) },
        { response: buildResponse({ questionId: 'q-1', managerEmail: 'outsider@example.com', surveyDay: '2026-03-20', normalizedScore: 70 }) }
      ],
      questionMetadata: metadata,
      managerHierarchy: [
        ...hierarchy,
        { managerEmail: 'outsider@example.com', parentManagerEmail: some('director@example.com') }
      ],
      filters: {
        managerScope: { mode: 'recursive', managerEmail: 'manager@example.com' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-20' }
      },
      minimumResponseThreshold: 1
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toEqual({
        status: 'INSUFFICIENT_DATA',
        message: 'Not enough responses in the selected filter window to protect anonymity.'
      });
    }
  });

  it('applies level filter when role matches', () => {
    const result = buildDashboardAnalytics({
      records: [
        { response: buildResponse({ questionId: 'q-1', role: 'engineer', level: 'l3', surveyDay: '2026-03-20' }) },
        { response: buildResponse({ questionId: 'q-1', role: 'engineer', level: 'l2', surveyDay: '2026-03-20', normalizedScore: 88 }) }
      ],
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        role: some('engineer'),
        level: some('l2'),
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-20' }
      },
      minimumResponseThreshold: 1
    });

    expect(isRight(result)).toBe(true);
    if (isRight(result) && result.right.status === 'OK') {
      expect(result.right.engagementChart).toEqual([
        { surveyDay: '2026-03-20', averageScore: 88, respondentCount: 1 }
      ]);
    }
  });

  it('rejects invalid thresholds', () => {
    const result = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-03-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 0
    });

    expect(isLeft(result)).toBe(true);
    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_THRESHOLD');
    }
  });

  it('rejects invalid time period ranges and invalid day values', () => {
    const rangeResult = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-03-22', endDay: '2026-03-20' }
      },
      minimumResponseThreshold: 2
    });

    const invalidDayResult = buildDashboardAnalytics({
      records,
      questionMetadata: metadata,
      managerHierarchy: hierarchy,
      filters: {
        managerScope: { mode: 'all' },
        timePeriod: { startDay: '2026-13-20', endDay: '2026-03-21' }
      },
      minimumResponseThreshold: 2
    });

    expect(isLeft(rangeResult)).toBe(true);
    expect(isLeft(invalidDayResult)).toBe(true);
  });
});
