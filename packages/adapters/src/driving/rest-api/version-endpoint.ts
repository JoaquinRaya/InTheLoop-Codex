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
  readonly publishedArtifactHashes: Readonly<{
    readonly serverBinaryHash: string;
    readonly policyHash: string;
    readonly buildProvenanceHash: string;
  }>;
  readonly attestationReportDownloadUrl?: string;
}>;

export type VersionEndpointResponse = Readonly<{
  readonly commitHash: string;
  readonly buildHash: string;
  readonly buildTime: string;
  readonly configSchemaVersion: string;
  readonly sourceRepositoryUrl: string;
  readonly reproducibleBuildInstructionsUrl: string;
  readonly expectedBuildHash: string;
  readonly buildHashMatchesExpected: boolean;
  readonly publishedArtifactHashes: Readonly<{
    readonly serverBinaryHash: string;
    readonly policyHash: string;
    readonly buildProvenanceHash: string;
  }>;
  readonly runtimeAttestationStatus: RuntimeAttestationStatus;
  readonly attestationReport: Readonly<{
    readonly downloadUrl: string | null;
    readonly explanation: string;
  }>;
  readonly assuranceLevel: 'HIGH_ASSURANCE' | 'REDUCED_ASSURANCE';
  readonly reducedAssuranceDisclosure: string | null;
}>;

/**
 * createReducedAssuranceDisclosure.
 */
const createReducedAssuranceDisclosure = (
  reason: Exclude<ReturnType<typeof determineTrustAssurance>['disclosureReason'], 'NONE'>
): string => `Runtime trust assurance reduced: ${reason}.`;

/**
 * toRuntimeSignals.
 */
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

/**
 * toAttestationExplanation.
 */
const toAttestationExplanation = (status: RuntimeAttestationStatus): string => {
  if (status === 'VERIFIED') {
    return 'Runtime attestation verified: measured runtime matches published artifact policy.';
  }

  if (status === 'FAILED') {
    return 'Runtime attestation failed: measured runtime did not satisfy published artifact policy.';
  }

  return 'Runtime attestation is unavailable for this deployment; verify published artifact hashes manually.';
};

/**
 * buildVersionEndpointResponse.
 */
export const buildVersionEndpointResponse = (input: VersionEndpointInput): VersionEndpointResponse => {
  const summary = determineTrustAssurance(toRuntimeSignals(input));
  const buildHashMatchesExpected = input.buildHash === input.expectedBuildHash;

  return {
    commitHash: input.commitHash,
    buildHash: input.buildHash,
    buildTime: input.buildTime,
    configSchemaVersion: input.configSchemaVersion,
    sourceRepositoryUrl: input.sourceRepositoryUrl,
    reproducibleBuildInstructionsUrl: input.reproducibleBuildInstructionsUrl,
    expectedBuildHash: input.expectedBuildHash,
    buildHashMatchesExpected,
    publishedArtifactHashes: input.publishedArtifactHashes,
    runtimeAttestationStatus: input.runtimeAttestationStatus,
    attestationReport: {
      downloadUrl: input.attestationReportDownloadUrl ?? null,
      explanation: toAttestationExplanation(input.runtimeAttestationStatus)
    },
    assuranceLevel: summary.assuranceLevel,
    reducedAssuranceDisclosure:
      summary.disclosureReason === 'NONE'
        ? null
        : createReducedAssuranceDisclosure(summary.disclosureReason)
  };
};
