import type { Either } from '../domain/either.js';
import { left, right } from '../domain/either.js';
import { isProhibitedIdentityOrCorrelationKey } from '../domain/prd-01-trust-rules.js';

export type RandomizedSendDelayInput = Readonly<{
  readonly minDelayMs: number;
  readonly maxDelayMs: number;
  readonly randomUnitInterval: number;
}>;

export type AnonymousSubmissionEnvelope = Readonly<{
  readonly encryptedPayload: string;
  readonly receivedAtEpochMs: number;
  readonly transportMetadata: Readonly<Record<string, string>>;
}>;

export type AnonymousSubmissionBatch = Readonly<{
  readonly batchSize: number;
  readonly shuffledEnvelopes: ReadonlyArray<AnonymousSubmissionEnvelope>;
}>;

export type SubmissionPipelineError = Readonly<{
  readonly code:
    | 'INVALID_DELAY_CONFIGURATION'
    | 'INVALID_RANDOM_INPUT'
    | 'INSUFFICIENT_SHUFFLE_RANDOMNESS';
  readonly message: string;
}>;

export type BuildAnonymousSubmissionBatchInput = Readonly<{
  readonly envelopes: ReadonlyArray<AnonymousSubmissionEnvelope>;
  readonly shuffleRandomness: ReadonlyArray<number>;
}>;

const correlatorPatternParts = ['ip', 'x_forwarded_for', 'forwarded', 'request', 'correlation'] as const;

const createPipelineError = (
  code: SubmissionPipelineError['code'],
  message: string
): SubmissionPipelineError => ({
  code,
  message
});

const isUnitIntervalValue = (value: number): boolean => value >= 0 && value < 1;

const hasCorrelatorPattern = (key: string): boolean =>
  correlatorPatternParts.some((part) => key.toLowerCase().includes(part));

const sanitizeTransportMetadata = (
  metadata: Readonly<Record<string, string>>
): Readonly<Record<string, string>> =>
  Object.keys(metadata).reduce<Readonly<Record<string, string>>>((accumulator, key) => {
    if (isProhibitedIdentityOrCorrelationKey(key) || hasCorrelatorPattern(key)) {
      return accumulator;
    }

    return {
      ...accumulator,
      [key]: metadata[key]!
    };
  }, {});

export const computeRandomizedSendDelayMs = (
  input: RandomizedSendDelayInput
): Either<SubmissionPipelineError, number> => {
  if (input.minDelayMs < 0 || input.maxDelayMs < input.minDelayMs) {
    return left(
      createPipelineError(
        'INVALID_DELAY_CONFIGURATION',
        'Delay configuration must be non-negative and maxDelayMs must be >= minDelayMs.'
      )
    );
  }

  if (!isUnitIntervalValue(input.randomUnitInterval)) {
    return left(
      createPipelineError(
        'INVALID_RANDOM_INPUT',
        'randomUnitInterval must be in [0, 1).'
      )
    );
  }

  const range = input.maxDelayMs - input.minDelayMs;

  return right(input.minDelayMs + Math.floor(range * input.randomUnitInterval));
};

export const buildAnonymousSubmissionBatch = (
  input: BuildAnonymousSubmissionBatchInput
): Either<SubmissionPipelineError, AnonymousSubmissionBatch> => {
  if (input.shuffleRandomness.length < input.envelopes.length) {
    return left(
      createPipelineError(
        'INSUFFICIENT_SHUFFLE_RANDOMNESS',
        'shuffleRandomness must provide at least one random value per envelope.'
      )
    );
  }

  const invalidRandomValue = input.shuffleRandomness.some((value) => !isUnitIntervalValue(value));

  if (invalidRandomValue) {
    return left(
      createPipelineError(
        'INVALID_RANDOM_INPUT',
        'All shuffle random values must be in [0, 1).'
      )
    );
  }

  const shuffledEnvelopes = input.envelopes
    .map((envelope, index) => ({
      envelope: {
        ...envelope,
        transportMetadata: sanitizeTransportMetadata(envelope.transportMetadata)
      },
      randomRank: input.shuffleRandomness[index]!,
      index
    }))
    .sort((leftItem, rightItem) => {
      if (leftItem.randomRank === rightItem.randomRank) {
        return leftItem.index - rightItem.index;
      }

      return leftItem.randomRank - rightItem.randomRank;
    })
    .map((item) => item.envelope);

  return right({
    batchSize: shuffledEnvelopes.length,
    shuffledEnvelopes
  });
};
