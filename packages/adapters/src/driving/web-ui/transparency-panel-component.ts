import type { TransparencyPanelModel } from './transparency-panel-model.js';

export const renderTransparencyPanelComponent = (model: TransparencyPanelModel): string => {
  const reducedAssuranceDisclosure =
    model.reducedAssuranceDisclosure === null
      ? ''
      : `<p data-field="reduced-assurance-disclosure">${model.reducedAssuranceDisclosure}</p>`;

  return `<section data-component="transparency-panel"><p data-field="packaging-status">${model.packagingStatusLabel}</p><p data-field="assurance-level">${model.assuranceLevel}</p>${reducedAssuranceDisclosure}<p data-field="server-commit-hash">${model.serverVersion.commitHash}</p><p data-field="server-build-hash">${model.serverVersion.buildHash}</p><p data-field="runtime-attestation-status">${model.serverVersion.runtimeAttestationStatus}</p><a href="${model.sourceRepositoryUrl}">Source repository</a><pre data-field="outbound-payload-preview">${model.outboundPayloadPreview}</pre></section>`;
};
