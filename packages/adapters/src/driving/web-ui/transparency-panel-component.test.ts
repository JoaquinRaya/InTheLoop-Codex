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
        runtimeAttestationStatus: 'VERIFIED'
      },
      sourceRepositoryUrl: 'https://example.com/repo'
    });

    expect(html).toContain('data-component="transparency-panel"');
    expect(html).toContain('packaged and encrypted');
    expect(html).toContain('HIGH_ASSURANCE');
    expect(html).toContain('sha256:abc123');
    expect(html).toContain('https://example.com/repo');
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
        runtimeAttestationStatus: 'FAILED'
      },
      sourceRepositoryUrl: 'https://example.com/repo'
    });

    expect(html).toContain('REDUCED_ASSURANCE');
    expect(html).toContain('reduced-assurance-disclosure');
    expect(html).toContain('HASH_MISMATCH');
  });
});
