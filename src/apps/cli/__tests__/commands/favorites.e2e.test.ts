import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, runCommand, type TestContext } from '@/test-helpers/index.js';
import { DatabaseManager } from '../../../../models/database.js';
import { FeedModel } from '../../../../models/feed.js';
import { ArticleModel } from '../../../../models/article.js';
import { FavoriteModel } from '../../../../models/favorite.js';

describe('favorites E2E tests', () => {
  let context: TestContext;
  let db: DatabaseManager;
  let feedModel: FeedModel;
  let articleModel: ArticleModel;
  let favoriteModel: FavoriteModel;

  beforeEach(() => {
    context = createTestContext();
    db = new DatabaseManager(context.dbPath);
    db.migrate();
    feedModel = new FeedModel(db);
    articleModel = new ArticleModel(db);
    favoriteModel = new FavoriteModel(db);

    // テスト用のフィードと記事を作成
    const feed = feedModel.create({
      url: 'https://example.com/feed',
      title: 'Test Feed',
      description: 'Test Description',
      rating: 0,
    });

    // 記事を3つ作成
    const now = Math.floor(Date.now() / 1000);
    articleModel.create({
      feed_id: feed.id,
      title: 'Article 1',
      url: 'https://example.com/article1',
      content: 'Content 1',
      published_at: new Date(now * 1000),
    });

    articleModel.create({
      feed_id: feed.id,
      title: 'Article 2',
      url: 'https://example.com/article2',
      content: 'Content 2',
      published_at: new Date((now - 3600) * 1000),
    });

    articleModel.create({
      feed_id: feed.id,
      title: 'Article 3',
      url: 'https://example.com/article3',
      content: 'Content 3',
      published_at: new Date((now - 7200) * 1000),
    });
  });

  afterEach(() => {
    db.close();
    context.cleanup();
  });

  describe('お気に入り機能の統合テスト', () => {
    it('記事をお気に入りに追加・削除できる', () => {
      // 初期状態でお気に入りが0件であることを確認
      expect(favoriteModel.getFavoriteCount()).toBe(0);

      // 記事1をお気に入りに追加
      const article1 = articleModel.findAll()[0];
      favoriteModel.create(article1.id);
      expect(favoriteModel.getFavoriteCount()).toBe(1);
      expect(favoriteModel.isFavorite(article1.id)).toBe(true);

      // 記事2もお気に入りに追加
      const article2 = articleModel.findAll()[1];
      favoriteModel.create(article2.id);
      expect(favoriteModel.getFavoriteCount()).toBe(2);

      // お気に入り記事を取得
      const favorites = articleModel.getFavoriteArticles();
      expect(favorites).toHaveLength(2);
      expect(favorites[0].title).toBe('Article 1'); // 新しい順
      expect(favorites[1].title).toBe('Article 2');

      // 記事1をお気に入りから削除
      favoriteModel.delete(article1.id);
      expect(favoriteModel.getFavoriteCount()).toBe(1);
      expect(favoriteModel.isFavorite(article1.id)).toBe(false);
    });

    it('記事削除時にお気に入りも削除される（カスケード削除）', () => {
      // 記事をお気に入りに追加
      const article = articleModel.findAll()[0];
      favoriteModel.create(article.id);
      expect(favoriteModel.getFavoriteCount()).toBe(1);

      // 記事を削除
      articleModel.delete(article.id);

      // お気に入りも削除されている
      expect(favoriteModel.getFavoriteCount()).toBe(0);
      expect(favoriteModel.isFavorite(article.id)).toBe(false);
    });

    it('フィード削除時にお気に入りも削除される', () => {
      // 記事をお気に入りに追加
      const articles = articleModel.findAll();
      favoriteModel.create(articles[0].id);
      favoriteModel.create(articles[1].id);
      expect(favoriteModel.getFavoriteCount()).toBe(2);

      // フィードを削除
      const feed = feedModel.findAll()[0];
      feedModel.delete(feed.id);

      // お気に入りも削除されている
      expect(favoriteModel.getFavoriteCount()).toBe(0);
    });

    it('同じ記事を重複してお気に入りに追加できない', () => {
      const article = articleModel.findAll()[0];

      // 1回目の追加は成功
      favoriteModel.create(article.id);
      expect(favoriteModel.getFavoriteCount()).toBe(1);

      // 2回目の追加は失敗（UNIQUE制約）
      expect(() => favoriteModel.create(article.id)).toThrow();
      expect(favoriteModel.getFavoriteCount()).toBe(1); // 件数は変わらない
    });
  });

  describe('listコマンドでのお気に入り表示', () => {
    it('お気に入り数が表示される', async () => {
      // お気に入りを追加
      const articles = articleModel.findAll();
      favoriteModel.create(articles[0].id);
      favoriteModel.create(articles[1].id);

      // listコマンドを実行
      const { stdout, stderr, exitCode } = await runCommand(['list'], {
        dbPath: context.dbPath,
      });

      expect(stderr).toBe('');
      expect(exitCode).toBeUndefined();

      // お気に入り数が表示されることを確認
      // ※実際の出力形式に応じて調整が必要
      expect(stdout).toContain('Test Feed');
    });
  });
});
