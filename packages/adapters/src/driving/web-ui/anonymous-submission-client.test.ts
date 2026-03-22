import { describe, expect, it } from 'vitest';
import { isLeft, isRight } from '../../../../core/src/domain/either.js';
import { prepareDelayedAnonymousSubmission } from './anonymous-submission-client.js';

describe('prepareDelayedAnonymousSubmission', () => {
  it('builds delayed anonymous envelope from encrypted payload and delay config', () => {
    const prepared = prepareDelayedAnonymousSubmission({
      payloadCiphertext: 'ciphertext-1',
      receivedAtEpochMs: 42,
      transportMetadata: {
        route: 'submit-v1'
      },
      randomUnitInterval: 0.5,
      delayConfig: {
        minDelayMs: 200,
        maxDelayMs: 600
      }
    });

    expect(isRight(prepared)).toBe(true);

    if (isRight(prepared)) {
      expect(prepared.right.delayMs).toBe(400);
      expect(prepared.right.envelope.encryptedPayload).toBe('ciphertext-1');
    }
  });

  it('rejects missing encrypted payload', () => {
    const prepared = prepareDelayedAnonymousSubmission({
      payloadCiphertext: '',
      receivedAtEpochMs: 42,
      transportMetadata: {},
      randomUnitInterval: 0.5,
      delayConfig: {
        minDelayMs: 200,
        maxDelayMs: 600
      }
    });

    expect(isLeft(prepared)).toBe(true);

    if (isLeft(prepared)) {
      expect(prepared.left.code).toBe('INVALID_ENCRYPTED_PAYLOAD');
    }
  });
});
