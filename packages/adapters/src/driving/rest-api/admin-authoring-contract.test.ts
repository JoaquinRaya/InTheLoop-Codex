import { describe, expect, it } from 'vitest';
import { none, some } from '../../../../core/src/domain/option.js';
import {
  parseAdminAuthoringPreviewInput,
  parseAndValidateAdminAuthoringBatch
} from './admin-authoring-contract.js';

describe('parseAndValidateAdminAuthoringBatch', () => {
  it('maps admin targeting and optional first display timestamp', () => {
    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: [
        {
          id: 'q-company',
          created_at: '2026-03-01T00:00:00.000Z',
          text: 'How is focus this week?',
          category: 'execution',
          tags: ['focus'],
          options: ['1', '2', '3'],
          points: 10,
          allow_comments: true,
          schedule: { type: 'queue' },
          target: { type: 'whole_company' }
        },
        {
          id: 'q-manager',
          created_at: '2026-03-02T00:00:00.000Z',
          text: 'How is team communication?',
          category: 'teamwork',
          tags: ['communication'],
          options: ['1', '2', '3'],
          points: 10,
          allow_comments: true,
          schedule: { type: 'specific_date', date: '2026-03-22' },
          target: { type: 'manager_subtree', manager_email: 'vp@example.com' },
          first_displayed_at: '2026-03-21T00:00:00.000Z'
        }
      ]
    });

    expect(parsed._tag).toBe('Right');

    if (parsed._tag === 'Right') {
      expect(parsed.right[0]?.target).toEqual({ type: 'whole-company' });
      expect(parsed.right[1]?.target).toEqual({ type: 'manager-subtree', managerEmail: 'vp@example.com' });
      expect(parsed.right[0]?.firstDisplayedAt).toEqual(none());
      expect(parsed.right[1]?.firstDisplayedAt).toEqual(some('2026-03-21T00:00:00.000Z'));
    }
  });

  it('returns errors for invalid first_displayed_at', () => {
    const parsed = parseAndValidateAdminAuthoringBatch({
      questions: [
        {
          id: 'q-bad',
          created_at: '2026-03-01T00:00:00.000Z',
          text: 'Invalid',
          category: 'execution',
          tags: [],
          options: ['1'],
          points: 1,
          allow_comments: false,
          schedule: { type: 'queue' },
          target: { type: 'group', group_id: 'grp-a' },
          first_displayed_at: 'not-a-date'
        }
      ]
    });

    expect(parsed).toEqual({
      _tag: 'Left',
      left: [
        'INVALID_FIRST_DISPLAYED_AT:q-bad:first_displayed_at must be a valid ISO timestamp.'
      ]
    });
  });
});

describe('parseAdminAuthoringPreviewInput', () => {
  it('normalizes preview request shape', () => {
    expect(parseAdminAuthoringPreviewInput({
      timestamp_utc_iso: '2026-03-22T09:00:00.000Z',
      time_zone: 'America/New_York',
      profile: {
        manager_email: 'lead@example.com',
        manager_ancestry_emails: ['vp@example.com'],
        group_ids: ['grp-1']
      }
    })).toEqual({
      timestampUtcIso: '2026-03-22T09:00:00.000Z',
      timeZone: 'America/New_York',
      profile: {
        managerEmail: some('lead@example.com'),
        managerAncestryEmails: ['vp@example.com'],
        groupIds: ['grp-1']
      }
    });
  });
});
