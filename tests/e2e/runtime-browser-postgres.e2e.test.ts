import { test, expect } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import { createServer } from '../../packages/adapters/src/runtime/server.js';
import { PostgresRuntimeStore } from '../../packages/adapters/src/runtime/postgres-runtime-store.js';

const toJson = (value: unknown): string => JSON.stringify(value, null, 2);
const pgBinDir = process.env.PG_BIN_DIR ?? '/usr/lib/postgresql/16/bin';
const initdbPath = `${pgBinDir}/initdb`;
const pgCtlPath = `${pgBinDir}/pg_ctl`;
const createdbPath = `${pgBinDir}/createdb`;
const pgIsReadyPath = `${pgBinDir}/pg_isready`;

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

const sleep = async (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const waitForPostgresReady = async (port: number): Promise<void> => {
  const tryReady = async (attempt: number): Promise<void> => {
    try {
      runPostgresCommand(pgIsReadyPath, ['-h', '127.0.0.1', '-p', `${port}`, '-U', 'postgres']);
      return undefined;
    } catch {
      if (attempt >= 59) {
        throw new Error(`PostgreSQL did not become ready on port ${port}`);
      }
      await sleep(500);
      return tryReady(attempt + 1);
    }
  };
  return tryReady(0);
};

const runPostgresCommand = (command: string, args: readonly string[]): void => {
  if (process.getuid?.() === 0) {
    execFileSync('runuser', ['-u', 'postgres', '--', command, ...args], { stdio: 'pipe', timeout: 20_000 });
    return;
  }

  execFileSync(command, args, { stdio: 'pipe', timeout: 20_000 });
};

test.describe('browser + real postgres runtime CUJ', () => {
  const databaseName = 'in_the_loop_e2e';
  const contextPromise = (async (): Promise<{
    readonly postgresDataDir: string;
    readonly server: Awaited<ReturnType<typeof createServer>>;
    readonly postgresPort: number;
    readonly appPort: number;
  }> => {
    const postgresPort = await getAvailablePort();
    const appPort = await getAvailablePort();
    const connectionString = `postgres://postgres@127.0.0.1:${postgresPort}/${databaseName}`;

    const postgresDataDir = process.getuid?.() === 0
      ? execFileSync('runuser', ['-u', 'postgres', '--', 'mktemp', '-d', '/tmp/itl-pg-data-XXXXXX'], { encoding: 'utf8' }).trim()
      : mkdtempSync(join(tmpdir(), 'itl-pg-data-'));

    runPostgresCommand(initdbPath, [
      '-D', postgresDataDir,
      '--auth-local', 'trust',
      '--auth-host', 'trust',
      '-U', 'postgres'
    ]);

    runPostgresCommand(pgCtlPath, [
      '-D', postgresDataDir,
      '-l', `${postgresDataDir}/postgres.log`,
      '-o', `-p ${postgresPort}`,
      'start'
    ]);

    await waitForPostgresReady(postgresPort);

    runPostgresCommand(createdbPath, [
      '-w',
      '-h', '127.0.0.1',
      '-p', `${postgresPort}`,
      '-U', 'postgres',
      databaseName
    ]);

    const server = await createServer({
      store: new PostgresRuntimeStore(connectionString)
    });

    await server.listen({
      host: '127.0.0.1',
      port: appPort
    });

    return {
      postgresDataDir,
      server,
      postgresPort,
      appPort
    };
  })();

  test.beforeAll(async () => {
    await contextPromise;
  });

  test.afterAll(async () => {
    const { server, postgresDataDir } = await contextPromise;
    await server.close();
    runPostgresCommand(pgCtlPath, [
      '-D', postgresDataDir,
      '-m', 'immediate',
      'stop'
    ]);
    rmSync(postgresDataDir, { recursive: true, force: true });
  });

  test('admin upload + employee prompt from real UI', async ({ page }) => {
    const { appPort } = await contextPromise;
    await page.goto(`http://127.0.0.1:${appPort}/ui`);

    await page.fill(
      '#questionsJson',
      toJson([
        {
          id: 'q-browser-1',
          created_at: '2026-03-23T00:00:00.000Z',
          text: 'How is your workload?',
          category: 'wellbeing',
          tags: ['daily'],
          options: ['1', '2', '3', '4', '5'],
          points: 10,
          allow_comments: true,
          schedule: { type: 'queue' },
          target: { type: 'whole_company' }
        }
      ])
    );
    await page.click('#saveQuestions');
    await expect(page.locator('#adminResult')).toContainText('"statusCode": 200');

    await page.fill('#timestampUtcIso', '2026-03-24T09:00:00.000Z');
    await page.fill('#timeZone', 'UTC');
    await page.fill('#managerEmail', 'lead@example.com');
    await page.fill('#managerAncestryEmails', '');
    await page.fill('#groupIds', '');
    await page.click('#loadPrompt');
    await expect(page.locator('#employeeResult')).toContainText('"statusCode": 200');
    await expect(page.locator('#employeeResult')).toContainText('"id": "q-browser-1"');
  });

  test('ui shows error for invalid authored payload', async ({ page }) => {
    const { appPort } = await contextPromise;
    await page.goto(`http://127.0.0.1:${appPort}/ui`);

    await page.fill(
      '#questionsJson',
      toJson([
        {
          id: 'q-invalid',
          created_at: '2026-03-23T00:00:00.000Z',
          text: 'Invalid question',
          category: 'engagement',
          tags: ['daily'],
          options: ['1'],
          points: 10,
          allow_comments: true,
          schedule: {
            type: 'recurring',
            start_date: '2026-03-24',
            end_date: '2026-03-20',
            rule: { kind: 'interval_days', interval_days: 0 }
          },
          target: { type: 'whole_company' }
        }
      ])
    );
    await page.click('#saveQuestions');
    await expect(page.locator('#adminResult')).toContainText('"statusCode": 400');
    await expect(page.locator('#adminResult')).toContainText('INVALID_DATE_RANGE');
  });
});
