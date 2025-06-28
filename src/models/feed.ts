import { DatabaseManager } from './database';
import { Feed, CreateFeedInput } from './types';
import { UniqueConstraintError } from './errors';

export class FeedModel {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(feed: CreateFeedInput): Feed {
    const stmt = this.db.getDb().prepare(`
      INSERT INTO feeds (url, title, description, last_updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `);

    try {
      const result = stmt.run(feed.url, feed.title, feed.description || null);

      return {
        id: result.lastInsertRowid as number,
        ...feed,
        last_updated_at: new Date(),
        created_at: new Date(),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed: feeds.url')) {
          throw new UniqueConstraintError('URL', feed.url);
        }
      }
      throw error;
    }
  }

  public findById(id: number): Feed | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds WHERE id = ?
    `);

    const row = stmt.get(id) as Feed | undefined;
    return row || null;
  }

  public findByUrl(url: string): Feed | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds WHERE url = ?
    `);

    const row = stmt.get(url) as Feed | undefined;
    return row || null;
  }

  public findAll(): Feed[] {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds ORDER BY created_at DESC
    `);

    return stmt.all() as Feed[];
  }

  public update(id: number, updates: Partial<Feed>): Feed | null {
    const allowedFields = ['title', 'description', 'last_updated_at'];
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        updateValues.push(updates[field as keyof Feed]);
      }
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    updateValues.push(id);

    const stmt = this.db.getDb().prepare(`
      UPDATE feeds 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...updateValues);

    return this.findById(id);
  }

  public delete(id: number): boolean {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM feeds WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  public updateLastUpdatedAt(id: number): void {
    const stmt = this.db.getDb().prepare(`
      UPDATE feeds 
      SET last_updated_at = datetime('now')
      WHERE id = ?
    `);

    stmt.run(id);
  }
}
