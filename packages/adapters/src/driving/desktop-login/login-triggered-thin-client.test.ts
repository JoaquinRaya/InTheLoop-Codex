import { describe, expect, it } from 'vitest';
import { createInMemoryEmployeePromptStateStore, someText } from '../web-ui/employee-daily-prompt-app.js';
import { runLoginTriggeredThinClient } from './login-triggered-thin-client.js';

const profile = {
  managerEmail: 'mgr@example.com',
  role: 'engineer',
  level: 'l4'
} as const;

const question = {
  id: 'q-1',
  text: 'How was your day?',
  options: [
    { id: 'o-1', label: 'Great', normalizedScore: 90 },
    { id: 'o-2', label: 'Okay', normalizedScore: 50 }
  ],
  commentEnabled: true
} as const;

const versionInput = {
  commitHash: 'a'.repeat(40),
  buildHash: 'sha256:abc123',
  expectedBuildHash: 'sha256:abc123',
  buildTime: '2026-03-23T00:00:00.000Z',
  configSchemaVersion: 'v1',
  sourceRepositoryUrl: 'https://example.com/repo',
  reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
  runtimeAttestationStatus: 'VERIFIED',
  publishedArtifactHashes: {
    serverBinaryHash: 'sha256:binary123',
    policyHash: 'sha256:policy123',
    buildProvenanceHash: 'sha256:provenance123'
  }
} as const;

describe('login-triggered thin client', () => {
  it('fetches once and exits immediately when no prompt is available', async () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    let fetchCount = 0;
    let presented = false;
    let submitted = false;

    const result = await runLoginTriggeredThinClient({
      profile,
      stateStore,
      fetchPrompt: async () => {
        fetchCount += 1;
        return { status: 'NO_PROMPT_AVAILABLE' };
      },
      presentPrompt: async () => {
        presented = true;
        return { action: 'skipped' };
      },
      submitPromptOutcome: async () => {
        submitted = true;
        return { status: 'SUBMITTED' };
      }
    });

    expect(result.status).toBe('EXITED_NO_PROMPT');
    expect(fetchCount).toBe(1);
    expect(presented).toBe(false);
    expect(submitted).toBe(false);
  });

  it('renders prompt once and submits answered action before exiting', async () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    let fetchCount = 0;
    let submitCount = 0;

    const result = await runLoginTriggeredThinClient({
      profile,
      stateStore,
      fetchPrompt: async () => {
        fetchCount += 1;
        return {
          status: 'PROMPT_AVAILABLE',
          localDay: '2026-03-23',
          question,
          versionInput,
          packagingPipelineSignal: 'ENCRYPTED_TRANSPORT_READY',
          anonymousSubmissionTransport: null
        };
      },
      presentPrompt: async (input) => {
        expect(input.promptHtml).toContain('data-component="employee-daily-prompt"');
        return {
          action: 'answered',
          selectedOptionId: someText('o-1'),
          comment: someText('Smooth day')
        };
      },
      submitPromptOutcome: async (input) => {
        submitCount += 1;
        expect(input.userAction.action).toBe('answered');
        expect(input.promptActionResult.transparencyPanelHtml).toContain(
          'data-component="transparency-panel"'
        );
        return { status: 'SUBMITTED' };
      }
    });

    expect(fetchCount).toBe(1);
    expect(submitCount).toBe(1);
    expect(result).toEqual({
      status: 'EXITED_AFTER_SUBMISSION',
      packagingStatus: 'PACKAGED_AND_ENCRYPTED'
    });
  });

  it('exits with validation failure if answered action has no selected option', async () => {
    const stateStore = createInMemoryEmployeePromptStateStore();
    let submitCount = 0;

    const result = await runLoginTriggeredThinClient({
      profile,
      stateStore,
      fetchPrompt: async () => ({
        status: 'PROMPT_AVAILABLE',
        localDay: '2026-03-23',
        question,
        versionInput,
        packagingPipelineSignal: null,
        anonymousSubmissionTransport: null
      }),
      presentPrompt: async () => ({
        action: 'answered',
        selectedOptionId: { _tag: 'None' },
        comment: { _tag: 'None' }
      }),
      submitPromptOutcome: async () => {
        submitCount += 1;
        return { status: 'SUBMITTED' };
      }
    });

    expect(result.status).toBe('EXITED_VALIDATION_FAILED');
    if (result.status === 'EXITED_VALIDATION_FAILED') {
      expect(result.message).toContain('single option');
    }
    expect(submitCount).toBe(0);
  });

  it('exits with submission failure when transport submission fails', async () => {
    const stateStore = createInMemoryEmployeePromptStateStore();

    const result = await runLoginTriggeredThinClient({
      profile,
      stateStore,
      fetchPrompt: async () => ({
        status: 'PROMPT_AVAILABLE',
        localDay: '2026-03-23',
        question,
        versionInput,
        packagingPipelineSignal: 'UNAVAILABLE',
        anonymousSubmissionTransport: null
      }),
      presentPrompt: async () => ({
        action: 'skipped'
      }),
      submitPromptOutcome: async () => ({
        status: 'SUBMISSION_FAILED',
        message: 'network error'
      })
    });

    expect(result).toEqual({
      status: 'EXITED_SUBMISSION_FAILED',
      message: 'network error'
    });
  });
});
