import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../../database.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('migrate-favorites', () => {
  let testDbPath: string;
  let db: DatabaseManager;

  beforeEach(() => {
    // テスト用の一時データベースを作成
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'termfeed-migrate-test-'));
    testDbPath = path.join(tmpDir, 'test.db');
  });

  afterEach(() => {
    // データベースをクローズして削除
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // 一時ディレクトリも削除
    const dir = path.dirname(testDbPath);
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir);
    }
  });

  it('既存のお気に入り記事をfavoritesテーブルに移行する', () => {
    // 1. 古いスキーマでデータベースを作成
    db = new DatabaseManager(testDbPath);
    const database = db.getDb();

    // 古いarticlesテーブルを作成（is_favoriteカラムあり）
    database
      .prepare(
        `
      CREATE TABLE feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        rating INTEGER NOT NULL DEFAULT 0,
        last_updated_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `
      )
      .run();

    database
      .prepare(
        `
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        content TEXT,
        author TEXT,
        published_at INTEGER NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        thumbnail_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `
      )
      .run();

    // テストデータを挿入
    const now = Math.floor(Date.now() / 1000);
    database
      .prepare(
        `
      INSERT INTO feeds (url, title, description, created_at) 
      VALUES (?, ?, ?, ?)
    `
      )
      .run('https://example.com/feed', 'Test Feed', 'Test Description', now);

    // お気に入り記事と通常記事を挿入
    const articles = [
      {
        feed_id: 1,
        title: 'Favorite Article 1',
        url: 'https://example.com/article1',
        is_favorite: true,
      },
      {
        feed_id: 1,
        title: 'Regular Article',
        url: 'https://example.com/article2',
        is_favorite: false,
      },
      {
        feed_id: 1,
        title: 'Favorite Article 2',
        url: 'https://example.com/article3',
        is_favorite: true,
      },
    ];

    const insertArticle = database.prepare(
      `
      INSERT INTO articles (feed_id, title, url, content, author, published_at, is_read, is_favorite, created_at, updated_at)
      VALUES (?, ?, ?, '', 'Author', ?, 0, ?, ?, ?)
    `
    );

    articles.forEach((article) => {
      insertArticle.run(
        article.feed_id,
        article.title,
        article.url,
        now,
        article.is_favorite ? 1 : 0,
        now,
        now
      );
    });

    // 2. マイグレーションを実行
    migrateToFavoritesTable(database);

    // 3. 検証
    // favoritesテーブルが作成されているか
    const favoritesTable = database
      .prepare(
        `
      SELECT name FROM sqlite_master WHERE type='table' AND name='favorites'
    `
      )
      .get();
    expect(favoritesTable).toBeTruthy();

    // お気に入り記事がfavoritesテーブルに移行されているか
    const favorites = database
      .prepare(
        `
      SELECT f.*, a.title 
      FROM favorites f 
      JOIN articles a ON f.article_id = a.id
      ORDER BY f.article_id
    `
      )
      .all() as Array<{ article_id: number; title: string }>;

    expect(favorites).toHaveLength(2);
    expect(favorites[0].title).toBe('Favorite Article 1');
    expect(favorites[1].title).toBe('Favorite Article 2');

    // articlesテーブルからis_favoriteカラムが削除されているか
    const tableInfo = database.prepare(`PRAGMA table_info(articles)`).all() as Array<{
      name: string;
    }>;
    const hasFavoriteColumn = tableInfo.some((col) => col.name === 'is_favorite');
    expect(hasFavoriteColumn).toBe(false);

    // 全記事数が変わっていないか
    const totalArticles = database.prepare('SELECT COUNT(*) as count FROM articles').get() as {
      count: number;
    };
    expect(totalArticles.count).toBe(3);
  });

  it('favoritesテーブルが既に存在する場合も正常に動作する', () => {
    db = new DatabaseManager(testDbPath);
    const database = db.getDb();

    // テーブルを作成
    database
      .prepare(
        `
      CREATE TABLE feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        description TEXT,
        rating INTEGER NOT NULL DEFAULT 0,
        last_updated_at INTEGER,
        created_at INTEGER NOT NULL
      )
    `
      )
      .run();

    database
      .prepare(
        `
      CREATE TABLE articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        content TEXT,
        author TEXT,
        published_at INTEGER NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        thumbnail_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `
      )
      .run();

    // favoritesテーブルを事前に作成
    database
      .prepare(
        `
      CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      )
    `
      )
      .run();

    // マイグレーションを実行してもエラーにならないことを確認
    expect(() => migrateToFavoritesTable(database)).not.toThrow();
  });
});

// マイグレーション関数（テスト用に抽出）
function migrateToFavoritesTable(database: any) {
  // 外部キー制約を一時的に無効化
  database.prepare('PRAGMA foreign_keys = OFF').run();

  // トランザクション開始
  database.prepare('BEGIN TRANSACTION').run();

  try {
    // 1. favoritesテーブルが存在しない場合は作成
    database
      .prepare(
        `
      CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL UNIQUE,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
      )
    `
      )
      .run();

    // インデックスも作成
    database
      .prepare(
        `
      CREATE INDEX IF NOT EXISTS idx_favorites_article_id ON favorites(article_id)
    `
      )
      .run();

    database
      .prepare(
        `
      CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites(created_at DESC)
    `
      )
      .run();

    // 2. 既存のお気に入り記事をfavoritesテーブルに移行
    const favoriteArticles = database
      .prepare(
        `
      SELECT id, created_at FROM articles WHERE is_favorite = 1
    `
      )
      .all() as Array<{ id: number; created_at: number }>;

    const insertFavorite = database.prepare(`
      INSERT OR IGNORE INTO favorites (article_id, created_at) VALUES (?, ?)
    `);

    for (const article of favoriteArticles) {
      insertFavorite.run(article.id, article.created_at);
    }

    // 3. 新しいarticlesテーブルを作成（is_favoriteカラムなし）
    database
      .prepare(
        `
      CREATE TABLE articles_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feed_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL UNIQUE,
        content TEXT,
        author TEXT,
        published_at INTEGER NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        thumbnail_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
      )
    `
      )
      .run();

    // 4. データをコピー
    database
      .prepare(
        `
      INSERT INTO articles_new (
        id, feed_id, title, url, content, author, published_at, 
        is_read, thumbnail_url, created_at, updated_at
      )
      SELECT 
        id, feed_id, title, url, content, author, published_at,
        is_read, thumbnail_url, created_at, updated_at
      FROM articles
    `
      )
      .run();

    // 5. 古いテーブルを削除して新しいテーブルをリネーム
    database.prepare('DROP TABLE articles').run();
    database.prepare('ALTER TABLE articles_new RENAME TO articles').run();

    // 6. インデックスを再作成
    database.prepare('CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id)').run();
    database
      .prepare('CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)')
      .run();
    database.prepare('CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read)').run();

    // コミット
    database.prepare('COMMIT').run();

    // 外部キー制約を再度有効化
    database.prepare('PRAGMA foreign_keys = ON').run();
  } catch (error) {
    // エラーが発生したらロールバック
    database.prepare('ROLLBACK').run();
    throw error;
  }
}