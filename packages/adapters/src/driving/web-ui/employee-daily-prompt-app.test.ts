import { describe, expect, it } from 'vitest';
import {
  createInMemoryEmployeePromptStateStore,
  handleEmployeePromptAction,
  noText,
  runEmployeePromptLoginFlow,
  someText
} from './employee-daily-prompt-app.js';

const question = {
  id: 'q-1',
  text: 'How was your day?',
  options: [
    { id: 'o-1', label: 'Great', normalizedScore: 90 },
    { id: 'o-2', label: 'Okay', normalizedScore: 50 }
  ],
  commentEnabled: true
} as const;

const profile = {
  managerEmail: 'mgr@example.com',
  role: 'engineer',
  level: 'l4'
} as const;

const versionInput = {
  commitHash: 'a'.repeat(40),
  buildHash: 'sha256:abc123',
  expectedBuildHash: 'sha256:abc123',
  buildTime: '2026-03-22T00:00:00.000Z',
  configSchemaVersion: 'v1',
  sourceRepositoryUrl: 'https://example.com/repo',
  reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
  runtimeAttestationStatus: 'VERIFIED'
} as const;

describe('employee daily prompt app wiring', () => {
  it('shows prompt component on login and persists cached profile', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();

    const result = runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    expect(result.decision.shouldShowPrompt).toBe(true);
    expect(result.promptComponentHtml).toContain('data-component="employee-daily-prompt"');
    expect(result.decision.nextState.cachedProfile._tag).toBe('Some');
  });

  it('blocks second prompt on same day after skip finalization', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();

    runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    handleEmployeePromptAction({
      localDay: '2026-03-22',
      action: 'skipped',
      question,
      selectedOptionId: noText(),
      comment: noText(),
      versionInput,
      stateStore,
      packagingPipelineSignal: null
    });

    const secondLogin = runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    expect(secondLogin.decision.shouldShowPrompt).toBe(false);
    expect(secondLogin.promptComponentHtml).toBe(null);
  });

  it('packages answered submissions and renders transparency UI fields', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    const actionResult = handleEmployeePromptAction({
      localDay: '2026-03-22',
      action: 'answered',
      question,
      selectedOptionId: someText('o-1'),
      comment: someText('Everything went well'),
      versionInput,
      stateStore,
      packagingPipelineSignal: 'ENCRYPTED_TRANSPORT_READY'
    });

    expect(actionResult.packagingStatus).toBe('PACKAGED_AND_ENCRYPTED');
    expect(actionResult.responseValidationError).toBe(null);
    expect(actionResult.transparencyPanelHtml).toContain('data-component="transparency-panel"');
    expect(actionResult.transparencyPanelHtml).toContain('packaged and encrypted');
    expect(actionResult.nextState.lastAnsweredDay._tag).toBe('Some');
  });


  it('maps explicit failed packaging pipeline signal to NOT_PACKAGED', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    const actionResult = handleEmployeePromptAction({
      localDay: '2026-03-22',
      action: 'answered',
      question,
      selectedOptionId: someText('o-1'),
      comment: noText(),
      versionInput,
      stateStore,
      packagingPipelineSignal: 'FAILED'
    });

    expect(actionResult.packagingStatus).toBe('NOT_PACKAGED');
  });

  it('rejects answered action without selected option and keeps day unfinalized', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    runEmployeePromptLoginFlow('2026-03-22', profile, question, stateStore);

    const actionResult = handleEmployeePromptAction({
      localDay: '2026-03-22',
      action: 'answered',
      question,
      selectedOptionId: noText(),
      comment: noText(),
      versionInput,
      stateStore,
      packagingPipelineSignal: null
    });

    expect(actionResult.packagingStatus).toBe('NOT_PACKAGED');
    expect(actionResult.responseValidationError).toContain('single option');
    expect(actionResult.nextState.lastAnsweredDay._tag).toBe('None');
  });
});
