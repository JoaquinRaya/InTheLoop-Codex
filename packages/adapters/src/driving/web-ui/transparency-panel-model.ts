import { validateResponsePayload } from '../../../../core/src/application/validate-response-payload.js';
import {
  buildVersionEndpointResponse,
  type VersionEndpointInput,
  type VersionEndpointResponse
} from '../rest-api/version-endpoint.js';

export type PackagingStatus = 'PACKAGED_AND_ENCRYPTED' | 'NOT_PACKAGED';

export type TransparencyPanelModel = Readonly<{
  readonly outboundPayloadPreview: string;
  readonly packagingStatus: PackagingStatus;
  readonly packagingStatusLabel: string;
  readonly assuranceLevel: 'HIGH_ASSURANCE' | 'REDUCED_ASSURANCE';
  readonly reducedAssuranceDisclosure: string | null;
  readonly serverVersion: Readonly<{
    readonly commitHash: string;
    readonly buildHash: string;
    readonly runtimeAttestationStatus: VersionEndpointResponse['runtimeAttestationStatus'];
  }>;
  readonly sourceRepositoryUrl: string;
}>;

const toPackagingStatusLabel = (packagingStatus: PackagingStatus): string =>
  packagingStatus === 'PACKAGED_AND_ENCRYPTED'
    ? 'Payload packaged and encrypted before transport.'
    : 'Payload not yet packaged for encrypted transport.';

export const createTransparencyPanelModel = (
  payload: Readonly<Partial<Record<string, string | number>>>,
  versionInput: VersionEndpointInput,
  packagingStatus: PackagingStatus
): TransparencyPanelModel => {
  const payloadValidation = validateResponsePayload(payload);

  const outboundPayloadPreview =
    payloadValidation._tag === 'Left'
      ? 'Payload rejected by trust policy.'
      : JSON.stringify(payload, null, 2);

  const versionResponse = buildVersionEndpointResponse(versionInput);

  return {
    outboundPayloadPreview,
    packagingStatus,
    packagingStatusLabel: toPackagingStatusLabel(packagingStatus),
    assuranceLevel: versionResponse.assuranceLevel,
    reducedAssuranceDisclosure: versionResponse.reducedAssuranceDisclosure,
    serverVersion: {
      commitHash: versionResponse.commitHash,
      buildHash: versionResponse.buildHash,
      runtimeAttestationStatus: versionResponse.runtimeAttestationStatus
    },
    sourceRepositoryUrl: versionResponse.sourceRepositoryUrl
  };
};
