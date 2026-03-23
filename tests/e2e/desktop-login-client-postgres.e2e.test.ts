import { test, expect } from '@playwright/test';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from '../../packages/adapters/src/runtime/server.js';
import { PostgresRuntimeStore } from '../../packages/adapters/src/runtime/postgres-runtime-store.js';
import { getAvailablePort, startPostgresContainer } from './support/postgres-harness.js';

const execFileAsync = promisify(execFile);
const sleep = async (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const runDockerPsqlCsv = async (
  containerName: string,
  databaseName: string,
  sql: string
): Promise<readonly string[]> => {
  const { stdout } = await execFileAsync('docker', [
    'exec',
    containerName,
    'psql',
    '-U',
    'postgres',
    '-d',
    databaseName,
    '-t',
    '-A',
    '-F',
    '|',
    '-c',
    sql
  ]);

  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

const waitForHttpOk = async (url: string, timeoutMs: number): Promise<void> => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // keep retrying
    }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for URL to become ready: ${url}`);
};

test.describe('desktop login client with real postgres runtime', () => {
  const contextPromise = (async (): Promise<Readonly<{
    readonly server: Awaited<ReturnType<typeof createServer>>;
    readonly postgres: Awaited<ReturnType<typeof startPostgresContainer>>;
    readonly appPort: number;
  }>> => {
    const postgres = await startPostgresContainer();
    const appPort = await getAvailablePort();

    const server = await createServer({
      store: new PostgresRuntimeStore(postgres.connectionString)
    });

    await server.listen({
      host: '127.0.0.1',
      port: appPort
    });

    return {
      server,
      postgres,
      appPort
    };
  })();

  test.beforeAll(async () => {
    await contextPromise;
    await execFileAsync('pnpm', ['--filter', '@in-the-loop/adapters', 'build'], {
      cwd: process.cwd()
    });
  });

  test.afterAll(async () => {
    const context = await contextPromise;
    await context.server.close();
    await context.postgres.stop();
  });

  test('runs one-shot desktop client process and persists response score row', async ({ request, page }) => {
    const { appPort, postgres } = await contextPromise;
    const tenantId = 'tenant-desktop-e2e';

    const upsert = await request.post(`http://127.0.0.1:${appPort}/admin/questions`, {
      data: {
        tenantId,
        questions: [
          {
            id: 'q-desktop-1',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'How focused were you today?',
            category: 'focus',
            tags: ['daily'],
            options: [
              { text: 'Low', points: 30 },
              { text: 'Medium', points: 60 },
              { text: 'High', points: 90 }
            ],
            points: 10,
            allow_comments: true,
            schedule: { type: 'queue' },
            target: { type: 'whole_company' }
          }
        ]
      }
    });
    expect(upsert.ok()).toBeTruthy();

    const desktopUiPort = await getAvailablePort();
    const desktopProcess = spawn(
      'node',
      ['packages/adapters/dist/adapters/src/runtime/desktop-login-client.js'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ITL_API_BASE_URL: `http://127.0.0.1:${appPort}`,
          ITL_TENANT_ID: tenantId,
          ITL_TIMESTAMP_UTC_ISO: '2026-03-24T09:00:00.000Z',
          ITL_TIME_ZONE: 'UTC',
          ITL_MANAGER_EMAIL: 'lead@example.com',
          ITL_MANAGER_ANCESTRY_EMAILS: 'vp@example.com',
          ITL_GROUP_IDS: 'grp-a',
          ITL_ROLE: 'ic',
          ITL_LEVEL: 'l3',
          ITL_DESKTOP_UI_MODE: 'interactive',
          ITL_DESKTOP_UI_PORT: String(desktopUiPort),
          ITL_DESKTOP_UI_TIMEOUT_MS: '120000',
          RUNTIME_COMMIT_HASH: 'b'.repeat(40),
          RUNTIME_BUILD_HASH: 'sha256:e2e-build',
          RUNTIME_EXPECTED_BUILD_HASH: 'sha256:e2e-build',
          RUNTIME_BUILD_TIME: '2026-03-23T00:00:00.000Z',
          RUNTIME_CONFIG_SCHEMA_VERSION: 'v1',
          RUNTIME_SOURCE_REPOSITORY_URL: 'https://example.com/repo',
          RUNTIME_REPRODUCIBLE_BUILD_INSTRUCTIONS_URL: 'https://example.com/repo/build.md',
          RUNTIME_ATTESTATION_STATUS: 'VERIFIED',
          RUNTIME_SERVER_BINARY_HASH: 'sha256:server',
          RUNTIME_POLICY_HASH: 'sha256:policy',
          RUNTIME_BUILD_PROVENANCE_HASH: 'sha256:prov'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    const desktopExited = new Promise<number>((resolve, reject) => {
      desktopProcess.on('error', reject);
      desktopProcess.on('close', (code) => resolve(code ?? 1));
    });

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Desktop prompt URL was not emitted.')), 20_000);
      const onChunk = (chunk: Buffer): void => {
        const text = chunk.toString('utf8');
        if (text.includes('ITL_DESKTOP_PROMPT_URL=')) {
          clearTimeout(timeout);
          desktopProcess.stdout.off('data', onChunk);
          resolve();
        }
      };
      desktopProcess.stdout.on('data', onChunk);
    });

    await waitForHttpOk(`http://127.0.0.1:${desktopUiPort}/health`, 20_000);

    await page.goto(`http://127.0.0.1:${desktopUiPort}/`);
    await expect(page.getByTestId('question-text')).toContainText('How focused were you today?');
    await page.getByTestId('option-2').check();
    await page.getByTestId('comment').fill('desktop e2e comment');
    await page.getByTestId('submit').click();

    const exitCode = await desktopExited;
    expect(exitCode).toBe(0);

    const sql =
      "SELECT question_id, normalized_score, optional_comment, manager_email, role, level, survey_day " +
      `FROM response_scores WHERE tenant_id = '${tenantId}'`;
    const lines = await runDockerPsqlCsv(postgres.containerName, postgres.databaseName, sql);

    expect(lines).toHaveLength(1);
    const [savedRow] = lines;
    expect(savedRow).toBeDefined();

    const columns = (savedRow ?? '').split('|');
    expect(columns).toHaveLength(7);
    expect(columns[0]).toBe('q-desktop-1');
    expect(columns[1]).toBe('60');
    expect(columns[2]).toBe('desktop e2e comment');
    expect(columns[3]).toBe('lead@example.com');
    expect(columns[4]).toBe('ic');
    expect(columns[5]).toBe('l3');
    expect(columns[6]).toBe('2026-03-24');
  });
});
