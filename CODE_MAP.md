# Code Map

## Repository directory summary
### `.`
Contains 10 tracked source/documentation/config file(s).
- `.eslintrc.cjs` — definitions: primarily types/tests/docs/config.
- `ARCHITECTURE_REVIEW.md` — definitions: primarily types/tests/docs/config.
- `dependency-cruiser.cjs` — definitions: primarily types/tests/docs/config.
- `docker-compose.yml` — definitions: primarily types/tests/docs/config.
- `package.json` — definitions: primarily types/tests/docs/config.
- `playwright.config.ts` — definitions: primarily types/tests/docs/config.
- `pnpm-lock.yaml` — definitions: primarily types/tests/docs/config.
- `pnpm-workspace.yaml` — definitions: primarily types/tests/docs/config.
- `tsconfig.base.json` — definitions: primarily types/tests/docs/config.
- `vitest.config.ts` — definitions: primarily types/tests/docs/config.

### `docs`
Contains 1 tracked source/documentation/config file(s).
- `docs/README.md` — definitions: primarily types/tests/docs/config.

### `docs/artifacts`
Contains 5 tracked source/documentation/config file(s).
- `docs/artifacts/CRYPTO_TRANSCRIPT.md` — definitions: primarily types/tests/docs/config.
- `docs/artifacts/RISK_ACCEPTANCE.md` — definitions: primarily types/tests/docs/config.
- `docs/artifacts/SECURITY_CLAIMS.md` — definitions: primarily types/tests/docs/config.
- `docs/artifacts/TENANCY_MODEL.md` — definitions: primarily types/tests/docs/config.
- `docs/artifacts/TRUST_BOUNDARIES.md` — definitions: primarily types/tests/docs/config.

### `docs/engineering`
Contains 13 tracked source/documentation/config file(s).
- `docs/engineering/DEPLOYMENT_RUNBOOK.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/IMPLEMENTATION_GUARDRAILS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/MONOREPO_TECH_SPEC.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-01_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-02_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-03_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-04_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-05_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-06_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-07_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-08_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-09_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.
- `docs/engineering/PRD-10_IMPLEMENTATION_STATUS.md` — definitions: primarily types/tests/docs/config.

### `docs/prds`
Contains 10 tracked source/documentation/config file(s).
- `docs/prds/PRD-01-Trust-And-Anonymity-Foundation.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-02-Employee-Client.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-03-Question-And-Scheduling.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-04-Submission-Pipeline.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-05-Aggregation-And-Privacy-Threshold.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-06-Dashboard-And-Analytics.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-07-Admin-And-Authoring.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-08-Verification-And-Transparency.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-09-Practical-Anonymity-Protocol.md` — definitions: primarily types/tests/docs/config.
- `docs/prds/PRD-10-Strong-Anonymity-Protocol.md` — definitions: primarily types/tests/docs/config.

### `packages/adapters`
Contains 2 tracked source/documentation/config file(s).
- `packages/adapters/package.json` — definitions: primarily types/tests/docs/config.
- `packages/adapters/tsconfig.json` — definitions: primarily types/tests/docs/config.

### `packages/adapters/src`
Contains 1 tracked source/documentation/config file(s).
- `packages/adapters/src/index.ts` — definitions: primarily types/tests/docs/config.

### `packages/adapters/src/driven/logging`
Contains 2 tracked source/documentation/config file(s).
- `packages/adapters/src/driven/logging/response-path-log-sanitizer.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driven/logging/response-path-log-sanitizer.ts` — functions/constants: containsDeniedPattern, sanitizeValue, sanitizeResponsePathLogEvent; exports: LogPrimitiveValue, LogValue, ResponsePathLogEvent, sanitizeResponsePathLogEvent

### `packages/adapters/src/driven/storage`
Contains 4 tracked source/documentation/config file(s).
- `packages/adapters/src/driven/storage/anonymous-submission-batch-processor.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driven/storage/anonymous-submission-batch-processor.ts` — functions/constants: processAnonymousSubmissionBatch, createInMemoryAnonymousSubmissionQueue, loadPending, loadPersisted; exports: ForAnonymousSubmissionQueue, ProcessAnonymousSubmissionBatchInput, processAnonymousSubmissionBatch, InMemoryAnonymousSubmissionQueue, createInMemoryAnonymousSubmissionQueue
- `packages/adapters/src/driven/storage/versioned-question-selection-state-store.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driven/storage/versioned-question-selection-state-store.ts` — functions/constants: deserialize, serialize, createVersionedQuestionSelectionStateStore, keyForTenant; exports: StorageLike, createVersionedQuestionSelectionStateStore

### `packages/adapters/src/driving/rest-api`
Contains 10 tracked source/documentation/config file(s).
- `packages/adapters/src/driving/rest-api/admin-authoring-contract.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/rest-api/admin-authoring-contract.ts` — functions/constants: toAudienceTarget, isValidTimestamp, parseAndValidateAdminAuthoringBatch, parseAdminAuthoringPreviewInput; exports: AuthoringTargetInput, AdminAuthoringQuestionInput, AdminAuthoringBatchInput, AdminPreviewInput, parseAndValidateAdminAuthoringBatch, parseAdminAuthoringPreviewInput
- `packages/adapters/src/driving/rest-api/aggregation-analytics-contract.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/rest-api/aggregation-analytics-contract.ts` — functions/constants: mapComparison, buildAggregationApiResponse, buildAggregationApiErrorResponse; exports: AggregationApiErrorResponse, AggregationApiInsufficientDataResponse, AggregationApiThresholdMetResponse, AggregationApiResponse, buildAggregationApiResponse, buildAggregationApiErrorResponse
- `packages/adapters/src/driving/rest-api/dashboard-analytics-contract.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/rest-api/dashboard-analytics-contract.ts` — functions/constants: mapDrillDownItem, buildDashboardAnalyticsApiResponse, buildDashboardAnalyticsApiErrorResponse; exports: DashboardAnalyticsApiOkResponse, DashboardAnalyticsApiInsufficientDataResponse, DashboardAnalyticsApiErrorResponse, DashboardAnalyticsApiResponse, buildDashboardAnalyticsApiResponse, buildDashboardAnalyticsApiErrorResponse
- `packages/adapters/src/driving/rest-api/question-authoring-contract.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/rest-api/question-authoring-contract.ts` — functions/constants: toRecurringRule, toScheduledQuestion, parseAndValidateQuestionAuthoringBatch; exports: AuthoringRecurringRuleInput, AuthoringScheduleInput, AuthoringQuestionInput, AuthoringBatchInput, parseAndValidateQuestionAuthoringBatch
- `packages/adapters/src/driving/rest-api/version-endpoint.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/rest-api/version-endpoint.ts` — functions/constants: createReducedAssuranceDisclosure, toRuntimeSignals, toAttestationExplanation, buildVersionEndpointResponse; exports: VersionEndpointInput, VersionEndpointResponse, buildVersionEndpointResponse

### `packages/adapters/src/driving/web-ui`
Contains 16 tracked source/documentation/config file(s).
- `packages/adapters/src/driving/web-ui/anonymous-submission-client.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/anonymous-submission-client.ts` — functions/constants: prepareDelayedAnonymousSubmission; exports: AnonymousSubmissionDelayConfig, PrepareDelayedAnonymousSubmissionInput, DelayedAnonymousSubmission, PrepareDelayedAnonymousSubmissionError, prepareDelayedAnonymousSubmission
- `packages/adapters/src/driving/web-ui/browser-local-state-store.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/browser-local-state-store.ts` — functions/constants: deserializeState, serializeState, createBrowserLocalStateStore; exports: StorageLike, createBrowserLocalStateStore
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-app.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-app.ts` — functions/constants: runEmployeePromptLoginFlow, buildResponsePayload, buildArtifactResult, mapPackagingSignal, handleEmployeePromptAction, createInMemoryEmployeePromptStateStore, currentState, someText, noText; exports: EmployeePromptQuestion, EmployeePromptLocalStateStore, LoginFlowResult, runEmployeePromptLoginFlow, PackagingPipelineSignal, PromptActionInput, AnonymousSubmissionTransportInput, PromptActionResult, handleEmployeePromptAction, createInMemoryEmployeePromptStateStore, someText, noText
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-browser-runtime.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-browser-runtime.ts` — functions/constants: runPromptOnEmployeeSignIn, skipPromptInBrowserRuntime; exports: BrowserSignInInput, BrowserSignInResult, runPromptOnEmployeeSignIn, BrowserPromptActionInput, skipPromptInBrowserRuntime
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-component.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/employee-daily-prompt-component.ts` — functions/constants: renderOptions, renderEmployeeDailyPromptComponent; exports: EmployeePromptQuestionOption, EmployeeDailyPromptComponentInput, renderEmployeeDailyPromptComponent
- `packages/adapters/src/driving/web-ui/employee-prompt-presentation-model.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/employee-prompt-presentation-model.ts` — functions/constants: createEmployeePromptPresentationModel; exports: EmployeePromptPresentationModel, EmployeePromptPresentationInput, createEmployeePromptPresentationModel
- `packages/adapters/src/driving/web-ui/transparency-panel-component.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/transparency-panel-component.ts` — functions/constants: renderTransparencyPanelComponent; exports: renderTransparencyPanelComponent
- `packages/adapters/src/driving/web-ui/transparency-panel-model.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/adapters/src/driving/web-ui/transparency-panel-model.ts` — functions/constants: toPackagingStatusLabel, createTransparencyPanelModel; exports: PackagingStatus, TransparencyPanelModel, createTransparencyPanelModel

### `packages/adapters/src/runtime`
Contains 4 tracked source/documentation/config file(s).
- `packages/adapters/src/runtime/in-memory-runtime-store.ts` — functions/constants: createInMemoryRuntimeStore; exports: createInMemoryRuntimeStore
- `packages/adapters/src/runtime/postgres-runtime-store.ts` — classes: PostgresRuntimeStore; functions/constants: parseQuestion, parseState, toAdminAuthoringProfile; exports: PostgresRuntimeStore, PromptRequestProfileInput, toAdminAuthoringProfile
- `packages/adapters/src/runtime/runtime-store.ts` — exports: RuntimeStore
- `packages/adapters/src/runtime/server.ts` — functions/constants: toScheduledQuestions, targetMatches, sendBadRequest, parseCsv; exports: createServer, run

### `packages/config`
Contains 2 tracked source/documentation/config file(s).
- `packages/config/package.json` — definitions: primarily types/tests/docs/config.
- `packages/config/tsconfig.json` — definitions: primarily types/tests/docs/config.

### `packages/config/src`
Contains 1 tracked source/documentation/config file(s).
- `packages/config/src/index.ts` — exports: configPackageMarker

### `packages/core`
Contains 2 tracked source/documentation/config file(s).
- `packages/core/package.json` — definitions: primarily types/tests/docs/config.
- `packages/core/tsconfig.json` — definitions: primarily types/tests/docs/config.

### `packages/core/src`
Contains 2 tracked source/documentation/config file(s).
- `packages/core/src/index.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/index.ts` — definitions: primarily types/tests/docs/config.

### `packages/core/src/application`
Contains 17 tracked source/documentation/config file(s).
- `packages/core/src/application/admin-authoring.test.ts` — functions/constants: queueQuestion
- `packages/core/src/application/admin-authoring.ts` — functions/constants: isValidIsoTimestamp, targetMatchesProfile, canEditAdminAuthoringQuestion, applyAdminQuestionEdit, recordQuestionFirstDisplay, previewQuestionResolutionForEmployee; exports: QuestionAudienceTarget, AdminAuthoringQuestion, AdminAuthoringEmployeeProfile, AdminAuthoringValidationError, canEditAdminAuthoringQuestion, applyAdminQuestionEdit, recordQuestionFirstDisplay, previewQuestionResolutionForEmployee
- `packages/core/src/application/aggregation-privacy-threshold.test.ts` — functions/constants: buildResponse
- `packages/core/src/application/aggregation-privacy-threshold.ts` — functions/constants: createPolicyError, normalizeFilterContext, responsesForQuestion, averageScore, commentsFromResponses, computeComparison, aggregateQuestionAnalyticsWithPrivacyThreshold, aggregateQuestionAnalytics; exports: defaultMinimumResponseThreshold, AggregationFilterContext, QuestionAggregationOccurrence, ThresholdMetComparison, QuestionAggregationThresholdMetResult, QuestionAggregationInsufficientDataResult, QuestionAggregationResult, AggregateQuestionAnalyticsInput, AggregationPolicyError, aggregateQuestionAnalyticsWithPrivacyThreshold, aggregateQuestionAnalytics
- `packages/core/src/application/create-unlinkable-submission.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/application/create-unlinkable-submission.ts` — functions/constants: isAllowedSharedField, normalizeResponseKeys, createError, validateParticipationEvent, auditLinkability, createUnlinkableSubmissionArtifacts; exports: ParticipationPromptState, ParticipationEventInput, CreateUnlinkableSubmissionArtifactsInput, ParticipationArtifact, SubmissionUnlinkabilityAudit, CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult, createUnlinkableSubmissionArtifacts
- `packages/core/src/application/dashboard-analytics.test.ts` — functions/constants: buildResponse
- `packages/core/src/application/dashboard-analytics.ts` — functions/constants: normalizeIsoDay, isValidIsoDay, average, rangeDays, previousWindowFor, managerScopeAllows, hasAncestorManager, includesAllTags, filterRecords, buildEngagementChart, comparisonPercentage, buildDrillDown…; exports: DashboardQuestionMetadata, DashboardResponseRecord, ManagerHierarchyEntry, DashboardManagerScope, DashboardFilters, DashboardEngagementPoint, DashboardDrillDownItem, DashboardAnalyticsInsufficientData, DashboardAnalyticsOk, DashboardAnalyticsResult, DashboardAnalyticsError, BuildDashboardAnalyticsInput…
- `packages/core/src/application/employee-daily-prompt.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/application/employee-daily-prompt.ts` — functions/constants: createEmptyEmployeeClientLocalState, cacheProfile, resolveLoginPromptDecision, applyDailyPromptOutcome; exports: EmployeeProfileSnapshot, EmployeeClientLocalState, LoginPromptDecision, DailyPromptOutcome, createEmptyEmployeeClientLocalState, resolveLoginPromptDecision, applyDailyPromptOutcome
- `packages/core/src/application/question-scheduling.test.ts` — functions/constants: selectedQuestionId, baseQuestion
- `packages/core/src/application/question-scheduling.ts` — functions/constants: isDateString, isDateWithinRange, isSuppressedOnDate, parseDateParts, daysInMonth, isValidTimeZone, extractLocalDate, weekdayFromDate, dayOfMonthFromDate, isLastWeekdayOfMonth, isNthWeekdayOfMonth, isIntervalMonthsDueOnDate…; exports: DateRange, SpecificDateSchedule, Weekday, IntervalDaysRecurringRule, IntervalMonthsRecurringRule, NthWeekdayOfMonthRecurringRule, LastWeekdayOfMonthRecurringRule, RecurringRule, RecurringSchedule, QueueSchedule, QuestionSchedule, ScheduledQuestion…
- `packages/core/src/application/submission-pipeline.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/application/submission-pipeline.ts` — functions/constants: createPipelineError, isUnitIntervalValue, hasCorrelatorPattern, sanitizeTransportMetadata, computeRandomizedSendDelayMs, buildAnonymousSubmissionBatch; exports: RandomizedSendDelayInput, AnonymousSubmissionEnvelope, AnonymousSubmissionBatch, SubmissionPipelineError, BuildAnonymousSubmissionBatchInput, computeRandomizedSendDelayMs, buildAnonymousSubmissionBatch
- `packages/core/src/application/validate-response-payload.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/application/validate-response-payload.ts` — functions/constants: isAllowedKey, hasAllRequiredFields, error, validateResponsePayload; exports: validateResponsePayload
- `packages/core/src/application/work-calendar-policy.ts` — functions/constants: weekdayFromIsoDate, createTenantWorkCalendarPolicy; exports: TenantCalendarConfiguration, createTenantWorkCalendarPolicy

### `packages/core/src/domain`
Contains 9 tracked source/documentation/config file(s).
- `packages/core/src/domain/either.ts` — exports: Left, Right, Either, left, right, isLeft, isRight
- `packages/core/src/domain/option.ts` — exports: None, Some, Option, none, some, isNone, isSome
- `packages/core/src/domain/prd-01-trust-rules.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/domain/prd-01-trust-rules.ts` — functions/constants: isProhibitedIdentityOrCorrelationKey, redactResponsePathMetadata; exports: prohibitedIdentityOrCorrelationKeys, ProhibitedIdentityOrCorrelationKey, isProhibitedIdentityOrCorrelationKey, ResponsePathLogEvent, redactResponsePathMetadata
- `packages/core/src/domain/prd-10-strong-anonymity.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/domain/prd-10-strong-anonymity.ts` — functions/constants: buildStrongAnonymityDisclosure; exports: StrongAnonymityDisclosure, buildStrongAnonymityDisclosure
- `packages/core/src/domain/response-payload.ts` — exports: allowedResponseKeys, AllowedResponseKey, ResponsePayload, PayloadValidationError
- `packages/core/src/domain/trust-assurance.test.ts` — definitions: primarily types/tests/docs/config.
- `packages/core/src/domain/trust-assurance.ts` — functions/constants: hasNonEmptyValue, validateBuildProvenanceMetadata, determineTrustAssurance; exports: BuildProvenanceMetadata, RuntimeAttestationStatus, RuntimeVerificationSignals, BuildProvenanceFieldName, BuildProvenanceValidationResult, ReducedAssuranceReason, TrustAssuranceSummary, validateBuildProvenanceMetadata, determineTrustAssurance

### `packages/core/src/ports/driven`
Contains 3 tracked source/documentation/config file(s).
- `packages/core/src/ports/driven/for-employee-prompt-local-state-storage.ts` — exports: ForEmployeePromptLocalStateStorage
- `packages/core/src/ports/driven/for-question-selection-state-storage.ts` — exports: StoredQuestionSelectionState, ForQuestionSelectionStateStorage
- `packages/core/src/ports/driven/for-work-calendar-policy.ts` — exports: ForWorkCalendarPolicy

### `packages/core/src/ports/driving`
Contains 5 tracked source/documentation/config file(s).
- `packages/core/src/ports/driving/for-aggregation-and-privacy-threshold.ts` — exports: ForAggregatingQuestionAnalytics
- `packages/core/src/ports/driving/for-employee-daily-prompt.ts` — exports: ForResolvingEmployeeDailyPromptDecision, ForApplyingEmployeeDailyPromptOutcome
- `packages/core/src/ports/driving/for-question-scheduling.ts` — exports: ForSelectingQuestionForEmployeeMoment, ForSelectingAndPersistingQuestionForEmployeeMoment
- `packages/core/src/ports/driving/for-response-validation.ts` — exports: ForValidatingResponsePayload
- `packages/core/src/ports/driving/for-unlinkable-submission-artifacts.ts` — exports: ForCreatingUnlinkableSubmissionArtifacts

### `packages/shared`
Contains 2 tracked source/documentation/config file(s).
- `packages/shared/package.json` — definitions: primarily types/tests/docs/config.
- `packages/shared/tsconfig.json` — definitions: primarily types/tests/docs/config.

### `packages/shared/src`
Contains 1 tracked source/documentation/config file(s).
- `packages/shared/src/index.ts` — exports: sharedPackageMarker

### `tests/e2e`
Contains 2 tracked source/documentation/config file(s).
- `tests/e2e/runtime-browser-postgres.e2e.test.ts` — functions/constants: toJson, runPostgresCommand
- `tests/e2e/runtime-cujs.e2e.test.ts` — definitions: primarily types/tests/docs/config.

