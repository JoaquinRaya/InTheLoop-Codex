import { describe, expect, it } from 'vitest';
import { createTransparencyPanelModel } from './transparency-panel-model.js';

describe('createTransparencyPanelModel', () => {
  it('returns payload composition and trust banner content for employees', () => {
    const model = createTransparencyPanelModel({
      question_id: 'q-1',
      normalized_score: 72,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22'
    }, {
      commitHash: 'a'.repeat(40),
      buildHash: 'sha256:abc123',
      expectedBuildHash: 'sha256:abc123',
      buildTime: '2026-03-22T00:00:00.000Z',
      configSchemaVersion: 'v1',
      sourceRepositoryUrl: 'https://example.com/repo',
      reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
      runtimeAttestationStatus: 'VERIFIED'
    });

    expect(model.outboundPayloadPreview).toContain('question_id');
    expect(model.assuranceLevel).toBe('HIGH_ASSURANCE');
    expect(model.reducedAssuranceDisclosure).toBe(null);
  });
});
