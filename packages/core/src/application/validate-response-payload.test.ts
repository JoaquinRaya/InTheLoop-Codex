import { isLeft, isRight } from 'fp-ts/Either';
import { isNone, isSome } from 'fp-ts/Option';
import { describe, expect, it } from 'vitest';
import { validateResponsePayload } from './validate-response-payload.js';

describe('validateResponsePayload', () => {
  it('rejects payloads that include prohibited identity metadata', () => {
    const result = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 75,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22',
      device_id: 'device-link'
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('PROHIBITED_OR_UNKNOWN_FIELD');
      expect(result.left.message).toContain('identity or correlation metadata');
    }
  });

  it('rejects payloads that include unknown fields', () => {
    const result = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 75,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22',
      unknown_field: 'unknown'
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('PROHIBITED_OR_UNKNOWN_FIELD');
      expect(result.left.message).toContain('prohibited or unknown fields');
    }
  });

  it('rejects payloads missing required fields', () => {
    const result = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 75,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4'
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('MISSING_REQUIRED_FIELD');
    }
  });

  it('rejects payloads with scores outside the allowed range', () => {
    const result = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 101,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22'
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_SCORE_RANGE');
    }
  });

  it('accepts valid payloads and maps optional comment to Option', () => {
    const withComment = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 82,
      optional_comment: 'Team morale improved this week.',
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22'
    });

    expect(isRight(withComment)).toBe(true);

    if (isRight(withComment)) {
      expect(withComment.right.questionId).toBe('q-123');
      expect(isSome(withComment.right.optionalComment)).toBe(true);
    }

    const withoutComment = validateResponsePayload({
      question_id: 'q-123',
      normalized_score: 82,
      manager_email: 'mgr@example.com',
      role: 'engineer',
      level: 'l4',
      survey_day: '2026-03-22'
    });

    expect(isRight(withoutComment)).toBe(true);

    if (isRight(withoutComment)) {
      expect(isNone(withoutComment.right.optionalComment)).toBe(true);
    }
  });
});
