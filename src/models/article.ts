import { DatabaseManager } from './database';
import { Article, UpdateArticleInput } from './types';

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

  public create(article: CreateArticleInput): Article {
    const stmt = this.db.getDb().prepare(`
      INSERT INTO articles (
        feed_id, title, url, content, summary, author, 
        published_at, is_read, is_favorite, thumbnail_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `);

    const result = stmt.run(
      article.feed_id,
      article.title,
      article.url,
      article.content || null,
      article.summary || null,
      article.author || null,
      article.published_at.toISOString(),
      article.thumbnail_url || null
    );

    return {
      id: result.lastInsertRowid as number,
      ...article,
      is_read: false,
      is_favorite: false,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  public findById(id: number): Article | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM articles WHERE id = ?
    `);

    const row = stmt.get(id) as Article | undefined;
    if (row) {
      // 日付文字列をDateオブジェクトに変換
      row.published_at = new Date(row.published_at);
      if (row.created_at) row.created_at = new Date(row.created_at);
      if (row.updated_at) row.updated_at = new Date(row.updated_at);
      // SQLiteのBOOLEAN値を真偽値に変換
      row.is_read = Boolean(row.is_read);
      row.is_favorite = Boolean(row.is_favorite);
    }
    return row || null;
  }

  public findByUrl(url: string): Article | null {
    const stmt = this.db.getDb().prepare(`
      SELECT * FROM articles WHERE url = ?
    `);

    const row = stmt.get(url) as Article | undefined;
    if (row) {
      row.published_at = new Date(row.published_at);
      if (row.created_at) row.created_at = new Date(row.created_at);
      if (row.updated_at) row.updated_at = new Date(row.updated_at);
      row.is_read = Boolean(row.is_read);
      row.is_favorite = Boolean(row.is_favorite);
    }
    return row || null;
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
    const rows = stmt.all(...params) as Article[];

    // 日付とブール値の変換
    return rows.map((row) => ({
      ...row,
      published_at: new Date(row.published_at),
      created_at: row.created_at ? new Date(row.created_at) : undefined,
      updated_at: row.updated_at ? new Date(row.updated_at) : undefined,
      is_read: Boolean(row.is_read),
      is_favorite: Boolean(row.is_favorite),
    }));
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

    updateFields.push("updated_at = datetime('now')");
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

  public countByFeedId(feedId: number): number {
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
}
