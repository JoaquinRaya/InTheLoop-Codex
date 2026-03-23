import { createServer as createHttpServer } from 'node:http';
import { createServer as createNetServer } from 'node:net';
import { noText, someText, createInMemoryEmployeePromptStateStore } from '../driving/web-ui/employee-daily-prompt-app.js';
import {
  runLoginTriggeredThinClient,
  type ThinClientFetchResult,
  type ThinClientSubmissionResult,
  type ThinClientUserAction
} from '../driving/desktop-login/login-triggered-thin-client.js';
import type { VersionEndpointResponse } from '../driving/rest-api/version-endpoint.js';

type PromptApiResponse = Readonly<{
  readonly status: 'ok' | 'error';
  readonly message?: string;
  readonly question?: Readonly<{
    readonly id: string;
    readonly text: string;
    readonly options: readonly Readonly<{
      readonly text: string;
      readonly points: number;
    }>[];
    readonly allowComments: boolean;
  }> | null;
  readonly localDate?: string;
}>;

type ScoreSubmitResponse = Readonly<{
  readonly status: 'ok' | 'error';
  readonly message?: string;
}>;

const parseCsv = (value: string | undefined): readonly string[] =>
  value === undefined
    ? []
    : value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

const requiredEnv = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is required.`);
  }
  return value;
};

const toFetchFailure = (message: string): ThinClientFetchResult => ({
  status: 'FETCH_FAILED',
  message
});

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);
  return (await response.json()) as T;
};

const getAvailablePort = async (): Promise<number> =>
  new Promise((resolve, reject) => {
    const probe = createNetServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (address === null || typeof address === 'string') {
        reject(new Error('Failed to allocate a TCP port'));
        return;
      }
      const selectedPort = address.port;
      probe.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve(selectedPort);
      });
    });
  });

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const renderInteractivePromptPage = (input: Readonly<{
  readonly questionText: string;
  readonly options: readonly Readonly<{ readonly id: string; readonly label: string }>[];
  readonly commentEnabled: boolean;
}>): string => {
  const optionsHtml = input.options
    .map(
      (option, index) => `<label class="option">
  <input data-testid="option-${index + 1}" type="radio" name="selectedOptionId" value="${escapeHtml(option.id)}" ${index === 0 ? 'checked' : ''}/>
  <span>${escapeHtml(option.label)}</span>
</label>`
    )
    .join('');

  const commentHtml = input.commentEnabled
    ? `<label for="comment">Optional comment</label>
<textarea id="comment" data-testid="comment" rows="4"></textarea>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>In The Loop Prompt</title>
<style>
body{margin:0;background:#f3f7ff;color:#132035;font:16px/1.4 "Segoe UI",system-ui,sans-serif}
main{max-width:680px;margin:30px auto;padding:0 16px}
.card{background:#fff;border:1px solid #d7e0f3;border-radius:16px;padding:18px;box-shadow:0 12px 24px rgba(17,36,64,.12)}
h1{margin:0 0 10px;font-size:1.2rem}
.option{display:flex;gap:10px;align-items:flex-start;margin:10px 0;padding:10px;border:1px solid #d8e2f7;border-radius:12px;background:#f9fbff}
textarea{width:100%;border:1px solid #cad8ef;border-radius:12px;padding:10px;font:inherit}
.actions{display:flex;gap:10px;margin-top:12px}
button{border:0;border-radius:12px;padding:10px 14px;font:inherit;font-weight:600;cursor:pointer}
#submitButton{background:#1d63d6;color:#fff}
#skipButton{background:#edf2ff;color:#21437b}
#status{margin-top:10px;color:#4b607f}
</style>
</head>
<body>
<main>
  <section class="card">
    <h1 data-testid="question-text">${escapeHtml(input.questionText)}</h1>
    <form id="promptForm">
      ${optionsHtml}
      ${commentHtml}
      <div class="actions">
        <button id="submitButton" data-testid="submit" type="submit">Submit</button>
        <button id="skipButton" data-testid="skip" type="button">Skip</button>
      </div>
      <p id="status"></p>
    </form>
  </section>
</main>
<script>
const form = document.getElementById('promptForm');
const skipButton = document.getElementById('skipButton');
const status = document.getElementById('status');
const submitAction = async (payload) => {
  status.textContent = 'Submitting...';
  const response = await fetch('/action', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  if (response.ok) {
    status.textContent = 'Submitted. You can close this window.';
    return;
  }
  status.textContent = body.message ?? 'Submission failed.';
};
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const selected = form.querySelector('input[name="selectedOptionId"]:checked');
  const comment = document.getElementById('comment');
  await submitAction({
    action: 'answered',
    selectedOptionId: selected ? selected.value : null,
    comment: comment ? comment.value : null
  });
});
skipButton.addEventListener('click', async () => {
  await submitAction({ action: 'skipped' });
});
</script>
</body>
</html>`;
};

const normalizePromptOptions = (
  options: readonly Readonly<{ readonly text: string; readonly points: number }>[]
): readonly Readonly<{ readonly id: string; readonly label: string; readonly normalizedScore: number }>[] =>
  options.map((option, index) => ({
    id: `option-${index + 1}`,
    label: option.text,
    normalizedScore: option.points
  }));

const interactivePromptAction = async (input: Readonly<{
  readonly uiPort: number;
  readonly timeoutMs: number;
  readonly questionText: string;
  readonly options: readonly Readonly<{ readonly id: string; readonly label: string }>[];
  readonly commentEnabled: boolean;
}>): Promise<ThinClientUserAction> =>
  new Promise((resolve, reject) => {
    const pageHtml = renderInteractivePromptPage({
      questionText: input.questionText,
      options: input.options,
      commentEnabled: input.commentEnabled
    });
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('Interactive prompt timed out waiting for user action.'));
    }, input.timeoutMs);

    const finish = (action: ThinClientUserAction): void => {
      clearTimeout(timer);
      server.close();
      resolve(action);
    };

    const server = createHttpServer((request, response) => {
      if (request.method === 'GET' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(pageHtml);
        return;
      }

      if (request.method === 'GET' && request.url === '/health') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      if (request.method === 'POST' && request.url === '/action') {
        const chunks: Buffer[] = [];
        request.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        request.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const payload = JSON.parse(raw) as Readonly<{
            readonly action?: string;
            readonly selectedOptionId?: string | null;
            readonly comment?: string | null;
          }>;

          if (payload.action === 'skipped') {
            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ status: 'ok' }));
            finish({ action: 'skipped' });
            return;
          }

          if (payload.action === 'answered') {
            const selectedOptionId = payload.selectedOptionId;
            if (selectedOptionId === undefined || selectedOptionId === null || selectedOptionId.length === 0) {
              response.writeHead(400, { 'content-type': 'application/json' });
              response.end(JSON.stringify({ message: 'A single option must be selected before submitting.' }));
              return;
            }

            response.writeHead(200, { 'content-type': 'application/json' });
            response.end(JSON.stringify({ status: 'ok' }));
            finish({
              action: 'answered',
              selectedOptionId: someText(selectedOptionId),
              comment:
                payload.comment === undefined || payload.comment === null || payload.comment.length === 0
                  ? noText()
                  : someText(payload.comment)
            });
            return;
          }

          response.writeHead(400, { 'content-type': 'application/json' });
          response.end(JSON.stringify({ message: 'Unsupported action.' }));
        });
        return;
      }

      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end('Not found');
    });

    server.listen(input.uiPort, '127.0.0.1');
  });

const run = async (): Promise<number> => {
  const apiBaseUrl = requiredEnv('ITL_API_BASE_URL');
  const tenantId = requiredEnv('ITL_TENANT_ID');
  const managerEmail = requiredEnv('ITL_MANAGER_EMAIL');
  const role = requiredEnv('ITL_ROLE');
  const level = requiredEnv('ITL_LEVEL');
  const timestampUtcIso = process.env.ITL_TIMESTAMP_UTC_ISO ?? new Date().toISOString();
  const timeZone = process.env.ITL_TIME_ZONE ?? 'UTC';
  const managerAncestryEmails = parseCsv(process.env.ITL_MANAGER_ANCESTRY_EMAILS);
  const groupIds = parseCsv(process.env.ITL_GROUP_IDS);
  const autoAction = process.env.ITL_DESKTOP_AUTO_ACTION ?? 'answered';
  const autoOptionId = process.env.ITL_DESKTOP_AUTO_OPTION_ID;
  const autoComment = process.env.ITL_DESKTOP_AUTO_COMMENT;
  const uiMode = process.env.ITL_DESKTOP_UI_MODE ?? 'auto';
  const uiTimeoutMs = Number.parseInt(process.env.ITL_DESKTOP_UI_TIMEOUT_MS ?? '180000', 10);
  const uiPortFromEnv = process.env.ITL_DESKTOP_UI_PORT;

  const stateStore = createInMemoryEmployeePromptStateStore();

  const launchResult = await runLoginTriggeredThinClient({
    profile: {
      managerEmail,
      role,
      level
    },
    stateStore,
    fetchPrompt: async (): Promise<ThinClientFetchResult> => {
      let promptBody: PromptApiResponse;
      try {
        promptBody = await fetchJson<PromptApiResponse>(`${apiBaseUrl}/employee/prompt`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            timestampUtcIso,
            timeZone,
            profile: {
              managerEmail,
              managerAncestryEmails,
              groupIds
            }
          })
        });
      } catch (error) {
        return toFetchFailure(`Failed to fetch prompt: ${String(error)}`);
      }

      if (promptBody.status !== 'ok') {
        return toFetchFailure(promptBody.message ?? 'Prompt endpoint returned an error.');
      }

      if (promptBody.question === null || promptBody.question === undefined) {
        return { status: 'NO_PROMPT_AVAILABLE' };
      }

      let versionBody: VersionEndpointResponse;
      try {
        versionBody = await fetchJson<VersionEndpointResponse>(`${apiBaseUrl}/version`);
      } catch (error) {
        return toFetchFailure(`Failed to fetch version metadata: ${String(error)}`);
      }

      return {
        status: 'PROMPT_AVAILABLE',
        localDay: promptBody.localDate ?? timestampUtcIso.slice(0, 10),
        question: {
          id: promptBody.question.id,
          text: promptBody.question.text,
          options: normalizePromptOptions(promptBody.question.options),
          commentEnabled: promptBody.question.allowComments
        },
        versionInput: {
          commitHash: versionBody.commitHash,
          buildHash: versionBody.buildHash,
          expectedBuildHash: versionBody.expectedBuildHash,
          buildTime: versionBody.buildTime,
          configSchemaVersion: versionBody.configSchemaVersion,
          sourceRepositoryUrl: versionBody.sourceRepositoryUrl,
          reproducibleBuildInstructionsUrl: versionBody.reproducibleBuildInstructionsUrl,
          runtimeAttestationStatus: versionBody.runtimeAttestationStatus,
          publishedArtifactHashes: versionBody.publishedArtifactHashes,
          ...(versionBody.attestationReport.downloadUrl === null
            ? {}
            : { attestationReportDownloadUrl: versionBody.attestationReport.downloadUrl })
        },
        packagingPipelineSignal: 'UNAVAILABLE',
        anonymousSubmissionTransport: null
      };
    },
    presentPrompt: async (input): Promise<ThinClientUserAction> => {
      if (uiMode === 'interactive') {
        const uiPort =
          uiPortFromEnv === undefined || uiPortFromEnv.length === 0
            ? await getAvailablePort()
            : Number.parseInt(uiPortFromEnv, 10);
        // eslint-disable-next-line no-console
        console.log(`ITL_DESKTOP_PROMPT_URL=http://127.0.0.1:${uiPort}/`);
        return interactivePromptAction({
          uiPort,
          timeoutMs: uiTimeoutMs,
          questionText: input.question.text,
          options: input.question.options.map((option) => ({
            id: option.id,
            label: option.label
          })),
          commentEnabled: input.question.commentEnabled
        });
      }

      if (autoAction === 'skipped') {
        return { action: 'skipped' };
      }

      const chosenOption = autoOptionId ?? input.question.options[0]?.id;
      if (chosenOption === undefined) {
        return {
          action: 'answered',
          selectedOptionId: noText(),
          comment: noText()
        };
      }

      return {
        action: 'answered',
        selectedOptionId: someText(chosenOption),
        comment: autoComment === undefined ? noText() : someText(autoComment)
      };
    },
    submitPromptOutcome: async (input): Promise<ThinClientSubmissionResult> => {
      const userAction = input.userAction;

      if (userAction.action === 'skipped') {
        return { status: 'SUBMITTED' };
      }

      const selectedOptionId = userAction.selectedOptionId;

      if (selectedOptionId._tag === 'None') {
        return {
          status: 'SUBMISSION_FAILED',
          message: 'No selected option available for answered action.'
        };
      }

      const selectedOption = input.question.options.find(
        (option) => option.id === selectedOptionId.value
      );
      if (selectedOption === undefined) {
        return {
          status: 'SUBMISSION_FAILED',
          message: 'Selected option does not exist on prompt question.'
        };
      }

      let submitBody: ScoreSubmitResponse;
      try {
        submitBody = await fetchJson<ScoreSubmitResponse>(`${apiBaseUrl}/employee/score`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            payload: {
              question_id: input.question.id,
              normalized_score: selectedOption.normalizedScore,
              ...(userAction.comment._tag === 'Some'
                ? { optional_comment: userAction.comment.value }
                : {}),
              manager_email: managerEmail,
              role,
              level,
              survey_day: input.localDay
            }
          })
        });
      } catch (error) {
        return {
          status: 'SUBMISSION_FAILED',
          message: `Failed to submit score: ${String(error)}`
        };
      }

      if (submitBody.status !== 'ok') {
        return {
          status: 'SUBMISSION_FAILED',
          message: submitBody.message ?? 'Score endpoint returned an error.'
        };
      }

      return { status: 'SUBMITTED' };
    }
  });

  if (launchResult.status === 'EXITED_FETCH_FAILED') {
    // eslint-disable-next-line no-console
    console.error(launchResult.message);
    return 1;
  }

  if (launchResult.status === 'EXITED_SUBMISSION_FAILED') {
    // eslint-disable-next-line no-console
    console.error(launchResult.message);
    return 1;
  }

  if (launchResult.status === 'EXITED_VALIDATION_FAILED') {
    // eslint-disable-next-line no-console
    console.error(launchResult.message);
    return 1;
  }

  return 0;
};

const entrypointPath = process.argv[1];
const isExecutedDirectly =
  entrypointPath !== undefined && import.meta.url === new URL(`file://${entrypointPath}`).href;

if (isExecutedDirectly) {
  run()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exitCode = 1;
    });
}

export { run };
