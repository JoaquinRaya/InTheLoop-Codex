import { describe, expect, it } from 'vitest';
import { buildVersionEndpointResponse } from './version-endpoint.js';

describe('buildVersionEndpointResponse', () => {
  it('returns verified assurance state with no disclosure when metadata is valid', () => {
    const response = buildVersionEndpointResponse({
      commitHash: 'a'.repeat(40),
      buildHash: 'sha256:abc123',
      expectedBuildHash: 'sha256:abc123',
      buildTime: '2026-03-22T00:00:00.000Z',
      configSchemaVersion: 'v1',
      sourceRepositoryUrl: 'https://example.com/repo',
      reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
      runtimeAttestationStatus: 'VERIFIED'
    });

    expect(response.assuranceLevel).toBe('HIGH_ASSURANCE');
    expect(response.reducedAssuranceDisclosure).toBe(null);
  });

  it('returns a reduced assurance disclosure when attestation is unavailable', () => {
    const response = buildVersionEndpointResponse({
      commitHash: 'a'.repeat(40),
      buildHash: 'sha256:abc123',
      expectedBuildHash: 'sha256:abc123',
      buildTime: '2026-03-22T00:00:00.000Z',
      configSchemaVersion: 'v1',
      sourceRepositoryUrl: 'https://example.com/repo',
      reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
      runtimeAttestationStatus: 'UNAVAILABLE'
    });

    expect(response.assuranceLevel).toBe('REDUCED_ASSURANCE');
    expect(response.reducedAssuranceDisclosure).toContain('ATTESTATION_UNAVAILABLE');
  });
});
