import type { Either } from '../../../../core/src/domain/either.js';
import { right } from '../../../../core/src/domain/either.js';
import {
  buildAnonymousSubmissionBatch,
  type AnonymousSubmissionBatch,
  type AnonymousSubmissionEnvelope,
  type BuildAnonymousSubmissionBatchInput,
  type SubmissionPipelineError
} from '../../../../core/src/application/submission-pipeline.js';

export type ForAnonymousSubmissionQueue = Readonly<{
  loadPendingEnvelopes: () => ReadonlyArray<AnonymousSubmissionEnvelope>;
  persistShuffledBatch: (batch: AnonymousSubmissionBatch) => void;
}>;

export type ProcessAnonymousSubmissionBatchInput = Omit<BuildAnonymousSubmissionBatchInput, 'envelopes'> &
  Readonly<{
    readonly queue: ForAnonymousSubmissionQueue;
  }>;

export const processAnonymousSubmissionBatch = (
  input: ProcessAnonymousSubmissionBatchInput
): Either<SubmissionPipelineError, AnonymousSubmissionBatch> => {
  const batchResult = buildAnonymousSubmissionBatch({
    envelopes: input.queue.loadPendingEnvelopes(),
    shuffleRandomness: input.shuffleRandomness
  });

  if (batchResult._tag === 'Left') {
    return batchResult;
  }

  input.queue.persistShuffledBatch(batchResult.right);

  return right(batchResult.right);
};

export type InMemoryAnonymousSubmissionQueue = ForAnonymousSubmissionQueue &
  Readonly<{
    readonly enqueue: (envelope: AnonymousSubmissionEnvelope) => void;
    readonly readPersistedBatches: () => ReadonlyArray<AnonymousSubmissionBatch>;
  }>;

export const createInMemoryAnonymousSubmissionQueue = (): InMemoryAnonymousSubmissionQueue => {
  let pending: ReadonlyArray<AnonymousSubmissionEnvelope> = [];
  let persisted: ReadonlyArray<AnonymousSubmissionBatch> = [];

  return {
    enqueue: (envelope) => {
      pending = [...pending, envelope];
    },
    loadPendingEnvelopes: () => pending,
    persistShuffledBatch: (batch) => {
      persisted = [...persisted, batch];
      pending = [];
    },
    readPersistedBatches: () => persisted
  };
};
