import { Pool, type QueryResultRow } from 'pg';
import type { AdminAuthoringQuestion, AdminAuthoringEmployeeProfile } from '../../../core/src/application/admin-authoring.js';
import { none, some } from '../../../core/src/domain/option.js';
import {
  createEmptyQuestionSelectionState,
  type QuestionSelectionState
} from '../../../core/src/application/question-scheduling.js';
import { left, right, type Either } from '../../../core/src/domain/either.js';
import type { ResponsePayload } from '../../../core/src/domain/response-payload.js';
import type { StoredQuestionSelectionState } from '../../../core/src/ports/driven/for-question-selection-state-storage.js';
import type { RuntimeStore, StoredScoreRecord } from './runtime-store.js';

type QuestionRow = QueryResultRow & Readonly<{
  readonly payload: string;
}>;

type SelectionRow = QueryResultRow & Readonly<{
  readonly state: string;
  readonly version: number;
}>;

type ScoreRow = QueryResultRow & Readonly<{
  readonly question_id: string;
  readonly normalized_score: number;
  readonly optional_comment: string | null;
  readonly manager_email: string;
  readonly role: string;
  readonly level: string;
  readonly survey_day: string;
}>;

/**
 * parseQuestion.
 */
const parseQuestion = (payload: string): AdminAuthoringQuestion =>
  JSON.parse(payload) as AdminAuthoringQuestion;

/**
 * parseState.
 */
const parseState = (payload: string): QuestionSelectionState =>
  JSON.parse(payload) as QuestionSelectionState;

/**
 * PostgresRuntimeStore.
 */
export class PostgresRuntimeStore implements RuntimeStore {
  private readonly pool: Pool;

  /**
   * constructor.
   */
  public constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  /**
   * initialize.
   */
  public async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS admin_questions (
        tenant_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        payload JSONB NOT NULL,
        PRIMARY KEY (tenant_id, question_id)
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS question_selection_state (
        tenant_id TEXT PRIMARY KEY,
        state JSONB NOT NULL,
        version INTEGER NOT NULL
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS response_scores (
        id BIGSERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        normalized_score INTEGER NOT NULL,
        optional_comment TEXT NULL,
        manager_email TEXT NOT NULL,
        role TEXT NOT NULL,
        level TEXT NOT NULL,
        survey_day TEXT NOT NULL
      );
    `);
  }

  /**
   * upsertQuestions.
   */
  public async upsertQuestions(
    tenantId: string,
    questions: readonly AdminAuthoringQuestion[]
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM admin_questions WHERE tenant_id = $1', [tenantId]);

      for (const question of questions) {
        await client.query(
          `
            INSERT INTO admin_questions (tenant_id, question_id, payload)
            VALUES ($1, $2, $3::jsonb)
          `,
          [tenantId, question.id, JSON.stringify(question)]
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * loadQuestions.
   */
  public async loadQuestions(tenantId: string): Promise<readonly AdminAuthoringQuestion[]> {
    const result = await this.pool.query<QuestionRow>(
      `
        SELECT payload::text AS payload
        FROM admin_questions
        WHERE tenant_id = $1
      `,
      [tenantId]
    );

    return result.rows.map((row: QuestionRow) => parseQuestion(row.payload));
  }

  /**
   * saveScore.
   */
  public async saveScore(tenantId: string, payload: ResponsePayload): Promise<void> {
    await this.pool.query(
      `
        INSERT INTO response_scores (
          tenant_id,
          question_id,
          normalized_score,
          optional_comment,
          manager_email,
          role,
          level,
          survey_day
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        tenantId,
        payload.questionId,
        payload.normalizedScore,
        payload.optionalComment._tag === 'Some' ? payload.optionalComment.value : null,
        payload.managerEmail,
        payload.role,
        payload.level,
        payload.surveyDay
      ]
    );
  }

  /**
   * loadScores.
   */
  public async loadScores(tenantId: string): Promise<readonly StoredScoreRecord[]> {
    const result = await this.pool.query<ScoreRow>(
      `
        SELECT question_id, normalized_score, optional_comment, manager_email, role, level, survey_day
        FROM response_scores
        WHERE tenant_id = $1
      `,
      [tenantId]
    );

    return result.rows.map((row) => ({
      questionId: row.question_id,
      normalizedScore: row.normalized_score,
      optionalComment: row.optional_comment,
      managerEmail: row.manager_email,
      role: row.role,
      level: row.level,
      surveyDay: row.survey_day
    }));
  }

  /**
   * loadSelectionState.
   */
  public async loadSelectionState(tenantId: string): Promise<StoredQuestionSelectionState> {
    const result = await this.pool.query<SelectionRow>(
      `
        SELECT state::text AS state, version
        FROM question_selection_state
        WHERE tenant_id = $1
      `,
      [tenantId]
    );

    const [row] = result.rows;

    if (row === undefined) {
      return {
        state: createEmptyQuestionSelectionState(),
        version: 0
      };
    }

    return {
      state: parseState(row.state),
      version: row.version
    };
  }

  /**
   * saveSelectionState.
   */
  public async saveSelectionState(
    tenantId: string,
    nextState: QuestionSelectionState,
    expectedVersion: number
  ): Promise<Either<'VERSION_CONFLICT', number>> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const current = await client.query<SelectionRow>(
        `
          SELECT state::text AS state, version
          FROM question_selection_state
          WHERE tenant_id = $1
          FOR UPDATE
        `,
        [tenantId]
      );

      const [currentRow] = current.rows;
      const currentVersion = currentRow?.version ?? 0;

      if (currentVersion !== expectedVersion) {
        await client.query('ROLLBACK');
        return left('VERSION_CONFLICT');
      }

      const nextVersion = currentVersion + 1;

      await client.query(
        `
          INSERT INTO question_selection_state (tenant_id, state, version)
          VALUES ($1, $2::jsonb, $3)
          ON CONFLICT (tenant_id)
          DO UPDATE SET state = EXCLUDED.state, version = EXCLUDED.version
        `,
        [tenantId, JSON.stringify(nextState), nextVersion]
      );

      await client.query('COMMIT');
      return right(nextVersion);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * close.
   */
  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export type PromptRequestProfileInput = Readonly<{
  readonly managerEmail?: string;
  readonly managerAncestryEmails: readonly string[];
  readonly groupIds: readonly string[];
}>;

/**
 * toAdminAuthoringProfile.
 */
export const toAdminAuthoringProfile = (
  input: PromptRequestProfileInput
): AdminAuthoringEmployeeProfile => ({
  managerEmail: input.managerEmail === undefined ? none() : some(input.managerEmail),
  managerAncestryEmails: input.managerAncestryEmails,
  groupIds: input.groupIds
});
