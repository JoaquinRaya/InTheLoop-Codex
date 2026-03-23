import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  parseAdminAuthoringPreviewInput,
  parseAndValidateAdminAuthoringBatch
} from '../driving/rest-api/admin-authoring-contract.js';
import {
  createTenantWorkCalendarPolicy,
  previewQuestionResolutionForEmployee,
  selectQuestionForEmployeeMoment,
  validateResponsePayload,
  type AdminAuthoringEmployeeProfile,
  type AdminAuthoringQuestion,
  type ScheduledQuestion
} from '../../../core/src/index.js';
import type { ForWorkCalendarPolicy } from '../../../core/src/ports/driven/for-work-calendar-policy.js';
import { isSome } from '../../../core/src/domain/option.js';
import { PostgresRuntimeStore, toAdminAuthoringProfile, type PromptRequestProfileInput } from './postgres-runtime-store.js';
import type { RuntimeStore } from './runtime-store.js';
import { renderAdminUiPage } from './admin-ui-page.js';
import { renderPeopleDashboardPage } from './people-dashboard-page.js';

type AdminUpsertBody = Readonly<{
  readonly tenantId: string;
  readonly questions: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

type SingleQuestionUpsertBody = Readonly<{
  readonly tenantId: string;
  readonly question: Readonly<Record<string, unknown>>;
}>;

type PromptBody = Readonly<{
  readonly tenantId: string;
  readonly timestampUtcIso: string;
  readonly timeZone: string;
  readonly profile: PromptRequestProfileInput;
}>;

type ScoreSubmitBody = Readonly<{
  readonly tenantId: string;
  readonly payload: Readonly<Partial<Record<string, string | number>>>;
}>;

type TenantQuery = Readonly<{
  readonly tenantId?: string;
}>;

type ScheduleQuery = Readonly<{
  readonly tenantId?: string;
  readonly startDate?: string;
  readonly days?: string;
  readonly timeZone?: string;
  readonly managerEmail?: string;
  readonly managerAncestryEmails?: string;
  readonly groupIds?: string;
}>;

type CountEntry<TKey extends string> = Readonly<{
  readonly key: TKey;
  readonly count: number;
}>;

const workCalendarPolicy: ForWorkCalendarPolicy = createTenantWorkCalendarPolicy({
  workingWeekdays: [1, 2, 3, 4, 5],
  holidays: []
});

const toScheduledQuestions = (questions: readonly AdminAuthoringQuestion[]): readonly ScheduledQuestion[] =>
  questions.map((question) => ({
    id: question.id,
    createdAt: question.createdAt,
    text: question.text,
    category: question.category,
    tags: question.tags,
    options: question.options,
    points: question.points,
    allowComments: question.allowComments,
    schedule: question.schedule,
    suppressionWindows: question.suppressionWindows
  }));

const targetMatches = (
  question: AdminAuthoringQuestion,
  profile: AdminAuthoringEmployeeProfile
): boolean => {
  if (question.target.type === 'whole-company') {
    return true;
  }

  if (question.target.type === 'group') {
    return profile.groupIds.includes(question.target.groupId);
  }

  return (
    (isSome(profile.managerEmail) && profile.managerEmail.value === question.target.managerEmail) ||
    profile.managerAncestryEmails.includes(question.target.managerEmail)
  );
};

const sendBadRequest = (reply: FastifyReply, message: string): FastifyReply =>
  reply.code(400).send({
    status: 'error',
    message
  });

const buildCounts = <TKey extends string>(values: readonly TKey[]): readonly CountEntry<TKey>[] => {
  const totals = values.reduce((accumulator, value) => {
    const nextCount = (accumulator.get(value) ?? 0) + 1;
    accumulator.set(value, nextCount);
    return accumulator;
  }, new Map<TKey, number>());

  return [...totals.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
};

const average = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0) / values.length;

const parseCsv = (value: string | undefined): readonly string[] =>
  value === undefined
    ? []
    : value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

const addDays = (isoDate: string, days: number): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const reasonForSelectedQuestion = (
  question: ScheduledQuestion | null,
  localDate: string,
  timeZone: string,
  calendarPolicy: ForWorkCalendarPolicy
): string => {
  if (question === null) {
    if (!calendarPolicy.isWorkingDay(localDate, timeZone)) {
      return 'No question: non-working day for this tenant calendar.';
    }
    return 'No question: no eligible specific-date/recurring question and queue is exhausted.';
  }

  if (question.schedule.type === 'queue') {
    return 'Selected because it is the next unresolved queue question for this profile.';
  }
  if (question.schedule.type === 'specific-date') {
    return `Selected because it is explicitly scheduled on ${question.schedule.date}.`;
  }
  return 'Selected because recurring rule is due on this date and it won priority.';
};

type CreateServerInput = Readonly<{
  readonly store: RuntimeStore;
  readonly workCalendarPolicy?: ForWorkCalendarPolicy;
}>;

export const createServer = async (
  input: CreateServerInput
): Promise<ReturnType<typeof Fastify>> => {
  const store = input.store;
  await store.initialize();

  const fastify = Fastify({ logger: true });
  const effectiveCalendarPolicy = input.workCalendarPolicy ?? workCalendarPolicy;

  fastify.get('/health', async () => ({ status: 'ok' }));

  fastify.get('/ui', async (_request, reply) =>
    reply.type('text/html').send(renderAdminUiPage())
  );

  fastify.get('/dashboard', async (_request, reply) =>
    reply.type('text/html').send(renderPeopleDashboardPage())
  );

  fastify.get('/admin/questions', async (
    request: FastifyRequest<{ readonly Querystring: TenantQuery }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.query.tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      return sendBadRequest(reply, 'tenantId query parameter is required.');
    }

    const questions = await store.loadQuestions(tenantId);
    return reply.send({ status: 'ok', tenantId, questions });
  });

  fastify.get('/admin/dashboard', async (
    request: FastifyRequest<{ readonly Querystring: TenantQuery }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.query.tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      return sendBadRequest(reply, 'tenantId query parameter is required.');
    }

    const questions = await store.loadQuestions(tenantId);
    const selection = await store.loadSelectionState(tenantId);

    return reply.send({
      status: 'ok',
      tenantId,
      totalQuestions: questions.length,
      categoryCounts: buildCounts(questions.map((question) => question.category)),
      scheduleTypeCounts: buildCounts(questions.map((question) => question.schedule.type)),
      targetTypeCounts: buildCounts(questions.map((question) => question.target.type)),
      queueState: {
        version: selection.version,
        consumedQueueCount: selection.state.consumedQueueQuestionIds.length
      }
    });
  });

  fastify.get('/admin/schedule', async (
    request: FastifyRequest<{ readonly Querystring: ScheduleQuery }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.query.tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      return sendBadRequest(reply, 'tenantId query parameter is required.');
    }

    const startDate = request.query.startDate ?? new Date().toISOString().slice(0, 10);
    const days = Number.parseInt(request.query.days ?? '10', 10);
    const timeZone = request.query.timeZone ?? 'UTC';

    if (!Number.isInteger(days) || days < 1 || days > 60) {
      return sendBadRequest(reply, 'days must be an integer between 1 and 60.');
    }

    const profile = toAdminAuthoringProfile({
      ...(request.query.managerEmail === undefined ? {} : { managerEmail: request.query.managerEmail }),
      managerAncestryEmails: parseCsv(request.query.managerAncestryEmails),
      groupIds: parseCsv(request.query.groupIds)
    });

    const allQuestions = await store.loadQuestions(tenantId);
    const questions = allQuestions.filter((question) => targetMatches(question, profile));
    const scheduledQuestions = toScheduledQuestions(questions);
    const loaded = await store.loadSelectionState(tenantId);

    type ScheduleRow = Readonly<{
      readonly localDate: string;
      readonly question: Readonly<{ readonly id: string; readonly text: string; readonly scheduleType: string; }> | null;
      readonly reason: string;
    }>;

    const scheduleRows = Array.from({ length: days }, (_, index) => index).reduce(
      (accumulator, index) => {
        const localDate = addDays(startDate, index);
        const selection = selectQuestionForEmployeeMoment(
          {
            timestampUtcIso: `${localDate}T09:00:00.000Z`,
            timeZone
          },
          scheduledQuestions,
          accumulator.state,
          effectiveCalendarPolicy
        );

        if (selection._tag === 'Left') {
          return {
            state: accumulator.state,
            rows: [
              ...accumulator.rows,
              {
                localDate,
                question: null,
                reason: selection.left.map((error) => error.message).join('; ')
              }
            ]
          };
        }

        const selected = isSome(selection.right.question) ? selection.right.question.value : null;
        return {
          state: selection.right.nextState,
          rows: [
            ...accumulator.rows,
            {
              localDate,
              question: selected === null ? null : { id: selected.id, text: selected.text, scheduleType: selected.schedule.type },
              reason: reasonForSelectedQuestion(selected, localDate, timeZone, effectiveCalendarPolicy)
            }
          ]
        };
      },
      { state: loaded.state, rows: [] as readonly ScheduleRow[] }
    ).rows;

    return reply.send({
      status: 'ok',
      tenantId,
      timeZone,
      days: scheduleRows
    });
  });

  fastify.get('/dashboard/data', async (
    request: FastifyRequest<{ readonly Querystring: TenantQuery }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.query.tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      return sendBadRequest(reply, 'tenantId query parameter is required.');
    }

    const questions = await store.loadQuestions(tenantId);
    const scores = await store.loadScores(tenantId);

    if (scores.length < 3) {
      return reply.send({
        status: 'insufficient_data',
        message: 'Not enough responses yet to display score analytics safely.',
        totalResponses: scores.length
      });
    }

    const questionById = new Map(questions.map((question) => [question.id, question] as const));
    const grouped = scores.reduce((accumulator, score) => {
      const existing = accumulator.get(score.questionId) ?? [];
      accumulator.set(score.questionId, [...existing, score]);
      return accumulator;
    }, new Map<string, readonly typeof scores[number][]>());

    const byQuestion = [...grouped.entries()]
      .map(([questionId, entries]) => ({
        questionId,
        questionText: questionById.get(questionId)?.text ?? questionId,
        averageScore: average(entries.map((entry) => entry.normalizedScore)),
        responseCount: entries.length
      }))
      .sort((left, right) => right.averageScore - left.averageScore);

    return reply.send({
      status: 'ok',
      tenantId,
      totalResponses: scores.length,
      overallAverageScore: average(scores.map((score) => score.normalizedScore)),
      byQuestion
    });
  });

  fastify.post('/admin/questions', async (
    request: FastifyRequest<{ readonly Body: AdminUpsertBody }>,
    reply: FastifyReply
  ) => {
    const payload = request.body;
    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: payload.questions as never
    });

    if (parsed._tag === 'Left') {
      return sendBadRequest(reply, parsed.left.join('; '));
    }

    await store.upsertQuestions(payload.tenantId, parsed.right);
    return reply.code(200).send({ status: 'ok', count: parsed.right.length });
  });

  fastify.put('/admin/questions/:questionId', async (
    request: FastifyRequest<{
      readonly Params: Readonly<{ readonly questionId: string }>;
      readonly Body: SingleQuestionUpsertBody;
    }>,
    reply: FastifyReply
  ) => {
    const normalizedQuestion = {
      ...request.body.question,
      id: request.params.questionId
    };

    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: [normalizedQuestion] as never
    });

    if (parsed._tag === 'Left') {
      return sendBadRequest(reply, parsed.left.join('; '));
    }

    const nextQuestion = parsed.right[0];
    if (nextQuestion === undefined) {
      return sendBadRequest(reply, 'question payload is required.');
    }
    const existing = await store.loadQuestions(request.body.tenantId);
    const filtered = existing.filter((question) => question.id !== request.params.questionId);
    await store.upsertQuestions(request.body.tenantId, [...filtered, nextQuestion]);

    return reply.send({
      status: 'ok',
      questionId: nextQuestion.id
    });
  });

  fastify.post('/admin/questions/single', async (
    request: FastifyRequest<{ readonly Body: SingleQuestionUpsertBody }>,
    reply: FastifyReply
  ) => {
    const createdQuestion = {
      ...request.body.question,
      id: `q-${randomUUID()}`,
      created_at:
        typeof request.body.question.created_at === 'string'
          ? request.body.question.created_at
          : new Date().toISOString()
    };

    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: [createdQuestion] as never
    });

    if (parsed._tag === 'Left') {
      return sendBadRequest(reply, parsed.left.join('; '));
    }

    const nextQuestion = parsed.right[0];
    if (nextQuestion === undefined) {
      return sendBadRequest(reply, 'question payload is required.');
    }

    const existing = await store.loadQuestions(request.body.tenantId);
    await store.upsertQuestions(request.body.tenantId, [...existing, nextQuestion]);

    return reply.send({
      status: 'ok',
      questionId: nextQuestion.id
    });
  });

  fastify.delete('/admin/questions/:questionId', async (
    request: FastifyRequest<{
      readonly Params: Readonly<{ readonly questionId: string }>;
      readonly Querystring: TenantQuery;
    }>,
    reply: FastifyReply
  ) => {
    const tenantId = request.query.tenantId;
    if (tenantId === undefined || tenantId.length === 0) {
      return sendBadRequest(reply, 'tenantId query parameter is required.');
    }

    const existing = await store.loadQuestions(tenantId);
    const filtered = existing.filter((question) => question.id !== request.params.questionId);
    await store.upsertQuestions(tenantId, filtered);

    return reply.send({
      status: 'ok',
      count: filtered.length
    });
  });

  fastify.post('/admin/preview', async (
    request: FastifyRequest<{
      readonly Body: Readonly<{
        readonly tenantId: string;
        readonly timestampUtcIso: string;
        readonly timeZone: string;
        readonly profile: PromptRequestProfileInput;
      }>;
    }>,
    reply: FastifyReply
  ) => {
    const questions = await store.loadQuestions(request.body.tenantId);
    const parsed = parseAdminAuthoringPreviewInput({
      timestamp_utc_iso: request.body.timestampUtcIso,
      time_zone: request.body.timeZone,
      profile: {
        ...(request.body.profile.managerEmail === undefined
          ? {}
          : { manager_email: request.body.profile.managerEmail }),
        manager_ancestry_emails: request.body.profile.managerAncestryEmails,
        group_ids: request.body.profile.groupIds
      }
    });

    const preview = previewQuestionResolutionForEmployee(
      { timestampUtcIso: parsed.timestampUtcIso, timeZone: parsed.timeZone },
      parsed.profile,
      questions,
      { consumedQueueQuestionIds: [] },
      effectiveCalendarPolicy
    );

    if (preview._tag === 'Left') {
      return sendBadRequest(reply, preview.left.map((error) => error.message).join('; '));
    }

    return reply.send({
      status: 'ok',
      question: isSome(preview.right.question) ? preview.right.question.value : null,
      localDate: preview.right.localDate,
      timeZone: preview.right.timeZone
    });
  });

  fastify.post('/employee/prompt', async (
    request: FastifyRequest<{ readonly Body: PromptBody }>,
    reply: FastifyReply
  ) => {
    const profile = toAdminAuthoringProfile(request.body.profile);
    const allQuestions = await store.loadQuestions(request.body.tenantId);
    const questions = allQuestions.filter((question) => targetMatches(question, profile));

    const loaded = await store.loadSelectionState(request.body.tenantId);
    const selection = selectQuestionForEmployeeMoment(
      { timestampUtcIso: request.body.timestampUtcIso, timeZone: request.body.timeZone },
      toScheduledQuestions(questions),
      loaded.state,
      effectiveCalendarPolicy
    );

    if (selection._tag === 'Left') {
      return sendBadRequest(reply, selection.left.map((error) => error.message).join('; '));
    }

    const persisted = await store.saveSelectionState(
      request.body.tenantId,
      selection.right.nextState,
      loaded.version
    );

    if (persisted._tag === 'Left') {
      return sendBadRequest(reply, 'Version conflict while persisting queue state. Retry request.');
    }

    return reply.send({
      status: 'ok',
      question: isSome(selection.right.question) ? selection.right.question.value : null,
      localDate: selection.right.localDate,
      timeZone: selection.right.timeZone,
      stateVersion: persisted.right
    });
  });

  fastify.post('/employee/score', async (
    request: FastifyRequest<{ readonly Body: ScoreSubmitBody }>,
    reply: FastifyReply
  ) => {
    const parsed = validateResponsePayload(request.body.payload);
    if (parsed._tag === 'Left') {
      return sendBadRequest(reply, parsed.left.message);
    }

    await store.saveScore(request.body.tenantId, parsed.right);
    return reply.send({ status: 'ok' });
  });

  fastify.addHook('onClose', async () => {
    await store.close();
  });

  return fastify;
};

export const run = async (): Promise<void> => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined) {
    throw new Error('DATABASE_URL must be set.');
  }

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  const server = await createServer({
    store: new PostgresRuntimeStore(connectionString)
  });

  await server.listen({ host, port });
};

const entrypointPath = process.argv[1];
const isExecutedDirectly =
  entrypointPath !== undefined && import.meta.url === new URL(`file://${entrypointPath}`).href;

if (isExecutedDirectly) {
  run().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  });
}
