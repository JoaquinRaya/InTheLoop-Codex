export type BuildProvenanceMetadata = Readonly<{
  readonly commitHash: string;
  readonly buildHash: string;
  readonly buildTime: string;
  readonly configSchemaVersion: string;
  readonly sourceRepositoryUrl: string;
  readonly reproducibleBuildInstructionsUrl: string;
}>;

export type RuntimeAttestationStatus = 'VERIFIED' | 'UNAVAILABLE' | 'FAILED';

export type RuntimeVerificationSignals = Readonly<{
  readonly buildProvenance: BuildProvenanceMetadata;
  readonly runtimeAttestationStatus: RuntimeAttestationStatus;
  readonly expectedBuildHash: string;
}>;

const provenanceFieldNames = [
  'commitHash',
  'buildHash',
  'buildTime',
  'configSchemaVersion',
  'sourceRepositoryUrl',
  'reproducibleBuildInstructionsUrl'
] as const;

export type BuildProvenanceFieldName = (typeof provenanceFieldNames)[number];

export type BuildProvenanceValidationResult = Readonly<{
  readonly isValid: boolean;
  readonly missingFields: ReadonlyArray<BuildProvenanceFieldName>;
}>;

export type ReducedAssuranceReason =
  | 'NONE'
  | 'MISSING_BUILD_PROVENANCE'
  | 'BUILD_HASH_MISMATCH'
  | 'ATTESTATION_UNAVAILABLE'
  | 'ATTESTATION_FAILED';

export type TrustAssuranceSummary = Readonly<{
  readonly assuranceLevel: 'HIGH_ASSURANCE' | 'REDUCED_ASSURANCE';
  readonly shouldDisplayReducedAssuranceNotice: boolean;
  readonly disclosureReason: ReducedAssuranceReason;
}>;

const hasNonEmptyValue = (value: string): boolean => value.trim().length > 0;

export const validateBuildProvenanceMetadata = (
  metadata: BuildProvenanceMetadata
): BuildProvenanceValidationResult => {
  const missingFields = provenanceFieldNames.filter(
    (fieldName) => !hasNonEmptyValue(metadata[fieldName])
  );

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
};

export const determineTrustAssurance = (
  verificationSignals: RuntimeVerificationSignals
): TrustAssuranceSummary => {
  const provenanceValidation = validateBuildProvenanceMetadata(verificationSignals.buildProvenance);

  if (!provenanceValidation.isValid) {
    return {
      assuranceLevel: 'REDUCED_ASSURANCE',
      shouldDisplayReducedAssuranceNotice: true,
      disclosureReason: 'MISSING_BUILD_PROVENANCE'
    };
  }

  if (verificationSignals.buildProvenance.buildHash !== verificationSignals.expectedBuildHash) {
    return {
      assuranceLevel: 'REDUCED_ASSURANCE',
      shouldDisplayReducedAssuranceNotice: true,
      disclosureReason: 'BUILD_HASH_MISMATCH'
    };
  }

  if (verificationSignals.runtimeAttestationStatus === 'UNAVAILABLE') {
    return {
      assuranceLevel: 'REDUCED_ASSURANCE',
      shouldDisplayReducedAssuranceNotice: true,
      disclosureReason: 'ATTESTATION_UNAVAILABLE'
    };
  }

  if (verificationSignals.runtimeAttestationStatus === 'FAILED') {
    return {
      assuranceLevel: 'REDUCED_ASSURANCE',
      shouldDisplayReducedAssuranceNotice: true,
      disclosureReason: 'ATTESTATION_FAILED'
    };
  }

  return {
    assuranceLevel: 'HIGH_ASSURANCE',
    shouldDisplayReducedAssuranceNotice: false,
    disclosureReason: 'NONE'
  };
};
