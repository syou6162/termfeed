import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager, IN_MEMORY_DB } from './database.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;
  const testDbPath = path.join(os.tmpdir(), 'test-termfeed.db');

  beforeEach(() => {
    // テスト用の一時的なデータベースを使用
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    dbManager.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create database instance', () => {
    expect(dbManager).toBeDefined();
    expect(dbManager.getDb()).toBeDefined();
  });

  it('should run migration successfully', () => {
    expect(() => dbManager.migrate()).not.toThrow();

    // テーブルが作成されたことを確認
    const tables = dbManager
      .getDb()
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('feeds', 'articles')"
      )
      .all();

    expect(tables).toHaveLength(2);
    expect(tables.map((t) => (t as { name: string }).name)).toContain('feeds');
    expect(tables.map((t) => (t as { name: string }).name)).toContain('articles');
  });

  it('should have correct default values for boolean fields', () => {
    dbManager.migrate();

    // フィードを挿入
    const now = Math.floor(Date.now() / 1000);
    const insertFeed = dbManager
      .getDb()
      .prepare('INSERT INTO feeds (url, title, last_updated_at, created_at) VALUES (?, ?, ?, ?)');
    const feedInfo = insertFeed.run('https://example.com/rss', 'Test Feed', now, now);

    // 記事を挿入（is_read, is_favoriteを指定しない）
    const insertArticle = dbManager
      .getDb()
      .prepare(
        'INSERT INTO articles (feed_id, title, url, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      );
    insertArticle.run(
      feedInfo.lastInsertRowid,
      'Test Article',
      'https://example.com/article',
      now,
      now,
      now
    );

    // デフォルト値を確認
    const article = dbManager
      .getDb()
      .prepare('SELECT is_read, is_favorite FROM articles WHERE id = 1')
      .get() as { is_read: number; is_favorite: number };

    expect(article.is_read).toBe(0); // SQLiteでは FALSE は 0 として保存される
    expect(article.is_favorite).toBe(0);
  });
});

describe('DatabaseManager - in-memory database', () => {
  it('should support in-memory database', () => {
    const db = new DatabaseManager(IN_MEMORY_DB);

    expect(db.isInMemory()).toBe(true);
    expect(() => db.migrate()).not.toThrow();

    // データの読み書きが可能か確認
    const insertStmt = db.getDb().prepare(`
      INSERT INTO feeds (url, title, created_at, last_updated_at)
      VALUES (?, ?, ?, ?)
    `);

    const now = Math.floor(Date.now() / 1000);
    insertStmt.run('https://example.com/feed', 'Test Feed', now, now);

    const feed = db
      .getDb()
      .prepare('SELECT * FROM feeds WHERE url = ?')
      .get('https://example.com/feed') as { title: string };
    expect(feed.title).toBe('Test Feed');

    db.close();
  });

  it('should not create files for in-memory database', () => {
    const db = new DatabaseManager(IN_MEMORY_DB);
    db.migrate();

    // インメモリDBはファイルを作成しない
    expect(fs.existsSync(IN_MEMORY_DB)).toBe(false);
    expect(fs.existsSync(`${IN_MEMORY_DB}-wal`)).toBe(false);
    expect(fs.existsSync(`${IN_MEMORY_DB}-shm`)).toBe(false);

    db.close();
  });

  it('should report correctly for file-based database', () => {
    const tempDbPath = path.join(os.tmpdir(), 'test-not-memory.db');
    const db = new DatabaseManager(tempDbPath);

    expect(db.isInMemory()).toBe(false);

    db.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });
});
