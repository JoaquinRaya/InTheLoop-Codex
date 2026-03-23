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
  readonly loadPendingEnvelopes: () => ReadonlyArray<AnonymousSubmissionEnvelope>;
  readonly persistShuffledBatch: (batch: AnonymousSubmissionBatch) => void;
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
  const pendingStore = new Map<'pending', ReadonlyArray<AnonymousSubmissionEnvelope>>([
    ['pending', []]
  ]);
  const persistedStore = new Map<'persisted', ReadonlyArray<AnonymousSubmissionBatch>>([
    ['persisted', []]
  ]);

  const loadPending = (): ReadonlyArray<AnonymousSubmissionEnvelope> =>
    pendingStore.get('pending') ?? [];
  const loadPersisted = (): ReadonlyArray<AnonymousSubmissionBatch> =>
    persistedStore.get('persisted') ?? [];

  return {
    enqueue: (envelope) => {
      pendingStore.set('pending', [...loadPending(), envelope]);
    },
    loadPendingEnvelopes: () => loadPending(),
    persistShuffledBatch: (batch) => {
      persistedStore.set('persisted', [...loadPersisted(), batch]);
      pendingStore.set('pending', []);
    },
    readPersistedBatches: () => loadPersisted()
  };
};
