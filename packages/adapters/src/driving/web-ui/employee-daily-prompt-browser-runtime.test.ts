import { describe, expect, it } from 'vitest';
import { createInMemoryEmployeePromptStateStore } from './employee-daily-prompt-app.js';
import { runPromptOnEmployeeSignIn, skipPromptInBrowserRuntime } from './employee-daily-prompt-browser-runtime.js';

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
  runtimeAttestationStatus: 'VERIFIED',
  publishedArtifactHashes: {
    serverBinaryHash: 'sha256:binary123',
    policyHash: 'sha256:policy123',
    buildProvenanceHash: 'sha256:provenance123'
  }
} as const;

describe('employee daily prompt browser runtime', () => {
  it('does not render prompt when sign-in is not on company computer', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();

    const result = runPromptOnEmployeeSignIn({
      isCompanyComputer: false,
      localDay: '2026-03-22',
      profile,
      question,
      stateStore
    });

    expect(result.reason).toBe('NOT_COMPANY_COMPUTER');
    expect(result.promptHtml).toBe(null);
  });

  it('renders prompt and can process skip action in browser runtime helpers', () => {
    const stateStore = createInMemoryEmployeePromptStateStore();

    const signIn = runPromptOnEmployeeSignIn({
      isCompanyComputer: true,
      localDay: '2026-03-22',
      profile,
      question,
      stateStore
    });

    expect(signIn.reason).toBe('PROMPT_RENDERED');
    expect(signIn.promptHtml).toContain('employee-daily-prompt');

    const skipped = skipPromptInBrowserRuntime({
      localDay: '2026-03-22',
      question,
      versionInput,
      stateStore,
      packagingPipelineSignal: 'UNAVAILABLE',
      anonymousSubmissionTransport: null
    });

    expect(skipped.packagingStatus).toBe('NOT_PACKAGED');
    expect(skipped.nextState.lastAnsweredDay._tag).toBe('Some');
  });
});
