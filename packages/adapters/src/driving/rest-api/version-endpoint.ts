import {
  determineTrustAssurance,
  type RuntimeAttestationStatus,
  type RuntimeVerificationSignals
} from '../../../../core/src/domain/trust-assurance.js';

export type VersionEndpointInput = Readonly<{
  readonly commitHash: string;
  readonly buildHash: string;
  readonly expectedBuildHash: string;
  readonly buildTime: string;
  readonly configSchemaVersion: string;
  readonly sourceRepositoryUrl: string;
  readonly reproducibleBuildInstructionsUrl: string;
  readonly runtimeAttestationStatus: RuntimeAttestationStatus;
}>;

export type VersionEndpointResponse = Readonly<{
  readonly commitHash: string;
  readonly buildHash: string;
  readonly buildTime: string;
  readonly configSchemaVersion: string;
  readonly sourceRepositoryUrl: string;
  readonly reproducibleBuildInstructionsUrl: string;
  readonly runtimeAttestationStatus: RuntimeAttestationStatus;
  readonly assuranceLevel: 'HIGH_ASSURANCE' | 'REDUCED_ASSURANCE';
  readonly reducedAssuranceDisclosure: string | null;
}>;

const createReducedAssuranceDisclosure = (
  reason: Exclude<ReturnType<typeof determineTrustAssurance>['disclosureReason'], 'NONE'>
): string => `Runtime trust assurance reduced: ${reason}.`;

const toRuntimeSignals = (input: VersionEndpointInput): RuntimeVerificationSignals => ({
  buildProvenance: {
    commitHash: input.commitHash,
    buildHash: input.buildHash,
    buildTime: input.buildTime,
    configSchemaVersion: input.configSchemaVersion,
    sourceRepositoryUrl: input.sourceRepositoryUrl,
    reproducibleBuildInstructionsUrl: input.reproducibleBuildInstructionsUrl
  },
  runtimeAttestationStatus: input.runtimeAttestationStatus,
  expectedBuildHash: input.expectedBuildHash
});

export const buildVersionEndpointResponse = (input: VersionEndpointInput): VersionEndpointResponse => {
  const summary = determineTrustAssurance(toRuntimeSignals(input));

  return {
    commitHash: input.commitHash,
    buildHash: input.buildHash,
    buildTime: input.buildTime,
    configSchemaVersion: input.configSchemaVersion,
    sourceRepositoryUrl: input.sourceRepositoryUrl,
    reproducibleBuildInstructionsUrl: input.reproducibleBuildInstructionsUrl,
    runtimeAttestationStatus: input.runtimeAttestationStatus,
    assuranceLevel: summary.assuranceLevel,
    reducedAssuranceDisclosure:
      summary.disclosureReason === 'NONE'
        ? null
        : createReducedAssuranceDisclosure(summary.disclosureReason)
  };
};
