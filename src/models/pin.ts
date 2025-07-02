import { DatabaseManager } from './database.js';
import type { Pin } from '../types/index.js';
import { nowInUnixSeconds, unixSecondsToDate } from './utils/timestamp.js';

export class PinModel {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private convertRowToPin(row: unknown): Pin {
    const data = row as {
      id: number;
      article_id: number;
      created_at: number;
    };

    return {
      id: data.id,
      article_id: data.article_id,
      created_at: unixSecondsToDate(data.created_at),
    };
  }

  public create(articleId: number): Pin {
    const now = nowInUnixSeconds();
    const stmt = this.db.getDb().prepare(`
      INSERT INTO pins (article_id, created_at)
      VALUES (?, ?)
    `);

    const result = stmt.run(articleId, now);

    return {
      id: result.lastInsertRowid as number,
      article_id: articleId,
      created_at: unixSecondsToDate(now),
    };
  }

  public delete(articleId: number): boolean {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM pins WHERE article_id = ?
    `);

    const result = stmt.run(articleId);
    return result.changes > 0;
  }

  public findByArticleId(articleId: number): Pin | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM pins WHERE article_id = ?
    `);

    const row = stmt.get(articleId);
    return row ? this.convertRowToPin(row) : null;
  }

  public findAll(): Pin[] {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM pins ORDER BY created_at DESC
    `);

    const rows = stmt.all();
    return rows.map((row) => this.convertRowToPin(row));
  }

  public isPinned(articleId: number): boolean {
    const stmt = this.db.getDb().prepare(`
      SELECT 1 FROM pins WHERE article_id = ? LIMIT 1
    `);

    const row = stmt.get(articleId);
    return row !== undefined;
  }
}
