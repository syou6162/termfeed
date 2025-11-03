import { DatabaseManager } from './database.js';
import type { Feed, CreateFeedInput } from '@/types';
import { UniqueConstraintError } from './errors.js';
import { dateToUnixSeconds, nowInUnixSeconds, unixSecondsToDate } from './utils/timestamp.js';

export class FeedModel {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  public create(feed: CreateFeedInput): Feed {
    const now = nowInUnixSeconds();
    const stmt = this.db.getDb().prepare(`
      INSERT INTO feeds (url, title, description, rating, last_updated_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        feed.url,
        feed.title,
        feed.description || null,
        feed.rating ?? 0,
        now,
        now
      );

      return {
        id: result.lastInsertRowid as number,
        ...feed,
        last_updated_at: unixSecondsToDate(now),
        created_at: unixSecondsToDate(now),
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

  private convertRowToFeed(row: unknown): Feed {
    const data = row as {
      id: number;
      url: string;
      title: string;
      description?: string;
      rating: number;
      last_updated_at: number;
      created_at: number;
    };

    return {
      id: data.id,
      url: data.url,
      title: data.title,
      description: data.description,
      rating: data.rating,
      last_updated_at: unixSecondsToDate(data.last_updated_at),
      created_at: unixSecondsToDate(data.created_at),
    };
  }

  public findById(id: number): Feed | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds WHERE id = ?
    `);

    const row = stmt.get(id);
    return row ? this.convertRowToFeed(row) : null;
  }

  public findByUrl(url: string): Feed | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds WHERE url = ?
    `);

    const row = stmt.get(url);
    return row ? this.convertRowToFeed(row) : null;
  }

  public findAll(): Feed[] {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM feeds ORDER BY rating DESC, created_at DESC
    `);

    const rows = stmt.all();
    return rows.map((row) => this.convertRowToFeed(row));
  }

  public update(id: number, updates: Partial<Feed>): Feed | null {
    const allowedFields = ['title', 'description', 'rating', 'last_updated_at'];
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    for (const field of allowedFields) {
      if (field in updates) {
        updateFields.push(`${field} = ?`);
        const value = updates[field as keyof Feed];
        if (value instanceof Date) {
          updateValues.push(dateToUnixSeconds(value));
        } else {
          updateValues.push(value);
        }
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
      SET last_updated_at = ?
      WHERE id = ?
    `);

    stmt.run(nowInUnixSeconds(), id);
  }

  public setRating(id: number, rating: number): boolean {
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }

    const stmt = this.db.getDb().prepare(`
      UPDATE feeds
      SET rating = ?
      WHERE id = ?
    `);

    const result = stmt.run(rating, id);
    return result.changes > 0;
  }
}
