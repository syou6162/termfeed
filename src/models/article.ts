import { DatabaseManager } from './database.js';
import type { Article, UpdateArticleInput } from '@/types';
import { UniqueConstraintError, ForeignKeyConstraintError } from './errors.js';
import { dateToUnixSeconds, nowInUnixSeconds, unixSecondsToDate } from './utils/timestamp.js';

export type CreateArticleInput = {
  feed_id: number;
  title: string;
  url: string;
  content?: string;
  author?: string;
  published_at: Date;
  thumbnail_url?: string;
};

export type ArticleFilter = {
  feed_id?: number;
  is_read?: boolean;
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
      author?: string;
      published_at: number;
      is_read: number;
      thumbnail_url?: string;
      created_at: number;
      updated_at: number;
    };

    return {
      id: data.id,
      feed_id: data.feed_id,
      title: data.title,
      url: data.url,
      content: data.content,
      author: data.author,
      published_at: unixSecondsToDate(data.published_at),
      is_read: Boolean(data.is_read),
      thumbnail_url: data.thumbnail_url,
      created_at: unixSecondsToDate(data.created_at),
      updated_at: unixSecondsToDate(data.updated_at),
    };
  }

  public create(article: CreateArticleInput): Article {
    const now = nowInUnixSeconds();
    const stmt = this.db.getDb().prepare(`
      INSERT INTO articles (
        feed_id, title, url, content, author, 
        published_at, is_read, thumbnail_url, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `);

    try {
      const result = stmt.run(
        article.feed_id,
        article.title,
        article.url,
        article.content || null,
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

  public findAllWithPinStatus(filter: ArticleFilter = {}): (Article & { is_pinned: boolean })[] {
    let query = `
      SELECT 
        a.*,
        CASE WHEN p.article_id IS NOT NULL THEN 1 ELSE 0 END as is_pinned
      FROM articles a
      LEFT JOIN pins p ON a.id = p.article_id
    `;
    const params: unknown[] = [];

    query += ' WHERE 1=1';

    if (filter.feed_id !== undefined) {
      query += ' AND feed_id = ?';
      params.push(filter.feed_id);
    }

    if (filter.is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(filter.is_read ? 1 : 0);
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

    return rows.map((row) => {
      const article = this.convertRowToArticle(row);
      const data = row as { is_pinned: number };
      const isPinned = Boolean(data.is_pinned);
      return { ...article, is_pinned: isPinned };
    });
  }

  public getPinnedArticles(): Article[] {
    const query = `
      SELECT 
        a.*
      FROM articles a
      INNER JOIN pins p ON a.id = p.article_id
      ORDER BY p.created_at DESC
    `;

    const stmt = this.db.getDb().prepare(query);
    const rows = stmt.all();

    return rows.map((row) => this.convertRowToArticle(row));
  }

  public getFavoriteArticles(
    options: {
      feed_id?: number;
      is_read?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Article[] {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (options.feed_id !== undefined) {
      conditions.push('a.feed_id = ?');
      params.push(options.feed_id);
    }

    if (options.is_read !== undefined) {
      conditions.push('a.is_read = ?');
      params.push(options.is_read ? 1 : 0);
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(' AND ')}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

    const query = `
      SELECT 
        a.*
      FROM articles a
      INNER JOIN favorites f ON a.id = f.article_id
      WHERE 1=1 ${whereClause}
      ORDER BY f.created_at DESC
      ${limitClause}
      ${offsetClause}
    `;

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

  public count(feedId?: number): number {
    let query = 'SELECT COUNT(*) as count FROM articles';
    const params: unknown[] = [];

    if (feedId !== undefined) {
      query += ' WHERE feed_id = ?';
      params.push(feedId);
    }

    const stmt = this.db.getDb().prepare(query);
    const result = stmt.get(...params) as { count: number };
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

  /**
   * 複数の記事を一括で既読にする
   * @param feedId フィードID（指定した場合はそのフィードの記事のみ）
   * @returns 更新された記事数
   */
  public markAllAsRead(feedId?: number): number {
    let query = `
      UPDATE articles 
      SET is_read = 1, updated_at = ?
      WHERE is_read = 0
    `;
    const params: unknown[] = [nowInUnixSeconds()];

    if (feedId !== undefined) {
      query += ' AND feed_id = ?';
      params.push(feedId);
    }

    const stmt = this.db.getDb().prepare(query);
    const result = stmt.run(...params);
    return result.changes;
  }
}
