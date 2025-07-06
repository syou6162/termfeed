#!/usr/bin/env tsx
import { DatabaseManager } from '../database.js';
import path from 'path';
import os from 'os';

const getDatabasePath = (): string => {
  // 環境変数が設定されていればそれを使用
  const envPath = process.env.TERMFEED_DB;
  if (envPath) {
    return envPath;
  }

  // XDG Base Directory準拠のパスを生成
  const xdgDataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(xdgDataHome, 'termfeed', 'termfeed.db');
};

function migrateToFavoritesTable() {
  console.log('Starting favorites migration...');

  const dbPath = getDatabasePath();
  console.log(`Database path: ${dbPath}`);

  const db = new DatabaseManager(dbPath);
  const database = db.getDb();

  try {
    // 外部キー制約を一時的に無効化
    database.prepare('PRAGMA foreign_keys = OFF').run();

    // トランザクション開始
    database.prepare('BEGIN TRANSACTION').run();

    // 1. favoritesテーブルが存在しない場合は作成
    console.log('Creating favorites table if not exists...');
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
    console.log('Migrating existing favorite articles...');
    const favoriteArticles = database
      .prepare(
        `
      SELECT id, created_at FROM articles WHERE is_favorite = 1
    `
      )
      .all() as Array<{ id: number; created_at: number }>;

    console.log(`Found ${favoriteArticles.length} favorite articles to migrate`);

    const insertFavorite = database.prepare(`
      INSERT OR IGNORE INTO favorites (article_id, created_at) VALUES (?, ?)
    `);

    for (const article of favoriteArticles) {
      // お気に入りにした時間として記事の作成時間を使用
      const result = insertFavorite.run(article.id, article.created_at);
      console.log(`  - Inserted article ${article.id}: ${result.changes} changes`);
    }

    // 3. 新しいarticlesテーブルを作成（is_favoriteカラムなし）
    console.log('Creating new articles table without is_favorite column...');
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
    console.log('Copying data to new articles table...');
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
    console.log('Renaming tables...');
    database.prepare('DROP TABLE articles').run();
    database.prepare('ALTER TABLE articles_new RENAME TO articles').run();

    // 6. インデックスを再作成（is_favoriteインデックスは除外）
    console.log('Recreating indexes...');
    database.prepare('CREATE INDEX IF NOT EXISTS idx_articles_feed_id ON articles(feed_id)').run();
    database
      .prepare(
        'CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC)'
      )
      .run();
    database.prepare('CREATE INDEX IF NOT EXISTS idx_articles_is_read ON articles(is_read)').run();

    // コミット
    database.prepare('COMMIT').run();

    // 外部キー制約を再度有効化
    database.prepare('PRAGMA foreign_keys = ON').run();

    console.log('Migration completed successfully!');

    // 統計情報を表示
    const totalArticles = database.prepare('SELECT COUNT(*) as count FROM articles').get() as {
      count: number;
    };
    const totalFavorites = database.prepare('SELECT COUNT(*) as count FROM favorites').get() as {
      count: number;
    };

    console.log(`\nMigration summary:`);
    console.log(`- Total articles: ${totalArticles.count}`);
    console.log(`- Total favorites migrated: ${totalFavorites.count}`);
  } catch (error) {
    // エラーが発生したらロールバック
    console.error('Migration failed:', error);
    try {
      database.prepare('ROLLBACK').run();
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }
    process.exit(1);
  } finally {
    db.close();
  }
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateToFavoritesTable();
}
