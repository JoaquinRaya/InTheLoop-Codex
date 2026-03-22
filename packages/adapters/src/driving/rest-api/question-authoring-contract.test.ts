import { describe, expect, it } from 'vitest';
import { parseAndValidateQuestionAuthoringBatch } from './question-authoring-contract.js';

describe('parseAndValidateQuestionAuthoringBatch', () => {
  it('maps and validates complex recurring authoring payloads', () => {
    const parsed = parseAndValidateQuestionAuthoringBatch({
      questions: [
        {
          id: 'q-third-tuesday',
          created_at: '2026-03-01T00:00:00.000Z',
          text: 'How clear were sprint goals?',
          category: 'execution',
          tags: ['sprint'],
          options: ['1', '2', '3'],
          points: 10,
          allow_comments: true,
          schedule: {
            type: 'recurring',
            start_date: '2026-01-01',
            rule: { kind: 'nth_weekday_of_month', nth: 3, weekday: 2 }
          }
        },
        {
          id: 'q-monthly',
          created_at: '2026-03-02T00:00:00.000Z',
          text: 'How sustainable is your workload?',
          category: 'wellbeing',
          tags: ['load'],
          options: ['1', '2', '3'],
          points: 10,
          allow_comments: true,
          schedule: {
            type: 'recurring',
            start_date: '2026-01-31',
            rule: { kind: 'interval_months', interval_months: 1 }
          },
          suppression_windows: [
            {
              start_date: '2026-02-10',
              end_date: '2026-02-15'
            }
          ]
        }
      ]
    });

    expect(parsed._tag).toBe('Right');

    if (parsed._tag === 'Right') {
      expect(parsed.right[0]?.schedule).toEqual({
        type: 'recurring',
        startDate: '2026-01-01',
        endDate: undefined,
        rule: { kind: 'nth-weekday-of-month', nth: 3, weekday: 2 }
      });

      expect(parsed.right[1]?.schedule).toEqual({
        type: 'recurring',
        startDate: '2026-01-31',
        endDate: undefined,
        rule: { kind: 'interval-months', intervalMonths: 1 }
      });
    }
  });

  it('returns formatted validation errors for invalid authoring schedules', () => {
    const parsed = parseAndValidateQuestionAuthoringBatch({
      questions: [
        {
          id: 'q-invalid',
          created_at: '2026-03-02T00:00:00.000Z',
          text: 'Bad rule',
          category: 'quality',
          tags: [],
          options: ['1'],
          points: 1,
          allow_comments: false,
          schedule: {
            type: 'recurring',
            start_date: '2026-03-01',
            end_date: '2026-02-01',
            rule: { kind: 'interval_months', interval_months: 0 }
          }
        }
      ]
    });

    expect(parsed._tag).toBe('Left');

    if (parsed._tag === 'Left') {
      expect(parsed.left).toContain(
        'INVALID_DATE_RANGE:q-invalid:Recurring schedule endDate cannot be before startDate.'
      );
      expect(parsed.left).toContain(
        'INVALID_INTERVAL_MONTHS:q-invalid:intervalMonths must be at least 1.'
      );
    }
  });
});
