import type {
  DashboardAnalyticsError,
  DashboardAnalyticsResult,
  DashboardDrillDownItem
} from '../../../../core/src/index.js';
import { isSome } from '../../../../core/src/index.js';

export type DashboardAnalyticsApiOkResponse = Readonly<{
  readonly status: 'ok';
  readonly engagement_chart: ReadonlyArray<{
    readonly survey_day: string;
    readonly average_score: number;
    readonly respondent_count: number;
  }>;
  readonly drill_down: ReadonlyArray<{
    readonly question_id: string;
    readonly average_score: number;
    readonly response_count: number;
    readonly percentage_change_from_previous_occurrence: number | null;
    readonly comments: ReadonlyArray<string>;
  }>;
}>;

export type DashboardAnalyticsApiInsufficientDataResponse = Readonly<{
  readonly status: 'insufficient_data';
  readonly message: string;
}>;

export type DashboardAnalyticsApiErrorResponse = Readonly<{
  readonly status: 'error';
  readonly error_code: DashboardAnalyticsError['code'];
  readonly message: string;
}>;

export type DashboardAnalyticsApiResponse =
  | DashboardAnalyticsApiOkResponse
  | DashboardAnalyticsApiInsufficientDataResponse
  | DashboardAnalyticsApiErrorResponse;

const mapDrillDownItem = (
  item: DashboardDrillDownItem
): DashboardAnalyticsApiOkResponse['drill_down'][number] => ({
  question_id: item.questionId,
  average_score: item.averageScore,
  response_count: item.responseCount,
  percentage_change_from_previous_occurrence: isSome(item.percentageChangeFromPreviousOccurrence)
    ? item.percentageChangeFromPreviousOccurrence.value
    : null,
  comments: item.comments
});

export const buildDashboardAnalyticsApiResponse = (
  result: DashboardAnalyticsResult
): DashboardAnalyticsApiOkResponse | DashboardAnalyticsApiInsufficientDataResponse => {
  if (result.status === 'INSUFFICIENT_DATA') {
    return {
      status: 'insufficient_data',
      message: result.message
    };
  }

  return {
    status: 'ok',
    engagement_chart: result.engagementChart.map((point) => ({
      survey_day: point.surveyDay,
      average_score: point.averageScore,
      respondent_count: point.respondentCount
    })),
    drill_down: result.drillDown.map(mapDrillDownItem)
  };
};

export const buildDashboardAnalyticsApiErrorResponse = (
  error: DashboardAnalyticsError
): DashboardAnalyticsApiErrorResponse => ({
  status: 'error',
  error_code: error.code,
  message: error.message
});
