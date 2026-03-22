import { describe, expect, it } from 'vitest';
import {
  createUnlinkableSubmissionArtifacts,
  determineTrustAssurance,
  validateResponsePayload
} from './index.js';

describe('core package exports', () => {
  it('exports validateResponsePayload from index', () => {
    expect(typeof validateResponsePayload).toBe('function');
  });

  it('exports determineTrustAssurance from index', () => {
    expect(typeof determineTrustAssurance).toBe('function');
  });

  it('exports createUnlinkableSubmissionArtifacts from index', () => {
    expect(typeof createUnlinkableSubmissionArtifacts).toBe('function');
  });
});
