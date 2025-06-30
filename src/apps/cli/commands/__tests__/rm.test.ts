import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { FeedService } from '../../../../services/feed-service.js';
import { FeedModel } from '../../../../models/feed.js';
import { ArticleModel } from '../../../../models/article.js';
import { createDatabaseManager } from '../../utils/database.js';
import { FeedNotFoundError } from '../../../../services/errors.js';

// rm.tsの内部ロジックを直接テストするため、アクション関数を抽出してテスト
// eslint-disable-next-line @typescript-eslint/require-await
async function removeFeedAction(feedId: string, dbPath: string) {
  const originalDb = process.env.TERMFEED_DB;
  process.env.TERMFEED_DB = dbPath;

  try {
    const dbManager = createDatabaseManager();

    // parsePositiveIntegerの実装を模倣
    const id = parseInt(feedId, 10);
    if (isNaN(id) || id <= 0) {
      throw new Error('Invalid feed ID');
    }

    const feedModel = new FeedModel(dbManager);
    const articleModel = new ArticleModel(dbManager);
    const feedService = new FeedService(feedModel, articleModel);

    const success = feedService.removeFeed(id);

    dbManager.close();
    return success;
  } finally {
    if (originalDb) {
      process.env.TERMFEED_DB = originalDb;
    } else {
      delete process.env.TERMFEED_DB;
    }
  }
}

describe('rm command', () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => {
    context.cleanup();
  });

  describe('基本的なフィード削除', () => {
    it('存在するフィードを削除できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/feed-to-delete.rss';
      const mockData = createMockRSSData({ title: 'Feed to Delete', feedUrl: testUrl });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // フィードを追加
      const addResult = await context.feedService.addFeed(testUrl);
      const feedId = addResult.feed.id;

      // 記事が存在することを確認
      const articlesBefore = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesBefore).toHaveLength(2); // mockDataには2つの記事がある

      // Act
      const success = await removeFeedAction(feedId.toString(), context.dbPath);

      // Assert
      expect(success).toBe(true);

      // フィードが削除されていることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);

      // 関連する記事も削除されていることを確認
      const articlesAfter = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesAfter).toHaveLength(0);
    });

    it('複数のフィードから特定のフィードのみを削除できる', async () => {
      // Arrange - 新しいコンテキストで開始（前のテストの影響を受けない）
      const newContext = createTestContext();

      const urls = [
        'https://example.com/multi-feed1.rss',
        'https://example.com/multi-feed2.rss',
        'https://example.com/multi-feed3.rss',
      ];

      // 3つのフィードを追加
      const feedIds: number[] = [];
      let totalArticlesAdded = 0;
      for (let i = 0; i < urls.length; i++) {
        const mockData = createMockRSSData({ title: `Feed ${i + 1}`, feedUrl: urls[i] });
        newContext.mockCrawler.setMockResponse(urls[i], mockData);
        const result = await newContext.feedService.addFeed(urls[i]);
        feedIds.push(result.feed.id);
        totalArticlesAdded += result.articlesCount;
      }

      // 削除前の記事数を確認
      const articlesBeforeRemoval = newContext.articleModel.findAll();
      expect(totalArticlesAdded).toBe(6); // 各フィードは2記事を追加すべき
      expect(articlesBeforeRemoval).toHaveLength(totalArticlesAdded);

      // Act - 2番目のフィードを削除（同じデータベースインスタンスを使用）
      const targetId = feedIds[1];
      const targetFeed = newContext.feedModel.findById(targetId);
      expect(targetFeed).not.toBeNull();

      // 削除を実行（removeFeedActionではなく、直接サービスを使用）
      const success = newContext.feedService.removeFeed(targetId);

      // Assert
      expect(success).toBe(true);

      const remainingFeeds = newContext.feedModel.findAll();
      expect(remainingFeeds).toHaveLength(2);
      const remainingTitles = remainingFeeds.map((f) => f.title).sort();
      expect(remainingTitles).toEqual(['Feed 1', 'Feed 3']);

      // 削除されたフィードの記事も削除されていることを確認
      const deletedFeedArticles = newContext.articleModel.findAll({ feed_id: targetId });
      expect(deletedFeedArticles).toHaveLength(0);

      // 他のフィードの記事は残っていることを確認
      const allArticles = newContext.articleModel.findAll();
      expect(allArticles).toHaveLength(4); // 2フィード×2記事

      const feed1Articles = allArticles.filter((a) => a.feed_id === feedIds[0]);
      const feed3Articles = allArticles.filter((a) => a.feed_id === feedIds[2]);
      expect(feed1Articles).toHaveLength(2);
      expect(feed3Articles).toHaveLength(2);

      // クリーンアップ
      newContext.cleanup();
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないフィードIDでエラーが発生する', async () => {
      // Arrange
      const nonExistentId = 999;

      // Act & Assert
      await expect(removeFeedAction(nonExistentId.toString(), context.dbPath)).rejects.toThrow(
        FeedNotFoundError
      );

      // フィードが存在しないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });

    it('無効なフィードID（負の数）でエラーが発生する', async () => {
      // Arrange
      const invalidId = '-1';

      // Act & Assert
      await expect(removeFeedAction(invalidId, context.dbPath)).rejects.toThrow('Invalid feed ID');
    });

    it('無効なフィードID（ゼロ）でエラーが発生する', async () => {
      // Arrange
      const invalidId = '0';

      // Act & Assert
      await expect(removeFeedAction(invalidId, context.dbPath)).rejects.toThrow('Invalid feed ID');
    });

    it('無効なフィードID（文字列）でエラーが発生する', async () => {
      // Arrange
      const invalidId = 'abc';

      // Act & Assert
      await expect(removeFeedAction(invalidId, context.dbPath)).rejects.toThrow('Invalid feed ID');
    });

    it('無効なフィードID（小数）でエラーが発生する', async () => {
      // Arrange
      const invalidId = '1.5';

      // Act & Assert
      // parseIntは小数点以下を切り捨てるため、1として処理される
      // しかしフィードが存在しないのでFeedNotFoundErrorが発生
      await expect(removeFeedAction(invalidId, context.dbPath)).rejects.toThrow(FeedNotFoundError);
    });
  });

  describe('データベース操作', () => {
    it('記事が多数あるフィードも正常に削除できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/large-feed.rss';
      const manyArticles = Array.from({ length: 50 }, (_, i) => ({
        title: `Article ${i + 1}`,
        link: `https://example.com/article${i + 1}`,
        content: `Content ${i + 1}`,
        pubDate: new Date(2023, 0, i + 1).toISOString(),
        guid: `article${i + 1}`,
      }));
      const mockData = createMockRSSData({
        title: 'Large Feed',
        items: manyArticles,
        feedUrl: testUrl,
      });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // フィードを追加
      const addResult = await context.feedService.addFeed(testUrl);
      const feedId = addResult.feed.id;

      // 記事が追加されていることを確認
      const articlesBefore = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesBefore).toHaveLength(50);

      // Act
      const success = await removeFeedAction(feedId.toString(), context.dbPath);

      // Assert
      expect(success).toBe(true);

      // すべての記事が削除されていることを確認
      const articlesAfter = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesAfter).toHaveLength(0);

      // 全体の記事数も0になっていることを確認
      const allArticles = context.articleModel.findAll();
      expect(allArticles).toHaveLength(0);
    });

    it('削除後もデータベースが正常に動作する', async () => {
      // Arrange
      const url1 = 'https://example.com/feed1.rss';
      const mockData1 = createMockRSSData({ title: 'Feed 1', feedUrl: url1 });
      context.mockCrawler.setMockResponse(url1, mockData1);

      const result1 = await context.feedService.addFeed(url1);
      const feedId1 = result1.feed.id;

      // Act - フィードを削除
      await removeFeedAction(feedId1.toString(), context.dbPath);

      // Assert - 削除後も新しいフィードを追加できることを確認
      const url2 = 'https://example.com/feed2.rss';
      const mockData2 = createMockRSSData({ title: 'Feed 2', feedUrl: url2 });
      context.mockCrawler.setMockResponse(url2, mockData2);

      const result2 = await context.feedService.addFeed(url2);
      expect(result2.feed.title).toBe('Feed 2');

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('Feed 2');
    });
  });
});
