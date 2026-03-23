import type { TransparencyPanelModel } from './transparency-panel-model.js';

export const renderTransparencyPanelComponent = (model: TransparencyPanelModel): string => {
  const reducedAssuranceDisclosure =
    model.reducedAssuranceDisclosure === null
      ? ''
      : `<p data-field="reduced-assurance-disclosure">${model.reducedAssuranceDisclosure}</p>`;
  const attestationDownload =
    model.attestationReportDownloadUrl === null
      ? '<p data-field="attestation-report-download">No attestation report available for download.</p>'
      : `<a data-field="attestation-report-download" href="${model.attestationReportDownloadUrl}">Download attestation report</a>`;
  const trustAssumptions = model.trustAssumptions
    .map((assumption) => `<li data-field="trust-assumption-item">${assumption}</li>`)
    .join('');

  return `<section data-component="transparency-panel"><p data-field="packaging-status">${model.packagingStatusLabel}</p><p data-field="assurance-level">${model.assuranceLevel}</p>${reducedAssuranceDisclosure}<p data-field="server-commit-hash">${model.serverVersion.commitHash}</p><p data-field="server-build-hash">${model.serverVersion.buildHash}</p><p data-field="expected-build-hash">${model.serverVersion.expectedBuildHash}</p><p data-field="build-hash-match">${model.serverVersion.buildHashMatchesExpected ? 'MATCH' : 'MISMATCH'}</p><p data-field="runtime-attestation-status">${model.serverVersion.runtimeAttestationStatus}</p><p data-field="attestation-explanation">${model.attestationExplanation}</p>${attestationDownload}<p data-field="artifact-hash-server-binary">${model.serverVersion.publishedArtifactHashes.serverBinaryHash}</p><p data-field="artifact-hash-policy">${model.serverVersion.publishedArtifactHashes.policyHash}</p><p data-field="artifact-hash-build-provenance">${model.serverVersion.publishedArtifactHashes.buildProvenanceHash}</p><a href="${model.sourceRepositoryUrl}">Source repository</a><a href="${model.reproducibleBuildInstructionsUrl}">Reproducible build instructions</a><p data-field="anonymity-guarantee">${model.anonymityGuaranteeStatement}</p><ul data-field="trust-assumptions">${trustAssumptions}</ul><pre data-field="outbound-payload-preview">${model.outboundPayloadPreview}</pre></section>`;
};
