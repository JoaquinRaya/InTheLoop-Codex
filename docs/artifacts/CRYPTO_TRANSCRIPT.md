# CRYPTO_TRANSCRIPT

## Purpose
Canonical message-by-message transcript for client submission.

## v1 transcript (practical)
1. Client resolves daily question.
2. Client creates payload with allowed fields only.
3. Client encrypts payload with server public key.
4. Client waits randomized delay.
5. Client submits encrypted envelope.
6. Server queues envelopes into batch.
7. Batch worker shuffles and persists randomized order.
8. Aggregation reads persisted records by coarse survey day.

## Validation checks
- Payload schema validation rejects unknown fields.
- High-precision timestamps removed from analytics path.
- Batch size/delay policy must be auditable.

## Future strong protocol section
Reserved for anonymous-credential/attested-flow transcripts once finalized.
