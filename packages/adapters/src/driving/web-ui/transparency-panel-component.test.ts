import { describe, expect, it } from 'vitest';
import { renderTransparencyPanelComponent } from './transparency-panel-component.js';

describe('renderTransparencyPanelComponent', () => {
  it('renders transparency fields for packaging, assurance, version, source, and payload', () => {
    const html = renderTransparencyPanelComponent({
      outboundPayloadPreview: '{"question_id":"q-1"}',
      packagingStatus: 'PACKAGED_AND_ENCRYPTED',
      packagingStatusLabel: 'Payload packaged and encrypted before transport.',
      assuranceLevel: 'HIGH_ASSURANCE',
      reducedAssuranceDisclosure: null,
      serverVersion: {
        commitHash: 'a'.repeat(40),
        buildHash: 'sha256:abc123',
        expectedBuildHash: 'sha256:abc123',
        buildHashMatchesExpected: true,
        publishedArtifactHashes: {
          serverBinaryHash: 'sha256:binary123',
          policyHash: 'sha256:policy123',
          buildProvenanceHash: 'sha256:provenance123'
        },
        runtimeAttestationStatus: 'VERIFIED'
      },
      sourceRepositoryUrl: 'https://example.com/repo',
      reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
      attestationExplanation:
        'Runtime attestation verified: measured runtime matches published artifact policy.',
      attestationReportDownloadUrl: 'https://example.com/attestation/report.json',
      anonymityGuaranteeStatement:
        'Response unlinkability is computationally infeasible when trust assumptions hold.',
      trustAssumptions: ['a', 'b', 'c']
    });

    expect(html).toContain('data-component="transparency-panel"');
    expect(html).toContain('packaged and encrypted');
    expect(html).toContain('HIGH_ASSURANCE');
    expect(html).toContain('sha256:abc123');
    expect(html).toContain('https://example.com/repo');
    expect(html).toContain('expected-build-hash');
    expect(html).toContain('attestation-report-download');
    expect(html).toContain('anonymity-guarantee');
    expect(html).toContain('trust-assumptions');
    expect(html).toContain('outbound-payload-preview');
    expect(html).not.toContain('reduced-assurance-disclosure');
  });

  it('renders reduced assurance disclosure when present', () => {
    const html = renderTransparencyPanelComponent({
      outboundPayloadPreview: '{}',
      packagingStatus: 'NOT_PACKAGED',
      packagingStatusLabel: 'Payload not yet packaged for encrypted transport.',
      assuranceLevel: 'REDUCED_ASSURANCE',
      reducedAssuranceDisclosure: 'Runtime trust assurance reduced: HASH_MISMATCH.',
      serverVersion: {
        commitHash: 'a'.repeat(40),
        buildHash: 'sha256:abc123',
        expectedBuildHash: 'sha256:def456',
        buildHashMatchesExpected: false,
        publishedArtifactHashes: {
          serverBinaryHash: 'sha256:binary123',
          policyHash: 'sha256:policy123',
          buildProvenanceHash: 'sha256:provenance123'
        },
        runtimeAttestationStatus: 'FAILED'
      },
      sourceRepositoryUrl: 'https://example.com/repo',
      reproducibleBuildInstructionsUrl: 'https://example.com/repo/build.md',
      attestationExplanation: 'Runtime attestation failed.',
      attestationReportDownloadUrl: null,
      anonymityGuaranteeStatement:
        'Response unlinkability is computationally infeasible when trust assumptions hold.',
      trustAssumptions: ['a', 'b', 'c']
    });

    expect(html).toContain('REDUCED_ASSURANCE');
    expect(html).toContain('reduced-assurance-disclosure');
    expect(html).toContain('HASH_MISMATCH');
  });
});
