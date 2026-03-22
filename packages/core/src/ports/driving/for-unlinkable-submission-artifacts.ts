/**
 * Driving port for unlinkable submission artifact creation use case.
 */
import type { Either } from '../../domain/either.js';
import type {
  CreateUnlinkableSubmissionArtifactsError,
  CreateUnlinkableSubmissionArtifactsInput,
  CreateUnlinkableSubmissionArtifactsResult
} from '../../application/create-unlinkable-submission.js';

/**
 * Produces unlinkable participation + response artifacts from raw inputs.
 */
export type ForCreatingUnlinkableSubmissionArtifacts = (
  input: CreateUnlinkableSubmissionArtifactsInput
) => Either<CreateUnlinkableSubmissionArtifactsError, CreateUnlinkableSubmissionArtifactsResult>;
