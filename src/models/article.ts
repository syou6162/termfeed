import { DatabaseManager } from './database.js';
import { Article, UpdateArticleInput } from './types.js';
import { UniqueConstraintError, ForeignKeyConstraintError } from './errors.js';
import { dateToUnixSeconds, nowInUnixSeconds, unixSecondsToDate } from './utils/timestamp.js';

export type CreateArticleInput = {
  feed_id: number;
  title: string;
  url: string;
  content?: string;
  summary?: string;
  author?: string;
  published_at: Date;
  thumbnail_url?: string;
};

export type ArticleFilter = {
  feed_id?: number;
  is_read?: boolean;
  is_favorite?: boolean;
  limit?: number;
  offset?: number;
};

export class ArticleModel {
  private db: DatabaseManager;

  constructor(db: DatabaseManager) {
    this.db = db;
  }

  private convertRowToArticle(row: unknown): Article {
    const data = row as {
      id: number;
      feed_id: number;
      title: string;
      url: string;
      content?: string;
      summary?: string;
      author?: string;
      published_at: number;
      is_read: number;
      is_favorite: number;
      thumbnail_url?: string;
      created_at?: number;
      updated_at?: number;
    };

    return {
      id: data.id,
      feed_id: data.feed_id,
      title: data.title,
      url: data.url,
      content: data.content,
      summary: data.summary,
      author: data.author,
      published_at: unixSecondsToDate(data.published_at),
      is_read: Boolean(data.is_read),
      is_favorite: Boolean(data.is_favorite),
      thumbnail_url: data.thumbnail_url,
      created_at: data.created_at ? unixSecondsToDate(data.created_at) : undefined,
      updated_at: data.updated_at ? unixSecondsToDate(data.updated_at) : undefined,
    };
  }

  public create(article: CreateArticleInput): Article {
    const now = nowInUnixSeconds();
    const stmt = this.db.getDb().prepare(`
      INSERT INTO articles (
        feed_id, title, url, content, summary, author, 
        published_at, is_read, is_favorite, thumbnail_url, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        article.feed_id,
        article.title,
        article.url,
        article.content || null,
        article.summary || null,
        article.author || null,
        dateToUnixSeconds(article.published_at),
        article.thumbnail_url || null,
        now,
        now
      );

      return {
        id: result.lastInsertRowid as number,
        ...article,
        is_read: false,
        is_favorite: false,
        created_at: unixSecondsToDate(now),
        updated_at: unixSecondsToDate(now),
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('UNIQUE constraint failed: articles.url')) {
          throw new UniqueConstraintError('URL', article.url);
        }
        if (error.message.includes('FOREIGN KEY constraint failed')) {
          throw new ForeignKeyConstraintError('feed_id', article.feed_id);
        }
      }
      throw error;
    }
  }

  public findById(id: number): Article | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM articles WHERE id = ?
    `);

    const row = stmt.get(id);
    return row ? this.convertRowToArticle(row) : null;
  }

  public findByUrl(url: string): Article | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM articles WHERE url = ?
    `);

    const row = stmt.get(url);
    return row ? this.convertRowToArticle(row) : null;
  }

  public findAll(filter: ArticleFilter = {}): Article[] {
    let query = 'SELECT * FROM articles WHERE 1=1';
    const params: unknown[] = [];

    if (filter.feed_id !== undefined) {
      query += ' AND feed_id = ?';
      params.push(filter.feed_id);
    }

    if (filter.is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(filter.is_read ? 1 : 0);
    }

    if (filter.is_favorite !== undefined) {
      query += ' AND is_favorite = ?';
      params.push(filter.is_favorite ? 1 : 0);
    }

    query += ' ORDER BY published_at DESC';

    if (filter.limit !== undefined) {
      query += ' LIMIT ?';
      params.push(filter.limit);

      if (filter.offset !== undefined) {
        query += ' OFFSET ?';
        params.push(filter.offset);
      }
    }

    const stmt = this.db.getDb().prepare(query);
    const rows = stmt.all(...params);

    return rows.map((row) => this.convertRowToArticle(row));
  }

  public update(id: number, updates: UpdateArticleInput): Article | null {
    const updateFields: string[] = [];
    const updateValues: unknown[] = [];

    if (updates.is_read !== undefined) {
      updateFields.push('is_read = ?');
      updateValues.push(updates.is_read ? 1 : 0);
    }

    if (updates.is_favorite !== undefined) {
      updateFields.push('is_favorite = ?');
      updateValues.push(updates.is_favorite ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    updateFields.push('updated_at = ?');
    updateValues.push(nowInUnixSeconds());
    updateValues.push(id);

    const stmt = this.db.getDb().prepare(`
      UPDATE articles 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...updateValues);

    return this.findById(id);
  }

  public delete(id: number): boolean {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM articles WHERE id = ?
    `);

    const result = stmt.run(id);
    return result.changes > 0;
  }

  public deleteByFeedId(feedId: number): number {
    const stmt = this.db.getDb().prepare(`
      DELETE FROM articles WHERE feed_id = ?
    `);

    const result = stmt.run(feedId);
    return result.changes;
  }

  public markAsRead(id: number): boolean {
    const updated = this.update(id, { is_read: true });
    return updated !== null;
  }

  public markAsUnread(id: number): boolean {
    const updated = this.update(id, { is_read: false });
    return updated !== null;
  }

  public toggleFavorite(id: number): boolean {
    const article = this.findById(id);
    if (!article) return false;

    const updated = this.update(id, { is_favorite: !article.is_favorite });
    return updated !== null;
  }

  public countByFeedId(feedId?: number): number {
    if (feedId === undefined) {
      const stmt = this.db.getDb().prepare(`
        SELECT COUNT(*) as count FROM articles
      `);
      const result = stmt.get() as { count: number };
      return result.count;
    }

    const stmt = this.db.getDb().prepare(`
      SELECT COUNT(*) as count FROM articles WHERE feed_id = ?
    `);

    const result = stmt.get(feedId) as { count: number };
    return result.count;
  }

  public countUnread(feedId?: number): number {
    let query = 'SELECT COUNT(*) as count FROM articles WHERE is_read = 0';
    const params: unknown[] = [];

    if (feedId !== undefined) {
      query += ' AND feed_id = ?';
      params.push(feedId);
    }

    const stmt = this.db.getDb().prepare(query);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  public getUnreadCountsByFeedIds(): { [feedId: number]: number } {
    const query = `
      SELECT feed_id, COUNT(*) as unread_count 
      FROM articles 
      WHERE is_read = 0 
      GROUP BY feed_id
    `;

    const stmt = this.db.getDb().prepare(query);
    const results = stmt.all() as Array<{ feed_id: number; unread_count: number }>;

    const unreadCounts: { [feedId: number]: number } = {};
    for (const row of results) {
      unreadCounts[row.feed_id] = row.unread_count;
    }

    return unreadCounts;
  }
}
