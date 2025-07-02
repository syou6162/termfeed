import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './database.js';
import { PinModel } from './pin.js';
import { ArticleModel } from './article.js';
import { FeedModel } from './feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PinModel', () => {
  let db: DatabaseManager;
  let pinModel: PinModel;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testFeedId: number;
  let testArticleId: number;
  const testDbPath = path.join(__dirname, 'test-pin.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    pinModel = new PinModel(db);
    articleModel = new ArticleModel(db);
    feedModel = new FeedModel(db);

    // テスト用のフィードを作成
    const feed = feedModel.create({
      url: 'https://example.com/test-feed.xml',
      title: 'Test Feed',
      rating: 0,
    });
    testFeedId = feed.id!;

    // テスト用の記事を作成
    const article = articleModel.create({
      feed_id: testFeedId,
      title: 'Test Article',
      url: 'https://example.com/article/1',
      published_at: new Date('2024-01-01'),
    });
    testArticleId = article.id!;
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
    it('新しいピンを作成できる', () => {
      const pin = pinModel.create(testArticleId);

      expect(pin.id).toBeDefined();
      expect(pin.article_id).toBe(testArticleId);
      expect(pin.created_at).toBeInstanceOf(Date);
    });

    it('同じ記事に重複してピンを作成できない', () => {
      pinModel.create(testArticleId);

      expect(() => pinModel.create(testArticleId)).toThrow();
    });
  });

  describe('delete', () => {
    it('ピンを削除できる', () => {
      pinModel.create(testArticleId);

      const result = pinModel.delete(testArticleId);

      expect(result).toBe(true);
      expect(pinModel.findByArticleId(testArticleId)).toBeNull();
    });

    it('存在しないピンの削除はfalseを返す', () => {
      const result = pinModel.delete(testArticleId);

      expect(result).toBe(false);
    });
  });

  describe('findByArticleId', () => {
    it('記事IDでピンを取得できる', () => {
      const createdPin = pinModel.create(testArticleId);

      const foundPin = pinModel.findByArticleId(testArticleId);

      expect(foundPin).not.toBeNull();
      expect(foundPin!.id).toBe(createdPin.id);
      expect(foundPin!.article_id).toBe(testArticleId);
    });

    it('存在しないピンはnullを返す', () => {
      const foundPin = pinModel.findByArticleId(testArticleId);

      expect(foundPin).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべてのピンを取得できる', async () => {
      // 追加の記事を作成
      const article2 = articleModel.create({
        feed_id: testFeedId,
        title: 'Test Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      });

      const pin1 = pinModel.create(testArticleId);
      // 作成時刻が異なるように1秒待機（秒単位のタイムスタンプのため）
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const pin2 = pinModel.create(article2.id);

      const pins = pinModel.findAll();

      expect(pins).toHaveLength(2);
      // 作成日時の降順でソートされている（新しい方が先）
      // pin2（article2）が先、pin1（testArticle）が後
      expect(pins[0].id).toBe(pin2.id);
      expect(pins[1].id).toBe(pin1.id);
      expect(pins[0].article_id).toBe(article2.id);
      expect(pins[1].article_id).toBe(testArticleId);
    });

    it('ピンがない場合は空配列を返す', () => {
      const pins = pinModel.findAll();

      expect(pins).toEqual([]);
    });
  });

  describe('isPinned', () => {
    it('ピンが存在する場合はtrueを返す', () => {
      pinModel.create(testArticleId);

      const isPinned = pinModel.isPinned(testArticleId);

      expect(isPinned).toBe(true);
    });

    it('ピンが存在しない場合はfalseを返す', () => {
      const isPinned = pinModel.isPinned(testArticleId);

      expect(isPinned).toBe(false);
    });
  });

  describe('外部キー制約', () => {
    it('記事が削除されるとピンも自動的に削除される', () => {
      pinModel.create(testArticleId);

      // 記事を削除
      articleModel.delete(testArticleId);

      // ピンも削除されている
      expect(pinModel.findByArticleId(testArticleId)).toBeNull();
    });
  });
});
