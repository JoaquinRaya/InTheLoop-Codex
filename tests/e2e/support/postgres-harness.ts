import { execFileSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';

const postgresImage = process.env.E2E_POSTGRES_IMAGE ?? 'postgres:16';
const postgresBootTimeoutMs = Number.parseInt(process.env.E2E_POSTGRES_BOOT_TIMEOUT_MS ?? '120000', 10);

const sleep = async (durationMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, durationMs));

const randomSuffix = (): string => `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;

const runDocker = (args: readonly string[]): string =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: 'pipe'
  }).trim();

export const getAvailablePort = async (): Promise<number> =>
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

const waitForContainerReady = async (containerName: string): Promise<void> => {
  const startedAtMs = Date.now();

  while (Date.now() - startedAtMs < postgresBootTimeoutMs) {
    try {
      runDocker(['exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres']);
      return;
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`PostgreSQL container ${containerName} did not become ready before timeout.`);
};

const createDatabaseWithRetry = async (
  containerName: string,
  databaseName: string
): Promise<void> => {
  const startedAtMs = Date.now();

  while (Date.now() - startedAtMs < postgresBootTimeoutMs) {
    try {
      runDocker([
        'exec',
        containerName,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-v',
        'ON_ERROR_STOP=1',
        '-c',
        `CREATE DATABASE ${databaseName};`
      ]);
      return;
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`Failed to create database ${databaseName} before timeout.`);
};

type StartedPostgresContainer = Readonly<{
  readonly connectionString: string;
  readonly containerName: string;
  readonly databaseName: string;
  readonly hostPort: number;
  readonly stop: () => Promise<void>;
}>;

export const startPostgresContainer = async (): Promise<StartedPostgresContainer> => {
  try {
    runDocker(['version', '--format', '{{.Server.Version}}']);
  } catch (error) {
    throw new Error(
      `Docker is required for e2e real-Postgres tests. Ensure Docker Desktop/Engine is running. ${String(error)}`
    );
  }

  const hostPort = await getAvailablePort();
  const containerName = `itl-e2e-pg-${process.pid}-${randomSuffix()}`;
  const databaseName = `itl_e2e_${Date.now()}_${Math.floor(Math.random() * 10_000)}`;

  runDocker([
    'run',
    '--rm',
    '--detach',
    '--name',
    containerName,
    '--publish',
    `${hostPort}:5432`,
    '--env',
    'POSTGRES_USER=postgres',
    '--env',
    'POSTGRES_PASSWORD=postgres',
    '--env',
    'POSTGRES_DB=postgres',
    postgresImage
  ]);

  try {
    await waitForContainerReady(containerName);
    await createDatabaseWithRetry(containerName, databaseName);
  } catch (error) {
    try {
      runDocker(['rm', '-f', containerName]);
    } catch {
      // Ignore cleanup failure; original error is more relevant.
    }
    throw error;
  }

  return {
    connectionString: `postgres://postgres:postgres@127.0.0.1:${hostPort}/${databaseName}`,
    containerName,
    databaseName,
    hostPort,
    stop: async (): Promise<void> => {
      try {
        runDocker(['rm', '-f', containerName]);
      } catch {
        // Container can already be removed; keep teardown idempotent.
      }
    }
  };
};
