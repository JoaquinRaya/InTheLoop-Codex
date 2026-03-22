import { describe, expect, it } from 'vitest';
import {
  determineTrustAssurance,
  type RuntimeVerificationSignals,
  validateBuildProvenanceMetadata
} from './trust-assurance.js';

const completeSignals: RuntimeVerificationSignals = {
  buildProvenance: {
    commitHash: 'a'.repeat(40),
    buildHash: 'sha256:abcdef123456',
    buildTime: '2026-03-22T00:00:00.000Z',
    configSchemaVersion: 'v1.0.0',
    sourceRepositoryUrl: 'https://example.com/in-the-loop',
    reproducibleBuildInstructionsUrl: 'https://example.com/in-the-loop/docs/build.md'
  },
  runtimeAttestationStatus: 'VERIFIED',
  expectedBuildHash: 'sha256:abcdef123456'
};

describe('validateBuildProvenanceMetadata', () => {
  it('accepts complete provenance metadata', () => {
    const validation = validateBuildProvenanceMetadata(completeSignals.buildProvenance);

    expect(validation).toEqual({ isValid: true, missingFields: [] });
  });

  it('returns missing field names when provenance metadata is incomplete', () => {
    const validation = validateBuildProvenanceMetadata({
      commitHash: '',
      buildHash: '',
      buildTime: '',
      configSchemaVersion: '',
      sourceRepositoryUrl: '',
      reproducibleBuildInstructionsUrl: ''
    });

    expect(validation.isValid).toBe(false);
    expect(validation.missingFields).toEqual([
      'commitHash',
      'buildHash',
      'buildTime',
      'configSchemaVersion',
      'sourceRepositoryUrl',
      'reproducibleBuildInstructionsUrl'
    ]);
  });
});

describe('determineTrustAssurance', () => {
  it('returns high assurance only when attestation is verified and hashes match', () => {
    const summary = determineTrustAssurance(completeSignals);

    expect(summary.assuranceLevel).toBe('HIGH_ASSURANCE');
    expect(summary.shouldDisplayReducedAssuranceNotice).toBe(false);
    expect(summary.disclosureReason).toBe('NONE');
  });

  it('returns reduced assurance with a mismatch disclosure when hashes differ', () => {
    const summary = determineTrustAssurance({
      ...completeSignals,
      expectedBuildHash: 'sha256:different'
    });

    expect(summary.assuranceLevel).toBe('REDUCED_ASSURANCE');
    expect(summary.shouldDisplayReducedAssuranceNotice).toBe(true);
    expect(summary.disclosureReason).toBe('BUILD_HASH_MISMATCH');
  });


  it('returns reduced assurance when provenance metadata is incomplete', () => {
    const summary = determineTrustAssurance({
      ...completeSignals,
      buildProvenance: {
        ...completeSignals.buildProvenance,
        sourceRepositoryUrl: ''
      }
    });

    expect(summary.assuranceLevel).toBe('REDUCED_ASSURANCE');
    expect(summary.shouldDisplayReducedAssuranceNotice).toBe(true);
    expect(summary.disclosureReason).toBe('MISSING_BUILD_PROVENANCE');
  });

  it('returns reduced assurance when attestation fails', () => {
    const summary = determineTrustAssurance({
      ...completeSignals,
      runtimeAttestationStatus: 'FAILED'
    });

    expect(summary.assuranceLevel).toBe('REDUCED_ASSURANCE');
    expect(summary.shouldDisplayReducedAssuranceNotice).toBe(true);
    expect(summary.disclosureReason).toBe('ATTESTATION_FAILED');
  });

  it('returns reduced assurance when attestation is unavailable', () => {
    const summary = determineTrustAssurance({
      ...completeSignals,
      runtimeAttestationStatus: 'UNAVAILABLE'
    });

    expect(summary.assuranceLevel).toBe('REDUCED_ASSURANCE');
    expect(summary.shouldDisplayReducedAssuranceNotice).toBe(true);
    expect(summary.disclosureReason).toBe('ATTESTATION_UNAVAILABLE');
  });
});
