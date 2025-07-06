import { DatabaseManager } from './database.js';
import type { Favorite } from '@/types';
import { UniqueConstraintError, ForeignKeyConstraintError } from './errors.js';
import { nowInUnixSeconds, unixSecondsToDate } from './utils/timestamp.js';

export class FavoriteModel {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private convertRowToFavorite(row: unknown): Favorite {
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

  public create(articleId: number): Favorite {
    const now = nowInUnixSeconds();
    const stmt = this.db.getDb().prepare(`
      INSERT INTO favorites (article_id, created_at)
      VALUES (?, ?)
    `);

    try {
      const result = stmt.run(articleId, now);

      return {
        id: result.lastInsertRowid as number,
        article_id: articleId,
        created_at: unixSecondsToDate(now),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed: favorites.article_id')) {
          throw new UniqueConstraintError('article_id', String(articleId));
        }
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          throw new ForeignKeyConstraintError('article_id', articleId);
        }
      }
      throw error;
    }
  }

  public findByArticleId(articleId: number): Favorite | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM favorites WHERE article_id = ?
    `);

    const row = stmt.get(articleId);
    return row ? this.convertRowToFavorite(row) : null;
  }

  public delete(articleId: number): boolean {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM favorites WHERE article_id = ?
    `);

    const result = stmt.run(articleId);
    return result.changes > 0;
  }

  public isFavorite(articleId: number): boolean {
    return this.findByArticleId(articleId) !== null;
  }

  public getFavoriteCount(): number {
    const stmt = this.db.getDb().prepare(`
      SELECT COUNT(*) as count FROM favorites
    `);

    const result = stmt.get() as { count: number };
    return result.count;
  }

  public clearAllFavorites(): number {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM favorites
    `);

    const result = stmt.run();
    return result.changes;
  }

  public getFavoriteArticleIds(): number[] {
    const stmt = this.db.getDb().prepare(`
      SELECT article_id FROM favorites ORDER BY created_at DESC
    `);

    const rows = stmt.all() as Array<{ article_id: number }>;
    return rows.map((row) => row.article_id);
  }
}
