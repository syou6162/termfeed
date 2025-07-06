import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './database.js';
import { FavoriteModel } from './favorite.js';
import { ArticleModel } from './article.js';
import { FeedModel } from './feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('FavoriteModel', () => {
  let db: DatabaseManager;
  let favoriteModel: FavoriteModel;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testArticleId: number;
  const testDbPath = path.join(__dirname, 'test-favorite.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    favoriteModel = new FavoriteModel(db);
    articleModel = new ArticleModel(db);
    feedModel = new FeedModel(db);

    // テスト用のフィードと記事を作成
    const feed = feedModel.create({
      url: 'https://example.com/test-feed.xml',
      title: 'Test Feed',
      rating: 0,
    });

    const article = articleModel.create({
      feed_id: feed.id,
      title: 'Test Article',
      url: 'https://example.com/article/1',
      published_at: new Date(),
    });
    testArticleId = article.id;
  });

  afterEach(() => {
    // テスト用データベースをクリーンアップ
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // WALファイルも削除
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });

  describe('create', () => {
    it('新しいお気に入りを作成できる', () => {
      const favorite = favoriteModel.create(testArticleId);

      expect(favorite.id).toBeDefined();
      expect(favorite.article_id).toBe(testArticleId);
      expect(favorite.created_at).toBeInstanceOf(Date);
    });

    it('同じ記事IDで二重に作成しようとするとエラーになる', () => {
      favoriteModel.create(testArticleId);

      // UNIQUE制約違反でエラーになることを確認
      expect(() => favoriteModel.create(testArticleId)).toThrow();
    });

    it('存在しない記事IDで作成しようとするとエラーになる', () => {
      // 外部キー制約違反でエラーになることを確認
      expect(() => favoriteModel.create(999)).toThrow();
    });
  });

  describe('findByArticleId', () => {
    it('記事IDでお気に入りを取得できる', () => {
      const created = favoriteModel.create(testArticleId);
      const found = favoriteModel.findByArticleId(testArticleId);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.article_id).toBe(testArticleId);
      expect(found!.created_at).toEqual(created.created_at);
    });

    it('存在しないお気に入りの場合はnullを返す', () => {
      const found = favoriteModel.findByArticleId(testArticleId);
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('お気に入りを削除できる', () => {
      favoriteModel.create(testArticleId);

      const deleted = favoriteModel.delete(testArticleId);
      expect(deleted).toBe(true);

      const found = favoriteModel.findByArticleId(testArticleId);
      expect(found).toBeNull();
    });

    it('存在しないお気に入りの場合はfalseを返す', () => {
      const deleted = favoriteModel.delete(testArticleId);
      expect(deleted).toBe(false);
    });
  });

  describe('isFavorite', () => {
    it('お気に入りが存在する場合はtrueを返す', () => {
      favoriteModel.create(testArticleId);
      expect(favoriteModel.isFavorite(testArticleId)).toBe(true);
    });

    it('お気に入りが存在しない場合はfalseを返す', () => {
      expect(favoriteModel.isFavorite(testArticleId)).toBe(false);
    });
  });

  describe('getFavoriteArticleIds', () => {
    it('お気に入り記事のIDリストを取得できる', () => {
      // 追加の記事を作成
      const article2 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date(),
      });
      const article3 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 3',
        url: 'https://example.com/article/3',
        published_at: new Date(),
      });

      // 時間をずらしてお気に入りを作成
      favoriteModel.create(testArticleId);
      favoriteModel.create(article2.id);
      favoriteModel.create(article3.id);

      const ids = favoriteModel.getFavoriteArticleIds();
      expect(ids).toHaveLength(3);
      // 作成日時の降順でソートされているので、IDの配列に含まれていることだけ確認
      expect(ids).toContain(testArticleId);
      expect(ids).toContain(article2.id);
      expect(ids).toContain(article3.id);
    });

    it('お気に入りがない場合は空配列を返す', () => {
      const ids = favoriteModel.getFavoriteArticleIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getFavoriteCount', () => {
    it('お気に入り数を取得できる', () => {
      expect(favoriteModel.getFavoriteCount()).toBe(0);

      favoriteModel.create(testArticleId);
      expect(favoriteModel.getFavoriteCount()).toBe(1);

      // 追加の記事を作成してお気に入りに追加
      const article2 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date(),
      });
      favoriteModel.create(article2.id);
      expect(favoriteModel.getFavoriteCount()).toBe(2);
    });
  });

  describe('clearAllFavorites', () => {
    it('すべてのお気に入りをクリアできる', () => {
      // 複数の記事をお気に入りに追加
      const article2 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date(),
      });
      const article3 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 3',
        url: 'https://example.com/article/3',
        published_at: new Date(),
      });

      favoriteModel.create(testArticleId);
      favoriteModel.create(article2.id);
      favoriteModel.create(article3.id);

      const deletedCount = favoriteModel.clearAllFavorites();
      expect(deletedCount).toBe(3);
      expect(favoriteModel.getFavoriteCount()).toBe(0);
    });

    it('お気に入りがない場合は0を返す', () => {
      const deletedCount = favoriteModel.clearAllFavorites();
      expect(deletedCount).toBe(0);
    });
  });

  describe('外部キー制約', () => {
    it('記事が削除されたらお気に入りも自動的に削除される', () => {
      favoriteModel.create(testArticleId);
      expect(favoriteModel.isFavorite(testArticleId)).toBe(true);

      // 記事を削除
      articleModel.delete(testArticleId);

      // お気に入りも削除されているはず
      expect(favoriteModel.isFavorite(testArticleId)).toBe(false);
    });
  });
});
