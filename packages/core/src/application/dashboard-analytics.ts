import type { Either } from '../domain/either.js';
import { left, right } from '../domain/either.js';
import { isSome, none, type Option, some } from '../domain/option.js';
import type { ResponsePayload } from '../domain/response-payload.js';

export type DashboardQuestionMetadata = Readonly<{
  readonly questionId: string;
  readonly category: string;
  readonly tags: ReadonlyArray<string>;
}>;

export type DashboardResponseRecord = Readonly<{
  readonly response: ResponsePayload;
}>;

export type ManagerHierarchyEntry = Readonly<{
  readonly managerEmail: string;
  readonly parentManagerEmail: Option<string>;
}>;

export type DashboardManagerScope =
  | Readonly<{ readonly mode: 'all' }>
  | Readonly<{ readonly mode: 'direct'; readonly managerEmail: string }>
  | Readonly<{ readonly mode: 'recursive'; readonly managerEmail: string }>;

export type DashboardFilters = Readonly<{
  readonly managerScope: DashboardManagerScope;
  readonly role?: Option<string>;
  readonly level?: Option<string>;
  readonly category?: Option<string>;
  readonly tags?: Option<ReadonlyArray<string>>;
  readonly timePeriod: Readonly<{
    readonly startDay: string;
    readonly endDay: string;
  }>;
}>;

export type DashboardEngagementPoint = Readonly<{
  readonly surveyDay: string;
  readonly averageScore: number;
  readonly respondentCount: number;
}>;

export type DashboardDrillDownItem = Readonly<{
  readonly questionId: string;
  readonly averageScore: number;
  readonly responseCount: number;
  readonly percentageChangeFromPreviousOccurrence: Option<number>;
  readonly comments: ReadonlyArray<string>;
}>;

export type DashboardAnalyticsInsufficientData = Readonly<{
  readonly status: 'INSUFFICIENT_DATA';
  readonly message: string;
}>;

export type DashboardAnalyticsOk = Readonly<{
  readonly status: 'OK';
  readonly engagementChart: ReadonlyArray<DashboardEngagementPoint>;
  readonly drillDown: ReadonlyArray<DashboardDrillDownItem>;
}>;

export type DashboardAnalyticsResult = DashboardAnalyticsInsufficientData | DashboardAnalyticsOk;

export type DashboardAnalyticsError = Readonly<{
  readonly code: 'INVALID_THRESHOLD' | 'INVALID_TIME_PERIOD';
  readonly message: string;
}>;

export type BuildDashboardAnalyticsInput = Readonly<{
  readonly records: ReadonlyArray<DashboardResponseRecord>;
  readonly questionMetadata: ReadonlyArray<DashboardQuestionMetadata>;
  readonly managerHierarchy: ReadonlyArray<ManagerHierarchyEntry>;
  readonly filters: DashboardFilters;
  readonly minimumResponseThreshold: number;
}>;

const normalizeIsoDay = (value: string): string => `${value}T00:00:00.000Z`;

const isValidIsoDay = (value: string): boolean => !Number.isNaN(Date.parse(normalizeIsoDay(value)));

const average = (values: ReadonlyArray<number>): number =>
  values.reduce((total, item) => total + item, 0) / values.length;

const rangeDays = (startDay: string, endDay: string): ReadonlyArray<string> => {
  const start = new Date(normalizeIsoDay(startDay));
  const end = new Date(normalizeIsoDay(endDay));
  const result: string[] = [];

  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    result.push(cursor.toISOString().slice(0, 10));
  }

  return result;
};

const previousWindowFor = (
  timePeriod: DashboardFilters['timePeriod']
): DashboardFilters['timePeriod'] => {
  const days = rangeDays(timePeriod.startDay, timePeriod.endDay);
  const durationDays = days.length;
  const startDate = new Date(normalizeIsoDay(timePeriod.startDay));
  const prevEnd = new Date(startDate);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (durationDays - 1));

  return {
    startDay: prevStart.toISOString().slice(0, 10),
    endDay: prevEnd.toISOString().slice(0, 10)
  };
};

const managerScopeAllows = (
  scope: DashboardManagerScope,
  managerEmail: string,
  hierarchy: ReadonlyArray<ManagerHierarchyEntry>
): boolean => {
  if (scope.mode === 'all') {
    return true;
  }

  if (scope.mode === 'direct') {
    return managerEmail === scope.managerEmail;
  }

  if (managerEmail === scope.managerEmail) {
    return true;
  }

  const byManager = new Map(hierarchy.map((entry) => [entry.managerEmail, entry] as const));
  let current = byManager.get(managerEmail);

  while (current !== undefined && isSome(current.parentManagerEmail)) {
    if (current.parentManagerEmail.value === scope.managerEmail) {
      return true;
    }

    current = byManager.get(current.parentManagerEmail.value);
  }

  return false;
};

const includesAllTags = (value: ReadonlyArray<string>, requiredTags: ReadonlyArray<string>): boolean =>
  requiredTags.every((tag) => value.includes(tag));

const matchesOptionalFilter = <TValue>(
  filter: Option<TValue> | undefined,
  actual: TValue,
  matches: (actualValue: TValue, expectedValue: TValue) => boolean = (actualValue, expectedValue) =>
    actualValue === expectedValue
): boolean => {
  const resolvedFilter = filter ?? none<TValue>();

  if (isSome(resolvedFilter)) {
    return matches(actual, resolvedFilter.value);
  }

  return true;
};

const filterRecords = (
  input: Readonly<{
    readonly records: ReadonlyArray<DashboardResponseRecord>;
    readonly questionMetadata: ReadonlyArray<DashboardQuestionMetadata>;
    readonly managerHierarchy: ReadonlyArray<ManagerHierarchyEntry>;
    readonly filters: DashboardFilters;
  }>
): ReadonlyArray<DashboardResponseRecord> => {
  const metadataByQuestionId = new Map(
    input.questionMetadata.map((metadata) => [metadata.questionId, metadata] as const)
  );

  return input.records.filter((record) => {
    const response = record.response;

    if (!managerScopeAllows(input.filters.managerScope, response.managerEmail, input.managerHierarchy)) {
      return false;
    }

    if (response.surveyDay < input.filters.timePeriod.startDay || response.surveyDay > input.filters.timePeriod.endDay) {
      return false;
    }

    if (!matchesOptionalFilter(input.filters.role, response.role)) {
      return false;
    }

    if (!matchesOptionalFilter(input.filters.level, response.level)) {
      return false;
    }

    const metadata = metadataByQuestionId.get(response.questionId);
    if (metadata === undefined) {
      return false;
    }

    if (!matchesOptionalFilter(input.filters.category, metadata.category)) {
      return false;
    }

    if (!matchesOptionalFilter(input.filters.tags, metadata.tags, (actualTags, expectedTags) => includesAllTags(actualTags, expectedTags))) {
      return false;
    }

    return true;
  });
};

const buildEngagementChart = (
  filteredRecords: ReadonlyArray<DashboardResponseRecord>
): ReadonlyArray<DashboardEngagementPoint> => {
  const byDay = new Map<string, ReadonlyArray<DashboardResponseRecord>>();

  for (const record of filteredRecords) {
    const existing = byDay.get(record.response.surveyDay) ?? [];
    byDay.set(record.response.surveyDay, [...existing, record]);
  }

  return [...byDay.entries()]
    .map(([surveyDay, records]) => ({
      surveyDay,
      respondentCount: records.length,
      averageScore: average(records.map((record) => record.response.normalizedScore))
    }))
    .sort((left, right) => left.surveyDay.localeCompare(right.surveyDay));
};

const comparisonPercentage = (
  currentAverage: number,
  previousAverage: number
): Option<number> => {
  if (previousAverage === 0) {
    return none();
  }

  return some(((currentAverage - previousAverage) / previousAverage) * 100);
};

const buildDrillDown = (
  currentRecords: ReadonlyArray<DashboardResponseRecord>,
  previousRecords: ReadonlyArray<DashboardResponseRecord>,
  minimumResponseThreshold: number
): ReadonlyArray<DashboardDrillDownItem> => {
  const currentByQuestion = new Map<string, ReadonlyArray<DashboardResponseRecord>>();

  for (const record of currentRecords) {
    const existing = currentByQuestion.get(record.response.questionId) ?? [];
    currentByQuestion.set(record.response.questionId, [...existing, record]);
  }

  const previousByQuestion = new Map<string, ReadonlyArray<DashboardResponseRecord>>();
  for (const record of previousRecords) {
    const existing = previousByQuestion.get(record.response.questionId) ?? [];
    previousByQuestion.set(record.response.questionId, [...existing, record]);
  }

  return [...currentByQuestion.entries()]
    .map(([questionId, current]) => {
      const currentAverage = average(current.map((record) => record.response.normalizedScore));
      const previous = previousByQuestion.get(questionId) ?? [];
      const previousAverage =
        previous.length >= minimumResponseThreshold
          ? some(average(previous.map((record) => record.response.normalizedScore)))
          : none<number>();

      return {
        questionId,
        averageScore: currentAverage,
        responseCount: current.length,
        percentageChangeFromPreviousOccurrence: isSome(previousAverage)
          ? comparisonPercentage(currentAverage, previousAverage.value)
          : none(),
        comments: current
          .filter((record) => isSome(record.response.optionalComment))
          .map((record) => record.response.optionalComment.value)
      };
    })
    .sort((left, right) => right.averageScore - left.averageScore);
};

export const buildDashboardAnalytics = (
  input: BuildDashboardAnalyticsInput
): Either<DashboardAnalyticsError, DashboardAnalyticsResult> => {
  if (!Number.isInteger(input.minimumResponseThreshold) || input.minimumResponseThreshold <= 0) {
    return left({
      code: 'INVALID_THRESHOLD',
      message: 'minimumResponseThreshold must be a positive integer.'
    });
  }

  if (
    !isValidIsoDay(input.filters.timePeriod.startDay) ||
    !isValidIsoDay(input.filters.timePeriod.endDay) ||
    input.filters.timePeriod.startDay > input.filters.timePeriod.endDay
  ) {
    return left({
      code: 'INVALID_TIME_PERIOD',
      message: 'timePeriod must contain valid ISO days where startDay <= endDay.'
    });
  }

  const filteredCurrentRecords = filterRecords({
    records: input.records,
    questionMetadata: input.questionMetadata,
    managerHierarchy: input.managerHierarchy,
    filters: input.filters
  });

  if (filteredCurrentRecords.length < input.minimumResponseThreshold) {
    return right({
      status: 'INSUFFICIENT_DATA',
      message: 'Not enough responses in the selected filter window to protect anonymity.'
    });
  }

  const previousTimePeriod = previousWindowFor(input.filters.timePeriod);
  const filteredPreviousRecords = filterRecords({
    records: input.records,
    questionMetadata: input.questionMetadata,
    managerHierarchy: input.managerHierarchy,
    filters: {
      ...input.filters,
      timePeriod: previousTimePeriod
    }
  });

  return right({
    status: 'OK',
    engagementChart: buildEngagementChart(filteredCurrentRecords),
    drillDown: buildDrillDown(filteredCurrentRecords, filteredPreviousRecords, input.minimumResponseThreshold)
  });
};
