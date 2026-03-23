import { test, expect } from '@playwright/test';
import { createServer } from '../../packages/adapters/src/runtime/server.js';
import { PostgresRuntimeStore } from '../../packages/adapters/src/runtime/postgres-runtime-store.js';
import { getAvailablePort, startPostgresContainer } from './support/postgres-harness.js';

test.describe('browser UI flows with real postgres runtime', () => {
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
  });

  test.afterAll(async () => {
    const context = await contextPromise;
    await context.server.close();
    await context.postgres.stop();
  });

  test('admin UI supports question CRUD, schedule inspection, and preview', async ({ page }) => {
    const { appPort } = await contextPromise;
    await page.goto(`http://127.0.0.1:${appPort}/ui`);

    await page.fill('#tenantId', 'tenant-admin-ui');
    await page.click('#add-question');
    await page.fill('#form-text', 'Do you feel clear on priorities?');
    await page.fill('#form-category', 'alignment');
    await page.fill('#tag-input', 'weekly');
    await page.click('#tag-add');
    await page.fill('#tag-input', 'planning');
    await page.click('#tag-add');
    await page.fill('#option-text-input', 'Very low clarity');
    await page.fill('#option-points-input', '10');
    await page.click('#option-add');
    await page.fill('#option-text-input', 'Moderate clarity');
    await page.fill('#option-points-input', '60');
    await page.click('#option-add');
    await page.fill('#option-text-input', 'Very high clarity');
    await page.fill('#option-points-input', '100');
    await page.click('#option-add');
    await page.click('#save-question');

    await expect(page.locator('#questions-status')).toContainText('Loaded');
    await expect(page.locator('#questions-body')).toContainText('Do you feel clear on priorities?');

    await page.fill('#question-search', 'priorities');
    await expect(page.locator('#questions-body')).toContainText('alignment');

    await page.selectOption('#question-sort', 'text_asc');
    await expect(page.locator('#questions-body')).toContainText('alignment');

    const deleteButton = page.locator('button[data-delete-id]').first();
    const createdQuestionId = await deleteButton.getAttribute('data-delete-id');
    expect(createdQuestionId).toBeTruthy();

    await page.click(`button[data-edit-id="${createdQuestionId}"]`);
    await page.fill('#form-text', 'Do you feel clear on priorities this week?');
    await page.click('#save-question');
    await expect(page.locator('#questions-body')).toContainText('this week?');

    await page.click('#nav-schedule');
    await page.fill('#schedule-start', '2026-03-24');
    await page.fill('#schedule-days', '3');
    await page.click('#run-schedule');
    await expect(page.locator('#schedule-results')).toContainText('Selected because');

    await page.click('#nav-preview');
    await page.fill('#preview-date', '2026-03-24T09:00:00.000Z');
    await page.click('#run-preview');
    await expect(page.locator('#preview-status')).toContainText('Preview ready');
    await expect(page.locator('#preview-render')).toContainText('this week?');
    await expect(page.locator('#preview-render')).toContainText('Very low clarity');

    await page.click('#nav-questions');
    await page.fill('#question-search', createdQuestionId ?? '');
    await page.click(`button[data-delete-id="${createdQuestionId}"]`);
    await expect(page.locator('#questions-body')).not.toContainText(createdQuestionId ?? '');
  });

  test('people dashboard shows question scores from real submissions', async ({ page, request }) => {
    const { appPort } = await contextPromise;
    const tenantId = 'tenant-dashboard-ui';

    const upsert = await request.post(`http://127.0.0.1:${appPort}/admin/questions`, {
      data: {
        tenantId,
        questions: [
          {
            id: 'q-score-1',
            created_at: '2026-03-23T00:00:00.000Z',
            text: 'How supported do you feel this week?',
            category: 'wellbeing',
            tags: ['weekly'],
            options: [
              { text: '1', points: 20 },
              { text: '2', points: 40 },
              { text: '3', points: 60 },
              { text: '4', points: 80 },
              { text: '5', points: 100 }
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

    const submitScore = async (score: number): Promise<void> => {
      const response = await request.post(`http://127.0.0.1:${appPort}/employee/score`, {
        data: {
          tenantId,
          payload: {
            question_id: 'q-score-1',
            normalized_score: score,
            optional_comment: 'sample',
            manager_email: 'lead@example.com',
            role: 'ic',
            level: 'l3',
            survey_day: '2026-03-24'
          }
        }
      });

      expect(response.ok()).toBeTruthy();
    };

    await submitScore(70);
    await submitScore(80);
    await submitScore(90);

    await page.goto(`http://127.0.0.1:${appPort}/dashboard`);
    await page.fill('#tenantId', tenantId);
    await page.click('#dashboardRefresh');

    await expect(page.locator('#metricResponses')).toContainText('3');
    await expect(page.locator('#metricAverage')).toContainText('80.0');
    await expect(page.locator('#dashboardStatus')).toContainText('q-score-1');
    await expect(page.locator('#bars')).toContainText('How supported do you feel this week?');
  });
});
