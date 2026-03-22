import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../domain/either.js';
import { buildAnonymousSubmissionBatch, computeRandomizedSendDelayMs } from './submission-pipeline.js';

describe('computeRandomizedSendDelayMs', () => {
  it('computes randomized delay inside configured bounds', () => {
    const result = computeRandomizedSendDelayMs({
      minDelayMs: 500,
      maxDelayMs: 1500,
      randomUnitInterval: 0.3
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right).toBe(800);
    }
  });

  it('rejects invalid delay bounds', () => {
    const result = computeRandomizedSendDelayMs({
      minDelayMs: 200,
      maxDelayMs: 100,
      randomUnitInterval: 0.5
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_DELAY_CONFIGURATION');
    }
  });

  it('rejects invalid random input', () => {
    const result = computeRandomizedSendDelayMs({
      minDelayMs: 100,
      maxDelayMs: 300,
      randomUnitInterval: 1
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_RANDOM_INPUT');
    }
  });
});

describe('buildAnonymousSubmissionBatch', () => {
  it('shuffles envelopes and strips response-path correlator metadata', () => {
    const result = buildAnonymousSubmissionBatch({
      envelopes: [
        {
          encryptedPayload: 'enc-a',
          receivedAtEpochMs: 1,
          transportMetadata: {
            route: 'v1',
            ip_address: '10.0.0.1'
          }
        },
        {
          encryptedPayload: 'enc-b',
          receivedAtEpochMs: 2,
          transportMetadata: {
            request_id: 'req-1',
            queue: 'survey'
          }
        },
        {
          encryptedPayload: 'enc-c',
          receivedAtEpochMs: 3,
          transportMetadata: {
            correlation_trace: 'corr-1',
            region: 'us'
          }
        }
      ],
      shuffleRandomness: [0.7, 0.1, 0.4]
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right.batchSize).toBe(3);
      expect(result.right.shuffledEnvelopes.map((envelope) => envelope.encryptedPayload)).toEqual([
        'enc-b',
        'enc-c',
        'enc-a'
      ]);
      expect(result.right.shuffledEnvelopes[0]!.transportMetadata).toEqual({
        queue: 'survey'
      });
      expect(result.right.shuffledEnvelopes[1]!.transportMetadata).toEqual({
        region: 'us'
      });
      expect(result.right.shuffledEnvelopes[2]!.transportMetadata).toEqual({
        route: 'v1'
      });
    }
  });



  it('rejects invalid shuffle random values outside [0, 1)', () => {
    const result = buildAnonymousSubmissionBatch({
      envelopes: [
        {
          encryptedPayload: 'enc-a',
          receivedAtEpochMs: 1,
          transportMetadata: {}
        }
      ],
      shuffleRandomness: [1]
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_RANDOM_INPUT');
    }
  });

  it('keeps input order when random ranks are equal', () => {
    const result = buildAnonymousSubmissionBatch({
      envelopes: [
        {
          encryptedPayload: 'enc-a',
          receivedAtEpochMs: 1,
          transportMetadata: {}
        },
        {
          encryptedPayload: 'enc-b',
          receivedAtEpochMs: 2,
          transportMetadata: {}
        }
      ],
      shuffleRandomness: [0.3, 0.3]
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right.shuffledEnvelopes.map((envelope) => envelope.encryptedPayload)).toEqual([
        'enc-a',
        'enc-b'
      ]);
    }
  });

  it('rejects missing shuffle randomness values', () => {
    const result = buildAnonymousSubmissionBatch({
      envelopes: [
        {
          encryptedPayload: 'enc-a',
          receivedAtEpochMs: 1,
          transportMetadata: {}
        },
        {
          encryptedPayload: 'enc-b',
          receivedAtEpochMs: 2,
          transportMetadata: {}
        }
      ],
      shuffleRandomness: [0.1]
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INSUFFICIENT_SHUFFLE_RANDOMNESS');
    }
  });
});
