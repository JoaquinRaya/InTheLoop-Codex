import { isLeft, isRight } from '../domain/either.js';
import { describe, expect, it } from 'vitest';
import { createUnlinkableSubmissionArtifacts } from './create-unlinkable-submission.js';

describe('createUnlinkableSubmissionArtifacts', () => {
  it('builds separate participation and response artifacts without correlation keys', () => {
    const result = createUnlinkableSubmissionArtifacts({
      responsePayload: {
        question_id: 'q-123',
        normalized_score: 80,
        optional_comment: 'Feels good',
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      participationEvent: {
        participation_day: '2026-03-22',
        prompt_state: 'answered'
      }
    });

    expect(isRight(result)).toBe(true);

    if (isRight(result)) {
      expect(result.right.participationArtifact).toEqual({
        participationDay: '2026-03-22',
        promptState: 'answered'
      });
      expect(result.right.responseArtifact.questionId).toBe('q-123');
      expect(result.right.audit.unexpectedSharedFields).toEqual([]);
      expect(result.right.audit.containsCorrelationKey).toBe(false);
    }
  });

  it('allows explicitly allowlisted shared fields when present', () => {
    const result = createUnlinkableSubmissionArtifacts({
      responsePayload: {
        question_id: 'q-123',
        normalized_score: 80,
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      participationEvent: {
        participation_day: '2026-03-22',
        prompt_state: 'answered',
        survey_day: '2026-03-22'
      }
    });

    expect(isRight(result)).toBe(true);
  });

  it('fails when response payload is invalid', () => {
    const result = createUnlinkableSubmissionArtifacts({
      responsePayload: {
        question_id: 'q-123',
        normalized_score: 180,
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      participationEvent: {
        participation_day: '2026-03-22',
        prompt_state: 'answered'
      }
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('INVALID_RESPONSE_PAYLOAD');
    }
  });

  it('fails when participation artifact contains prohibited correlation metadata', () => {
    const result = createUnlinkableSubmissionArtifacts({
      responsePayload: {
        question_id: 'q-123',
        normalized_score: 80,
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      participationEvent: {
        participation_day: '2026-03-22',
        prompt_state: 'answered',
        request_id: 'req-1'
      }
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('PROHIBITED_PARTICIPATION_METADATA');
    }
  });

  it('fails when participation and response artifacts share non-allowlisted fields', () => {
    const result = createUnlinkableSubmissionArtifacts({
      responsePayload: {
        question_id: 'q-123',
        normalized_score: 80,
        manager_email: 'mgr@example.com',
        role: 'engineer',
        level: 'l4',
        survey_day: '2026-03-22'
      },
      participationEvent: {
        participation_day: '2026-03-22',
        prompt_state: 'answered',
        question_id: 'q-123'
      }
    });

    expect(isLeft(result)).toBe(true);

    if (isLeft(result)) {
      expect(result.left.code).toBe('LINKABILITY_DETECTED');
    }
  });
});
