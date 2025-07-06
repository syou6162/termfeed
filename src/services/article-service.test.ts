import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from '../models/database.js';
import { ArticleService } from './article-service.js';
import { PinService } from './pin.js';
import { FavoriteService } from './favorite.js';
import { ArticleModel } from '../models/article.js';
import { FeedModel } from '../models/feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ArticleService', () => {
  let db: DatabaseManager;
  let articleService: ArticleService;
  let pinService: PinService;
  let favoriteService: FavoriteService;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testFeedId: number;
  let testArticleId1: number;
  let testArticleId2: number;
  const testDbPath = path.join(__dirname, 'test-article-service.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    articleModel = new ArticleModel(db);
    pinService = new PinService(db);
    favoriteService = new FavoriteService(db);
    articleService = new ArticleService(articleModel, pinService, favoriteService);
    feedModel = new FeedModel(db);

    // テスト用のフィードを作成
    const feed = feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test Feed',
      description: 'Test Description',
      rating: 0,
    });
    testFeedId = feed.id;

    // テスト用の記事を作成
    const article1 = articleModel.create({
      feed_id: testFeedId,
      title: 'Test Article 1',
      url: 'https://example.com/article1',
      published_at: new Date(),
    });
    testArticleId1 = article1.id;

    const article2 = articleModel.create({
      feed_id: testFeedId,
      title: 'Test Article 2',
      url: 'https://example.com/article2',
      published_at: new Date(),
    });
    testArticleId2 = article2.id;
  });

  afterEach(() => {
    // テスト用のデータベースファイルを削除
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('getArticles', () => {
    it('すべての記事を取得できる', () => {
      const articles = articleService.getArticles();
      expect(articles).toHaveLength(2);
      expect(articles[0].title).toBe('Test Article 1');
      expect(articles[1].title).toBe('Test Article 2');
    });

    it('フィードIDでフィルタできる', () => {
      const articles = articleService.getArticles({ feedId: testFeedId });
      expect(articles).toHaveLength(2);
    });

    it('既読状態でフィルタできる', () => {
      // 1つの記事を既読にする
      articleService.markAsRead(testArticleId1);

      const unreadArticles = articleService.getArticles({ isRead: false });
      const readArticles = articleService.getArticles({ isRead: true });

      expect(unreadArticles).toHaveLength(1);
      expect(readArticles).toHaveLength(1);
      expect(readArticles[0].id).toBe(testArticleId1);
    });

    it('お気に入り状態でフィルタできる', () => {
      // 1つの記事をお気に入りにする
      articleService.toggleFavorite(testArticleId1);

      const favoriteArticles = articleService.getArticles({ isFavorite: true });
      const nonFavoriteArticles = articleService.getArticles({ isFavorite: false });

      expect(favoriteArticles).toHaveLength(1);
      expect(nonFavoriteArticles).toHaveLength(1);
      expect(favoriteArticles[0].id).toBe(testArticleId1);
    });
  });

  describe('getArticleById', () => {
    it('IDで記事を取得できる', () => {
      const article = articleService.getArticleById(testArticleId1);
      expect(article).not.toBeNull();
      expect(article!.id).toBe(testArticleId1);
      expect(article!.title).toBe('Test Article 1');
    });

    it('存在しないIDの場合はnullを返す', () => {
      const article = articleService.getArticleById(99999);
      expect(article).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('記事を既読にできる', () => {
      const success = articleService.markAsRead(testArticleId1);
      expect(success).toBe(true);

      const article = articleService.getArticleById(testArticleId1);
      expect(article!.is_read).toBe(true);
    });

    it('存在しない記事の場合はfalseを返す', () => {
      const success = articleService.markAsRead(99999);
      expect(success).toBe(false);
    });
  });

  describe('markAsUnread', () => {
    it('記事を未読にできる', () => {
      // まず既読にする
      articleService.markAsRead(testArticleId1);
      let article = articleService.getArticleById(testArticleId1);
      expect(article!.is_read).toBe(true);

      // 未読に戻す
      const success = articleService.markAsUnread(testArticleId1);
      expect(success).toBe(true);

      article = articleService.getArticleById(testArticleId1);
      expect(article!.is_read).toBe(false);
    });

    it('存在しない記事の場合はfalseを返す', () => {
      const success = articleService.markAsUnread(99999);
      expect(success).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('お気に入り状態をトグルできる', () => {
      // お気に入りにする
      let isFavorite = articleService.toggleFavorite(testArticleId1);
      expect(isFavorite).toBe(true);

      // お気に入り状態の確認はFavoriteServiceで行う
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);

      // お気に入りを解除する
      isFavorite = articleService.toggleFavorite(testArticleId1);
      expect(isFavorite).toBe(false);

      // お気に入り状態の確認はFavoriteServiceで行う
      expect(favoriteService.isFavorite(testArticleId1)).toBe(false);
    });

    it('存在しない記事の場合はfalseを返す', () => {
      const isFavorite = articleService.toggleFavorite(99999);
      expect(isFavorite).toBe(false);
    });
  });

  describe('toggleFavoriteWithPin', () => {
    it('お気に入りに設定すると同時にピンも立てる', () => {
      // 初期状態の確認
      expect(favoriteService.isFavorite(testArticleId1)).toBe(false);
      expect(pinService.getPinCount()).toBe(0);

      // お気に入り + ピンを設定
      const isFavorite = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite).toBe(true);

      // お気に入り状態の確認
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);

      // ピンも立っていることを確認
      expect(pinService.getPinCount()).toBe(1);
      const pinnedArticles = pinService.getPinnedArticles();
      expect(pinnedArticles).toHaveLength(1);
      expect(pinnedArticles[0].id).toBe(testArticleId1);
    });

    it('お気に入りを解除すると同時にピンも外れる', () => {
      // まずお気に入り + ピンを設定
      articleService.toggleFavoriteWithPin(testArticleId1);
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);
      expect(pinService.getPinCount()).toBe(1);

      // お気に入り + ピンを解除
      const isFavorite = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite).toBe(false);

      // お気に入り状態の確認
      expect(favoriteService.isFavorite(testArticleId1)).toBe(false);

      // ピンも外れていることを確認
      expect(pinService.getPinCount()).toBe(0);
    });

    it('既にピンが立っている記事をお気に入りにしてもピンは維持される', () => {
      // 先にピンだけを立てる（pキー相当）
      pinService.togglePin(testArticleId1);
      expect(pinService.getPinCount()).toBe(1);
      expect(favoriteService.isFavorite(testArticleId1)).toBe(false);

      // お気に入りにする（fキー相当）
      const isFavorite = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite).toBe(true);

      // お気に入りになり、ピンも維持される
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);
      expect(pinService.getPinCount()).toBe(1);
    });

    it('お気に入りでピンが立っている記事を解除するとピンも外れる', () => {
      // お気に入り + ピンを設定
      articleService.toggleFavoriteWithPin(testArticleId1);
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);
      expect(pinService.getPinCount()).toBe(1);

      // お気に入りを解除
      const isFavorite = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite).toBe(false);

      // ピンも外れる
      expect(pinService.getPinCount()).toBe(0);
    });

    it('複数の記事で独立して動作する', () => {
      // 記事1をお気に入り + ピン
      let isFavorite1 = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite1).toBe(true);

      // 記事2をお気に入り + ピン
      let isFavorite2 = articleService.toggleFavoriteWithPin(testArticleId2);
      expect(isFavorite2).toBe(true);

      // 両方の記事がお気に入りでピンが立っている
      expect(favoriteService.isFavorite(testArticleId1)).toBe(true);
      expect(favoriteService.isFavorite(testArticleId2)).toBe(true);
      expect(pinService.getPinCount()).toBe(2);

      // 記事1のお気に入りを解除
      isFavorite1 = articleService.toggleFavoriteWithPin(testArticleId1);
      expect(isFavorite1).toBe(false);

      // 記事1のお気に入りとピンが外れ、記事2は維持される
      expect(favoriteService.isFavorite(testArticleId1)).toBe(false);
      expect(favoriteService.isFavorite(testArticleId2)).toBe(true);
      expect(pinService.getPinCount()).toBe(1);
    });

    it('存在しない記事の場合はfalseを返し、ピンにも影響しない', () => {
      const initialPinCount = pinService.getPinCount();

      const isFavorite = articleService.toggleFavoriteWithPin(99999);
      expect(isFavorite).toBe(false);

      // ピン数に変化がない
      expect(pinService.getPinCount()).toBe(initialPinCount);
    });
  });

  describe('getUnreadCount', () => {
    it('未読記事数を取得できる', () => {
      expect(articleService.getUnreadCount()).toBe(2);

      // 1つを既読にする
      articleService.markAsRead(testArticleId1);
      expect(articleService.getUnreadCount()).toBe(1);
    });

    it('フィードIDを指定して未読記事数を取得できる', () => {
      const count = articleService.getUnreadCount(testFeedId);
      expect(count).toBe(2);
    });
  });

  describe('getTotalCount', () => {
    it('総記事数を取得できる', () => {
      expect(articleService.getTotalCount()).toBe(2);
    });

    it('フィードIDを指定して総記事数を取得できる', () => {
      const count = articleService.getTotalCount(testFeedId);
      expect(count).toBe(2);
    });
  });
});
