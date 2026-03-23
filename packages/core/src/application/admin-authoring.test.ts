import { describe, expect, it } from 'vitest';
import {
  applyAdminQuestionEdit,
  canEditAdminAuthoringQuestion,
  previewQuestionResolutionForEmployee,
  recordQuestionFirstDisplay,
  type AdminAuthoringQuestion
} from './admin-authoring.js';
import { createEmptyQuestionSelectionState } from './question-scheduling.js';
import { createTenantWorkCalendarPolicy } from './work-calendar-policy.js';

const queueQuestion = (id: string, target: AdminAuthoringQuestion['target']): AdminAuthoringQuestion => ({
  id,
  createdAt: '2026-03-01T00:00:00.000Z',
  text: `${id} text`,
  category: 'culture',
  tags: [],
  options: ['1', '2', '3'],
  points: 10,
  allowComments: true,
  schedule: { type: 'queue' },
  target
});

describe('admin authoring', () => {
  it('marks questions immutable after first display', () => {
    const question = queueQuestion('q-1', { type: 'whole-company' });
    const displayed = recordQuestionFirstDisplay(question, '2026-03-22T11:30:00.000Z');

    expect(displayed._tag).toBe('Right');

    if (displayed._tag === 'Right') {
      expect(canEditAdminAuthoringQuestion(displayed.right)).toBe(false);

      const edited = applyAdminQuestionEdit(displayed.right, {
        ...displayed.right,
        text: 'edited text',
        target: { type: 'whole-company' }
      });

      expect(edited).toEqual({
        _tag: 'Left',
        left: {
          code: 'QUESTION_IMMUTABLE',
          message: 'Question q-1 is immutable after first display.'
        }
      });
    }
  });

  it('supports editing before first display', () => {
    const question = queueQuestion('q-2', { type: 'whole-company' });

    const edited = applyAdminQuestionEdit(question, {
      ...question,
      text: 'new wording',
      target: { type: 'group', groupId: 'grp-1' }
    });

    expect(edited._tag).toBe('Right');

    if (edited._tag === 'Right') {
      expect(edited.right.text).toBe('new wording');
      expect(edited.right.target).toEqual({ type: 'group', groupId: 'grp-1' });
    }
  });

  it('filters preview question resolution by targeting rules', () => {
    const selection = previewQuestionResolutionForEmployee(
      {
        timestampUtcIso: '2026-03-22T09:00:00.000Z',
        timeZone: 'UTC'
      },
      {
        managerEmail: 'lead@example.com',
        managerAncestryEmails: ['vp@example.com'],
        groupIds: ['grp-a']
      },
      [
        queueQuestion('q-company', { type: 'whole-company' }),
        {
          ...queueQuestion('q-mgr', { type: 'manager-subtree', managerEmail: 'vp@example.com' }),
          createdAt: '2026-03-02T00:00:00.000Z'
        },
        {
          ...queueQuestion('q-group', { type: 'group', groupId: 'grp-z' }),
          createdAt: '2026-03-03T00:00:00.000Z'
        }
      ],
      createEmptyQuestionSelectionState(),
      createTenantWorkCalendarPolicy({
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        holidays: []
      })
    );

    expect(selection._tag).toBe('Right');

    if (selection._tag === 'Right') {
      expect(selection.right.question?.id).toBe('q-mgr');
    }
  });


  it('keeps first display timestamp stable after it is set', () => {
    const initial = queueQuestion('q-4', { type: 'whole-company' });
    const first = recordQuestionFirstDisplay(initial, '2026-03-20T00:00:00.000Z');

    expect(first._tag).toBe('Right');

    if (first._tag === 'Right') {
      const second = recordQuestionFirstDisplay(first.right, '2026-03-21T00:00:00.000Z');
      expect(second).toEqual({
        _tag: 'Right',
        right: first.right
      });
    }
  });

  it('matches manager-subtree target for direct manager email', () => {
    const selection = previewQuestionResolutionForEmployee(
      {
        timestampUtcIso: '2026-03-22T09:00:00.000Z',
        timeZone: 'UTC'
      },
      {
        managerEmail: 'lead@example.com',
        managerAncestryEmails: [],
        groupIds: ['grp-a']
      },
      [
        queueQuestion('q-manager', { type: 'manager-subtree', managerEmail: 'lead@example.com' })
      ],
      createEmptyQuestionSelectionState(),
      createTenantWorkCalendarPolicy({
        workingWeekdays: [0, 1, 2, 3, 4, 5, 6],
        holidays: []
      })
    );

    expect(selection._tag).toBe('Right');

    if (selection._tag === 'Right') {
      expect(selection.right.question?.id).toBe('q-manager');
    }
  });

  it('rejects invalid first-display timestamp', () => {
    const result = recordQuestionFirstDisplay(queueQuestion('q-3', { type: 'whole-company' }), 'bad-date');

    expect(result).toEqual({
      _tag: 'Left',
      left: {
        code: 'INVALID_DISPLAY_TIMESTAMP',
        message: 'Invalid first-display timestamp: bad-date'
      }
    });
  });
});
