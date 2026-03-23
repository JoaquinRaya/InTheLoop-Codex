import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import {
  parseAdminAuthoringPreviewInput,
  parseAndValidateAdminAuthoringBatch
} from '../driving/rest-api/admin-authoring-contract.js';
import {
  createTenantWorkCalendarPolicy,
  previewQuestionResolutionForEmployee,
  selectQuestionForEmployeeMoment,
  type AdminAuthoringEmployeeProfile,
  type AdminAuthoringQuestion,
  type ScheduledQuestion
} from '../../../core/src/index.js';
import type { ForWorkCalendarPolicy } from '../../../core/src/ports/driven/for-work-calendar-policy.js';
import { isSome } from '../../../core/src/domain/option.js';
import { PostgresRuntimeStore, toAdminAuthoringProfile, type PromptRequestProfileInput } from './postgres-runtime-store.js';
import type { RuntimeStore } from './runtime-store.js';

type AdminUpsertBody = Readonly<{
  readonly tenantId: string;
  readonly questions: ReadonlyArray<Readonly<Record<string, unknown>>>;
}>;

type PromptBody = Readonly<{
  readonly tenantId: string;
  readonly timestampUtcIso: string;
  readonly timeZone: string;
  readonly profile: PromptRequestProfileInput;
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

  fastify.get('/health', async () => ({
    status: 'ok'
  }));

  fastify.get('/ui', async (_request, reply) =>
    reply.type('text/html').send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>In The Loop Console</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; max-width: 1000px; }
    section { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    label { display: block; margin-top: 8px; font-weight: 600; }
    input, textarea, button { margin-top: 4px; padding: 8px; font-size: 14px; }
    textarea { width: 100%; min-height: 120px; }
    .row { display: flex; gap: 12px; }
    .row > div { flex: 1; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow: auto; }
  </style>
</head>
<body>
  <h1>In The Loop Admin + Employee Console</h1>

  <section>
    <h2>1) Admin Authoring</h2>
    <label for="tenantId">Tenant ID</label>
    <input id="tenantId" value="tenant-browser" />
    <label for="questionsJson">Questions JSON (array)</label>
    <textarea id="questionsJson">[
  {
    "id":"q-browser-1",
    "created_at":"2026-03-23T00:00:00.000Z",
    "text":"How is your workload?",
    "category":"wellbeing",
    "tags":["daily"],
    "options":["1","2","3","4","5"],
    "points":10,
    "allow_comments":true,
    "schedule":{"type":"queue"},
    "target":{"type":"whole_company"}
  }
]</textarea>
    <button id="saveQuestions">Save Questions</button>
    <pre id="adminResult"></pre>
  </section>

  <section>
    <h2>2) Employee Prompt</h2>
    <div class="row">
      <div>
        <label for="timestampUtcIso">Timestamp (UTC ISO)</label>
        <input id="timestampUtcIso" value="2026-03-24T09:00:00.000Z" />
      </div>
      <div>
        <label for="timeZone">Timezone</label>
        <input id="timeZone" value="UTC" />
      </div>
    </div>
    <label for="managerEmail">Manager Email</label>
    <input id="managerEmail" value="lead@example.com" />
    <label for="managerAncestryEmails">Manager Ancestry (comma-separated)</label>
    <input id="managerAncestryEmails" value="" />
    <label for="groupIds">Group IDs (comma-separated)</label>
    <input id="groupIds" value="" />
    <button id="loadPrompt">Load Prompt</button>
    <pre id="employeeResult"></pre>
  </section>
  <script>
    const tenantIdInput = document.getElementById('tenantId');
    const questionsJsonInput = document.getElementById('questionsJson');
    const adminResultNode = document.getElementById('adminResult');
    const timestampUtcIsoInput = document.getElementById('timestampUtcIso');
    const timeZoneInput = document.getElementById('timeZone');
    const managerEmailInput = document.getElementById('managerEmail');
    const managerAncestryEmailsInput = document.getElementById('managerAncestryEmails');
    const groupIdsInput = document.getElementById('groupIds');
    const employeeResultNode = document.getElementById('employeeResult');
    const saveQuestionsButton = document.getElementById('saveQuestions');
    const loadPromptButton = document.getElementById('loadPrompt');

    const parseCsv = (value) =>
      value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

    saveQuestionsButton.addEventListener('click', async () => {
      try {
        const questions = JSON.parse(questionsJsonInput.value);
        const response = await fetch('/admin/questions', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenantIdInput.value,
            questions
          })
        });
        const body = await response.json();
        adminResultNode.textContent = JSON.stringify({
          statusCode: response.status,
          body
        }, null, 2);
      } catch (error) {
        adminResultNode.textContent = String(error);
      }
    });

    loadPromptButton.addEventListener('click', async () => {
      try {
        const response = await fetch('/employee/prompt', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId: tenantIdInput.value,
            timestampUtcIso: timestampUtcIsoInput.value,
            timeZone: timeZoneInput.value,
            profile: {
              managerEmail: managerEmailInput.value.length > 0 ? managerEmailInput.value : undefined,
              managerAncestryEmails: parseCsv(managerAncestryEmailsInput.value),
              groupIds: parseCsv(groupIdsInput.value)
            }
          })
        });
        const body = await response.json();
        employeeResultNode.textContent = JSON.stringify({
          statusCode: response.status,
          body
        }, null, 2);
      } catch (error) {
        employeeResultNode.textContent = String(error);
      }
    });
  </script>
</body>
</html>`));

  fastify.post('/admin/questions', async (
    request: FastifyRequest<{ Body: AdminUpsertBody }>,
    reply
  ) => {
    const payload = request.body;
    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: payload.questions as never
    });

    if (parsed._tag === 'Left') {
      return sendBadRequest(reply, parsed.left.join('; '));
    }

    await store.upsertQuestions(payload.tenantId, parsed.right);

    return reply.code(200).send({
      status: 'ok',
      count: parsed.right.length
    });
  });

  fastify.post('/admin/preview', async (
    request: FastifyRequest<{
      Body: Readonly<{
        readonly tenantId: string;
        readonly timestampUtcIso: string;
        readonly timeZone: string;
        readonly profile: PromptRequestProfileInput;
      }>;
    }>,
    reply
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
      {
        timestampUtcIso: parsed.timestampUtcIso,
        timeZone: parsed.timeZone
      },
      parsed.profile,
      questions,
      {
        consumedQueueQuestionIds: []
      },
      effectiveCalendarPolicy
    );

    if (preview._tag === 'Left') {
      return sendBadRequest(reply, preview.left.map((error: { readonly message: string }) => error.message).join('; '));
    }

    return reply.send({
      status: 'ok',
      question: isSome(preview.right.question) ? preview.right.question.value : null,
      localDate: preview.right.localDate,
      timeZone: preview.right.timeZone
    });
  });

  fastify.post('/employee/prompt', async (
    request: FastifyRequest<{ Body: PromptBody }>,
    reply
  ) => {
    const profile = toAdminAuthoringProfile(request.body.profile);
    const allQuestions = await store.loadQuestions(request.body.tenantId);
    const questions = allQuestions.filter((question) => targetMatches(question, profile));

    const loaded = await store.loadSelectionState(request.body.tenantId);
    const selection = selectQuestionForEmployeeMoment(
      {
        timestampUtcIso: request.body.timestampUtcIso,
        timeZone: request.body.timeZone
      },
      toScheduledQuestions(questions),
      loaded.state,
      effectiveCalendarPolicy
    );

    if (selection._tag === 'Left') {
      return sendBadRequest(reply, selection.left.map((error: { readonly message: string }) => error.message).join('; '));
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

  await server.listen({
    host,
    port
  });
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
