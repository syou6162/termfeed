import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../models/database.js';
import { FavoriteService } from './favorite.js';
import { ArticleModel } from '../models/article.js';
import { FeedModel } from '../models/feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('FavoriteService', () => {
  let db: DatabaseManager;
  let favoriteService: FavoriteService;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testArticleId: number;
  const testDbPath = path.join(__dirname, 'test-favorite-service.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    favoriteService = new FavoriteService(db);
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

  describe('addFavorite', () => {
    it('記事をお気に入りに追加できる', () => {
      const favorite = favoriteService.addFavorite(testArticleId);

      expect(favorite.article_id).toBe(testArticleId);
      expect(favorite.created_at).toBeInstanceOf(Date);
      expect(favoriteService.isFavorite(testArticleId)).toBe(true);
    });

    it('同じ記事を二重にお気に入りに追加しようとするとエラーになる', () => {
      favoriteService.addFavorite(testArticleId);

      expect(() => favoriteService.addFavorite(testArticleId)).toThrow();
    });
  });

  describe('removeFavorite', () => {
    it('お気に入りから削除できる', () => {
      favoriteService.addFavorite(testArticleId);

      const result = favoriteService.removeFavorite(testArticleId);
      expect(result).toBe(true);
      expect(favoriteService.isFavorite(testArticleId)).toBe(false);
    });

    it('お気に入りでない記事を削除しようとするとfalseを返す', () => {
      const result = favoriteService.removeFavorite(testArticleId);
      expect(result).toBe(false);
    });
  });

  describe('isFavorite', () => {
    it('お気に入りの記事はtrueを返す', () => {
      favoriteService.addFavorite(testArticleId);
      expect(favoriteService.isFavorite(testArticleId)).toBe(true);
    });

    it('お気に入りでない記事はfalseを返す', () => {
      expect(favoriteService.isFavorite(testArticleId)).toBe(false);
    });

    it('存在しない記事IDでもfalseを返す', () => {
      expect(favoriteService.isFavorite(999)).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('お気に入り状態をトグルできる', () => {
      // お気に入りにする
      let result = favoriteService.toggleFavorite(testArticleId);
      expect(result).toBe(true);
      expect(favoriteService.isFavorite(testArticleId)).toBe(true);

      // お気に入りを解除する
      result = favoriteService.toggleFavorite(testArticleId);
      expect(result).toBe(false);
      expect(favoriteService.isFavorite(testArticleId)).toBe(false);
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

      favoriteService.addFavorite(testArticleId);
      favoriteService.addFavorite(article2.id);

      const ids = favoriteService.getFavoriteArticleIds();
      expect(ids).toHaveLength(2);
      expect(ids).toContain(testArticleId);
      expect(ids).toContain(article2.id);
    });

    it('お気に入りがない場合は空配列を返す', () => {
      const ids = favoriteService.getFavoriteArticleIds();
      expect(ids).toEqual([]);
    });
  });

  describe('getFavoriteCount', () => {
    it('お気に入り数を取得できる', () => {
      expect(favoriteService.getFavoriteCount()).toBe(0);

      favoriteService.addFavorite(testArticleId);
      expect(favoriteService.getFavoriteCount()).toBe(1);

      // 追加の記事を作成
      const article2 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date(),
      });
      favoriteService.addFavorite(article2.id);
      expect(favoriteService.getFavoriteCount()).toBe(2);
    });
  });

  describe('clearAllFavorites', () => {
    it('すべてのお気に入りをクリアできる', () => {
      // 追加の記事を作成
      const article2 = articleModel.create({
        feed_id: feedModel.findAll()[0].id,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date(),
      });

      favoriteService.addFavorite(testArticleId);
      favoriteService.addFavorite(article2.id);

      const deletedCount = favoriteService.clearAllFavorites();
      expect(deletedCount).toBe(2);
      expect(favoriteService.getFavoriteCount()).toBe(0);
    });

    it('お気に入りがない場合は0を返す', () => {
      const deletedCount = favoriteService.clearAllFavorites();
      expect(deletedCount).toBe(0);
    });
  });
});
