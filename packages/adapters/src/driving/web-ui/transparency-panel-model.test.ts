import { describe, expect, it } from 'vitest';
import { createTransparencyPanelModel } from './transparency-panel-model.js';

describe('createTransparencyPanelModel', () => {
  it('returns payload composition, packaging state, and trust banner content for employees', () => {
    const model = createTransparencyPanelModel(
      {
        question_id: 'q-1',
        normalized_score: 72,
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      {
        commitHash: 'a'.repeat(40),
        buildHash: 'sha256:abc123',
        expectedBuildHash: 'sha256:abc123',
        buildTime: '2026-03-22T00:00:00.000Z',
        configSchemaVersion: 'v1',
        sourceRepositoryUrl: 'https://example.com/repo',
        reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
        runtimeAttestationStatus: 'VERIFIED'
      },
      'PACKAGED_AND_ENCRYPTED'
    );

    expect(model.outboundPayloadPreview).toContain('question_id');
    expect(model.packagingStatus).toBe('PACKAGED_AND_ENCRYPTED');
    expect(model.packagingStatusLabel).toContain('encrypted');
    expect(model.assuranceLevel).toBe('HIGH_ASSURANCE');
    expect(model.reducedAssuranceDisclosure).toBe(null);
    expect(model.serverVersion).toEqual({
      commitHash: 'a'.repeat(40),
      buildHash: 'sha256:abc123',
      runtimeAttestationStatus: 'VERIFIED'
    });
    expect(model.sourceRepositoryUrl).toBe('https://example.com/repo');
  });

  it('shows rejected payload preview text when trust policy validation fails', () => {
    const model = createTransparencyPanelModel(
      {
        question_id: 'q-1'
      },
      {
        commitHash: 'a'.repeat(40),
        buildHash: 'sha256:abc123',
        expectedBuildHash: 'sha256:abc123',
        buildTime: '2026-03-22T00:00:00.000Z',
        configSchemaVersion: 'v1',
        sourceRepositoryUrl: 'https://example.com/repo',
        reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
        runtimeAttestationStatus: 'VERIFIED'
      },
      'NOT_PACKAGED'
    );

    expect(model.outboundPayloadPreview).toBe('Payload rejected by trust policy.');
    expect(model.packagingStatusLabel).toContain('not yet packaged');
  });
});
