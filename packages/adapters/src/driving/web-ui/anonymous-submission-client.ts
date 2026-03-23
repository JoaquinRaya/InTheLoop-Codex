import type { Either } from '../../../../core/src/domain/either.js';
import { left, right } from '../../../../core/src/domain/either.js';
import {
  computeRandomizedSendDelayMs,
  type AnonymousSubmissionEnvelope,
  type SubmissionPipelineError
} from '../../../../core/src/application/submission-pipeline.js';

export type AnonymousSubmissionDelayConfig = Readonly<{
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
}>;

export type PrepareDelayedAnonymousSubmissionInput = Readonly<{
  readonly payloadCiphertext: string;
  readonly receivedAtEpochMs: number;
  readonly transportMetadata: Readonly<Record<string, string>>;
  readonly randomUnitInterval: number;
  readonly delayConfig: AnonymousSubmissionDelayConfig;
}>;

export type DelayedAnonymousSubmission = Readonly<{
  readonly delayMs: number;
  readonly envelope: AnonymousSubmissionEnvelope;
}>;

export type PrepareDelayedAnonymousSubmissionError =
  | SubmissionPipelineError
  | Readonly<{
      readonly code: 'INVALID_ENCRYPTED_PAYLOAD';
      readonly message: string;
    }>;

/**
 * prepareDelayedAnonymousSubmission.
 */
export const prepareDelayedAnonymousSubmission = (
  input: PrepareDelayedAnonymousSubmissionInput
): Either<PrepareDelayedAnonymousSubmissionError, DelayedAnonymousSubmission> => {
  if (input.payloadCiphertext.length === 0) {
    return left({
      code: 'INVALID_ENCRYPTED_PAYLOAD',
      message: 'Encrypted payload must be present before anonymous submission.'
    });
  }

  const delay = computeRandomizedSendDelayMs({
    minDelayMs: input.delayConfig.minDelayMs,
    maxDelayMs: input.delayConfig.maxDelayMs,
    randomUnitInterval: input.randomUnitInterval
  });

  if (delay._tag === 'Left') {
    return left(delay.left);
  }

  return right({
    delayMs: delay.right,
    envelope: {
      encryptedPayload: input.payloadCiphertext,
      receivedAtEpochMs: input.receivedAtEpochMs,
      transportMetadata: input.transportMetadata
    }
  });
};
