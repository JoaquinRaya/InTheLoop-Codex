import { validateResponsePayload } from '../../../../core/src/application/validate-response-payload.js';
import { buildVersionEndpointResponse, type VersionEndpointInput } from '../rest-api/version-endpoint.js';

export type TransparencyPanelModel = Readonly<{
  readonly outboundPayloadPreview: string;
  readonly assuranceLevel: 'HIGH_ASSURANCE' | 'REDUCED_ASSURANCE';
  readonly reducedAssuranceDisclosure: string | null;
  readonly sourceRepositoryUrl: string;
}>;

export const createTransparencyPanelModel = (
  payload: Readonly<Partial<Record<string, string | number>>>,
  versionInput: VersionEndpointInput
): TransparencyPanelModel => {
  const payloadValidation = validateResponsePayload(payload);

  const outboundPayloadPreview =
    payloadValidation._tag === 'Left'
      ? 'Payload rejected by trust policy.'
      : JSON.stringify(payload, null, 2);

  const versionResponse = buildVersionEndpointResponse(versionInput);

  return {
    outboundPayloadPreview,
    assuranceLevel: versionResponse.assuranceLevel,
    reducedAssuranceDisclosure: versionResponse.reducedAssuranceDisclosure,
    sourceRepositoryUrl: versionResponse.sourceRepositoryUrl
  };
};
