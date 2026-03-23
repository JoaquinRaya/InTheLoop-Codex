import { test, expect } from '@playwright/test';
import { createServer } from '../../packages/adapters/src/runtime/server.js';
import { createInMemoryRuntimeStore } from '../../packages/adapters/src/runtime/in-memory-runtime-store.js';

test.describe('runtime CUJs', () => {
  let server: Awaited<ReturnType<typeof createServer>>;

  test.beforeAll(async () => {
    server = await createServer({
      store: createInMemoryRuntimeStore()
    });

    await server.listen({
      host: '127.0.0.1',
      port: 4173
    });
  });

  test.afterAll(async () => {
    await server.close();
  });

  test('CUJ: admin authors questions then employee receives first prompt', async ({ request }) => {
    const upsert = await request.post('/admin/questions', {
      data: {
        tenantId: 'tenant-a',
        questions: [
          {
            id: 'q-queue-1',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'How was your day?',
            category: 'engagement',
            tags: ['daily'],
            options: ['1', '2', '3', '4', '5'],
            points: 10,
            allow_comments: true,
            schedule: { type: 'queue' },
            target: { type: 'whole_company' }
          }
        ]
      }
    });

    expect(upsert.ok()).toBeTruthy();
    await expect(upsert.json()).resolves.toEqual({
      status: 'ok',
      count: 1
    });

    const prompt = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-a',
        timestampUtcIso: '2026-03-24T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: ['vp@example.com'],
          groupIds: ['grp-a']
        }
      }
    });

    expect(prompt.ok()).toBeTruthy();
    const promptBody = await prompt.json();

    expect(promptBody.status).toBe('ok');
    expect(promptBody.question.id).toBe('q-queue-1');
    expect(promptBody.localDate).toBe('2026-03-24');
    expect(promptBody.stateVersion).toBe(1);
  });

  test('CUJ: queue advances and eventually returns no question', async ({ request }) => {
    const upsert = await request.post('/admin/questions', {
      data: {
        tenantId: 'tenant-queue',
        questions: [
          {
            id: 'q-queue-a',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'Question A',
            category: 'engagement',
            tags: ['daily'],
            options: ['1', '2'],
            points: 10,
            allow_comments: true,
            schedule: { type: 'queue' },
            target: { type: 'whole_company' }
          },
          {
            id: 'q-queue-b',
            created_at: '2026-03-22T00:00:00.000Z',
            text: 'Question B',
            category: 'engagement',
            tags: ['daily'],
            options: ['1', '2'],
            points: 10,
            allow_comments: true,
            schedule: { type: 'queue' },
            target: { type: 'whole_company' }
          }
        ]
      }
    });
    expect(upsert.ok()).toBeTruthy();

    const first = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-queue',
        timestampUtcIso: '2026-03-24T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: [],
          groupIds: []
        }
      }
    });
    const firstBody = await first.json();
    expect(firstBody.question.id).toBe('q-queue-a');

    const second = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-queue',
        timestampUtcIso: '2026-03-25T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: [],
          groupIds: []
        }
      }
    });
    const secondBody = await second.json();
    expect(secondBody.question.id).toBe('q-queue-b');

    const third = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-queue',
        timestampUtcIso: '2026-03-26T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: [],
          groupIds: []
        }
      }
    });
    const thirdBody = await third.json();
    expect(thirdBody.question).toBeNull();
  });

  test('CUJ: manager subtree targeting limits who gets the question', async ({ request }) => {
    const upsert = await request.post('/admin/questions', {
      data: {
        tenantId: 'tenant-target',
        questions: [
          {
            id: 'q-targeted',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'Targeted question',
            category: 'execution',
            tags: ['mgr'],
            options: ['1', '2'],
            points: 10,
            allow_comments: true,
            schedule: { type: 'queue' },
            target: { type: 'manager_subtree', manager_email: 'vp@example.com' }
          }
        ]
      }
    });
    expect(upsert.ok()).toBeTruthy();

    const matching = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-target',
        timestampUtcIso: '2026-03-24T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: ['vp@example.com'],
          groupIds: []
        }
      }
    });
    const matchingBody = await matching.json();
    expect(matchingBody.question.id).toBe('q-targeted');

    const nonMatching = await request.post('/employee/prompt', {
      data: {
        tenantId: 'tenant-target',
        timestampUtcIso: '2026-03-24T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: ['cto@example.com'],
          groupIds: []
        }
      }
    });
    const nonMatchingBody = await nonMatching.json();
    expect(nonMatchingBody.question).toBeNull();
  });

  test('CUJ: admin preview resolves expected question for profile+date', async ({ request }) => {
    await request.post('/admin/questions', {
      data: {
        tenantId: 'tenant-preview',
        questions: [
          {
            id: 'q-preview',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'Preview question',
            category: 'execution',
            tags: ['preview'],
            options: ['1', '2'],
            points: 10,
            allow_comments: true,
            schedule: { type: 'specific_date', date: '2026-03-25' },
            target: { type: 'group', group_id: 'grp-1' }
          }
        ]
      }
    });

    const preview = await request.post('/admin/preview', {
      data: {
        tenantId: 'tenant-preview',
        timestampUtcIso: '2026-03-25T09:00:00.000Z',
        timeZone: 'UTC',
        profile: {
          managerEmail: 'lead@example.com',
          managerAncestryEmails: [],
          groupIds: ['grp-1']
        }
      }
    });

    expect(preview.ok()).toBeTruthy();
    const previewBody = await preview.json();
    expect(previewBody.question.id).toBe('q-preview');
  });

  test('CUJ: invalid authoring payload is rejected', async ({ request }) => {
    const upsert = await request.post('/admin/questions', {
      data: {
        tenantId: 'tenant-invalid',
        questions: [
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
              start_date: '2026-03-25',
              end_date: '2026-03-20',
              rule: { kind: 'interval_days', interval_days: 0 }
            },
            target: { type: 'whole_company' }
          }
        ]
      }
    });

    expect(upsert.status()).toBe(400);
    const errorBody = await upsert.json();
    expect(errorBody.status).toBe('error');
    expect(errorBody.message).toContain('INVALID_DATE_RANGE');
    expect(errorBody.message).toContain('INVALID_INTERVAL_DAYS');
  });
});
