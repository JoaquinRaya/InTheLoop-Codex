import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../../../../core/src/domain/either.js';
import {
  createInMemoryAnonymousSubmissionQueue,
  processAnonymousSubmissionBatch
} from './anonymous-submission-batch-processor.js';

describe('processAnonymousSubmissionBatch', () => {
  it('loads, shuffles, sanitizes, and persists anonymous submission batches', () => {
    const queue = createInMemoryAnonymousSubmissionQueue();
    queue.enqueue({
      encryptedPayload: 'enc-a',
      receivedAtEpochMs: 1,
      transportMetadata: {
        request_id: 'req-1',
        route: 'submit'
      }
    });
    queue.enqueue({
      encryptedPayload: 'enc-b',
      receivedAtEpochMs: 2,
      transportMetadata: {
        ip_address: '10.0.0.2',
        shard: 'alpha'
      }
    });

    const result = processAnonymousSubmissionBatch({
      queue,
      shuffleRandomness: [0.8, 0.2]
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right.shuffledEnvelopes.map((envelope) => envelope.encryptedPayload)).toEqual([
        'enc-b',
        'enc-a'
      ]);
      expect(result.right.shuffledEnvelopes[0]!.transportMetadata).toEqual({
        shard: 'alpha'
      });
      expect(result.right.shuffledEnvelopes[1]!.transportMetadata).toEqual({
        route: 'submit'
      });
    }

    expect(queue.loadPendingEnvelopes()).toEqual([]);
    expect(queue.readPersistedBatches()).toHaveLength(1);
  });

  it('returns error and does not persist when shuffle randomness is invalid', () => {
    const queue = createInMemoryAnonymousSubmissionQueue();
    queue.enqueue({
      encryptedPayload: 'enc-a',
      receivedAtEpochMs: 1,
      transportMetadata: {}
    });

    const result = processAnonymousSubmissionBatch({
      queue,
      shuffleRandomness: [1]
    });

    expect(isLeft(result)).toBe(true);
    expect(queue.readPersistedBatches()).toHaveLength(0);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_RANDOM_INPUT');
    }
  });
});
