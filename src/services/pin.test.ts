import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../models/database.js';
import { PinService } from './pin.js';
import { ArticleModel } from '../models/article.js';
import { FeedModel } from '../models/feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('PinService', () => {
  let db: DatabaseManager;
  let pinService: PinService;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testFeedId: number;
  let testArticleId1: number;
  let testArticleId2: number;
  const testDbPath = path.join(__dirname, 'test-pin-service.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    pinService = new PinService(db);
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
    const article1 = articleModel.create({
      feed_id: testFeedId,
      title: 'Test Article 1',
      url: 'https://example.com/article/1',
      published_at: new Date('2024-01-01'),
    });
    testArticleId1 = article1.id!;

    const article2 = articleModel.create({
      feed_id: testFeedId,
      title: 'Test Article 2',
      url: 'https://example.com/article/2',
      published_at: new Date('2024-01-02'),
    });
    testArticleId2 = article2.id!;
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

  describe('togglePin', () => {
    it('ピンが立っていない記事にピンを立てるとtrueを返す', () => {
      const result = pinService.togglePin(testArticleId1);

      expect(result).toBe(true);
      expect(pinService.getPinCount()).toBe(1);
    });

    it('ピンが立っている記事のピンを外すとfalseを返す', () => {
      // まずピンを立てる
      pinService.togglePin(testArticleId1);

      // ピンを外す
      const result = pinService.togglePin(testArticleId1);

      expect(result).toBe(false);
      expect(pinService.getPinCount()).toBe(0);
    });

    it('複数の記事に独立してピンを立てられる', () => {
      const result1 = pinService.togglePin(testArticleId1);
      const result2 = pinService.togglePin(testArticleId2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
      expect(pinService.getPinCount()).toBe(2);
    });

    it('同じ記事に複数回ピンを立てようとしても重複しない', () => {
      // 最初のピン
      const result1 = pinService.togglePin(testArticleId1);
      expect(result1).toBe(true);
      expect(pinService.getPinCount()).toBe(1);

      // 同じ記事に再度ピンを立てようとする（実際はトグルなので外れる）
      const result2 = pinService.togglePin(testArticleId1);
      expect(result2).toBe(false);
      expect(pinService.getPinCount()).toBe(0);

      // もう一度ピンを立てる
      const result3 = pinService.togglePin(testArticleId1);
      expect(result3).toBe(true);
      expect(pinService.getPinCount()).toBe(1);

      // ピンされた記事を確認
      const pinnedArticles = pinService.getPinnedArticles();
      expect(pinnedArticles).toHaveLength(1);
      expect(pinnedArticles[0].id).toBe(testArticleId1);
    });
  });

  describe('getPinnedArticles', () => {
    it('ピン留めされた記事を取得できる', async () => {
      // article1にピンを立てる
      pinService.togglePin(testArticleId1);

      // 1秒待ってからarticle2にピンを立てる（タイムスタンプをずらす）
      await new Promise((resolve) => setTimeout(resolve, 1100));
      pinService.togglePin(testArticleId2);

      const pinnedArticles = pinService.getPinnedArticles();

      expect(pinnedArticles).toHaveLength(2);
      // ピンの作成日時の降順でソートされている（新しい方が先）
      expect(pinnedArticles[0].id).toBe(testArticleId2);
      expect(pinnedArticles[1].id).toBe(testArticleId1);
    });

    it('ピンがない場合は空配列を返す', () => {
      const pinnedArticles = pinService.getPinnedArticles();

      expect(pinnedArticles).toEqual([]);
    });
  });

  describe('getPinCount', () => {
    it('ピン数を正しく取得できる', () => {
      expect(pinService.getPinCount()).toBe(0);

      pinService.togglePin(testArticleId1);
      expect(pinService.getPinCount()).toBe(1);

      pinService.togglePin(testArticleId2);
      expect(pinService.getPinCount()).toBe(2);

      // ピンを外す
      pinService.togglePin(testArticleId1);
      expect(pinService.getPinCount()).toBe(1);
    });
  });

  describe('setPin', () => {
    it('ピンが立っていない記事にピンを立てられる', () => {
      expect(pinService.getPinCount()).toBe(0);

      pinService.setPin(testArticleId1);

      expect(pinService.getPinCount()).toBe(1);
      expect(pinService.getPinnedArticles()).toHaveLength(1);
      expect(pinService.getPinnedArticles()[0].id).toBe(testArticleId1);
    });

    it('既にピンが立っている記事にsetPinしても重複しない', () => {
      pinService.togglePin(testArticleId1); // 先にピンを立てる
      expect(pinService.getPinCount()).toBe(1);

      pinService.setPin(testArticleId1); // 再度setPin

      expect(pinService.getPinCount()).toBe(1); // 変わらず
    });
  });

  describe('unsetPin', () => {
    it('ピンが立っている記事のピンを外せる', () => {
      pinService.togglePin(testArticleId1); // 先にピンを立てる
      expect(pinService.getPinCount()).toBe(1);

      pinService.unsetPin(testArticleId1);

      expect(pinService.getPinCount()).toBe(0);
    });

    it('ピンが立っていない記事にunsetPinしても何も起こらない', () => {
      expect(pinService.getPinCount()).toBe(0);

      pinService.unsetPin(testArticleId1);

      expect(pinService.getPinCount()).toBe(0); // 変わらず
    });
  });

  describe('clearAllPins', () => {
    it('すべてのピンをクリアできる', () => {
      // 複数のピンを立てる
      pinService.togglePin(testArticleId1);
      pinService.togglePin(testArticleId2);
      expect(pinService.getPinCount()).toBe(2);

      // すべてクリア
      pinService.clearAllPins();

      expect(pinService.getPinCount()).toBe(0);
      expect(pinService.getPinnedArticles()).toEqual([]);
    });

    it('ピンがない状態でクリアしてもエラーにならない', () => {
      expect(() => pinService.clearAllPins()).not.toThrow();
      expect(pinService.getPinCount()).toBe(0);
    });
  });
});
