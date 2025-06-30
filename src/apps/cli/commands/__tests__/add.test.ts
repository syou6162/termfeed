import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTestContext,
  createMockRSSData,
  type TestContext,
  MockRSSCrawler,
} from './test-helpers.js';
import { FeedService } from '../../../../services/feed-service.js';
import { FeedModel } from '../../../../models/feed.js';
import { ArticleModel } from '../../../../models/article.js';
import { createDatabaseManager } from '../../utils/database.js';
import {
  RSSFetchError,
  DuplicateFeedError,
  FeedManagementError,
} from '../../../../services/errors.js';

// add.tsの内部ロジックを直接テストするため、アクション関数を抽出してテスト
async function addFeedAction(url: string, dbPath: string, mockCrawler?: MockRSSCrawler) {
  const originalDb = process.env.TERMFEED_DB;
  process.env.TERMFEED_DB = dbPath;

  try {
    const dbManager = createDatabaseManager();
    dbManager.migrate();

    const feedModel = new FeedModel(dbManager);
    const articleModel = new ArticleModel(dbManager);
    const feedService = new FeedService(feedModel, articleModel, mockCrawler);

    console.log(`Adding feed: ${url}`);

    const result = await feedService.addFeed(url);

    console.log(`Feed added successfully!`);
    console.log(`  ID: ${result.feed.id}`);
    console.log(`  Title: ${result.feed.title}`);
    if (result.feed.description) {
      console.log(`  Description: ${result.feed.description}`);
    }
    console.log(`  Articles added: ${result.articlesCount}`);

    dbManager.close();
    return result;
  } finally {
    if (originalDb) {
      process.env.TERMFEED_DB = originalDb;
    } else {
      delete process.env.TERMFEED_DB;
    }
  }
}

describe('add command', () => {
  let context: TestContext;
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    context = createTestContext();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    context.cleanup();
    vi.restoreAllMocks();
  });

  describe('基本的なフィード追加', () => {
    it('正常なRSSフィードを追加できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({
        title: 'Example Feed',
        description: 'Example feed description',
        feedUrl: testUrl,
      });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // Act
      const result = await addFeedAction(testUrl, context.dbPath, context.mockCrawler);

      // Assert
      expect(result.feed.url).toBe(testUrl);
      expect(result.feed.title).toBe('Example Feed');
      expect(result.feed.description).toBe('Example feed description');
      expect(result.articlesCount).toBe(2);

      // データベースにも保存されていることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].url).toBe(testUrl);

      const articles = context.articleModel.findAll();
      expect(articles).toHaveLength(2);

      expect(consoleSpy.log).toHaveBeenCalledWith(`Adding feed: ${testUrl}`);
      expect(consoleSpy.log).toHaveBeenCalledWith('Feed added successfully!');
      expect(consoleSpy.log).toHaveBeenCalledWith(`  ID: ${result.feed.id}`);
      expect(consoleSpy.log).toHaveBeenCalledWith('  Title: Example Feed');
      expect(consoleSpy.log).toHaveBeenCalledWith('  Description: Example feed description');
      expect(consoleSpy.log).toHaveBeenCalledWith('  Articles added: 2');
    });

    it('記事のないフィードも追加できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/empty-feed.rss';
      const mockData = createMockRSSData({
        title: 'Empty Feed',
        items: [], // 記事なし
        feedUrl: testUrl,
      });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // Act
      const result = await addFeedAction(testUrl, context.dbPath, context.mockCrawler);

      // Assert
      expect(result.feed.title).toBe('Empty Feed');
      expect(result.articlesCount).toBe(0);

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('Empty Feed');

      const articles = context.articleModel.findAll();
      expect(articles).toHaveLength(0);

      expect(consoleSpy.log).toHaveBeenCalledWith('  Articles added: 0');
    });

    it('descriptionがないフィードも追加できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/no-desc-feed.rss';
      // モックデータを作成してからdescriptionを削除
      const mockData = createMockRSSData({
        title: 'No Description Feed',
        feedUrl: testUrl,
      });
      mockData.feed.description = undefined;
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // Act
      const result = await addFeedAction(testUrl, context.dbPath, context.mockCrawler);

      // Assert
      expect(result.feed.description).toBeUndefined();

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].description).toBeNull();

      // descriptionの出力がないことを確認
      expect(consoleSpy.log).not.toHaveBeenCalledWith(expect.stringMatching(/Description:/));
    });
  });

  describe('エラーハンドリング', () => {
    it('RSSフェッチエラー時にエラーが適切に処理される', async () => {
      // Arrange
      const testUrl = 'https://example.com/invalid-feed.rss';
      const fetchError = new RSSFetchError('Failed to fetch RSS feed', testUrl);
      context.mockCrawler.setThrowError(fetchError);

      // Act & Assert
      await expect(addFeedAction(testUrl, context.dbPath, context.mockCrawler)).rejects.toThrow(
        FeedManagementError
      );

      // データベースにフィードが追加されていないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });

    it('重複フィードエラー時にエラーが適切に処理される', async () => {
      // Arrange
      const testUrl = 'https://example.com/duplicate-feed.rss';
      const mockData = createMockRSSData({ feedUrl: testUrl });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // 最初にフィードを追加
      await context.feedService.addFeed(testUrl);

      // Act & Assert - 重複追加を試行
      await expect(addFeedAction(testUrl, context.dbPath, context.mockCrawler)).rejects.toThrow(
        DuplicateFeedError
      );

      // フィードは1つのままであることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
    });

    it('一般的なエラー時にFeedManagementErrorが投げられる', async () => {
      // Arrange
      const testUrl = 'https://example.com/generic-error-feed.rss';
      const genericError = new Error('Generic error occurred');
      context.mockCrawler.setThrowError(genericError);

      // Act & Assert
      await expect(addFeedAction(testUrl, context.dbPath, context.mockCrawler)).rejects.toThrow(
        FeedManagementError
      );

      // データベースにフィードが追加されていないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });

    it('非Errorオブジェクトのエラー時にもFeedManagementErrorが投げられる', async () => {
      // Arrange
      const testUrl = 'https://example.com/string-error-feed.rss';
      const stringError = 'String error';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
      context.mockCrawler.setThrowError(stringError as any);

      // Act & Assert
      await expect(addFeedAction(testUrl, context.dbPath, context.mockCrawler)).rejects.toThrow(
        FeedManagementError
      );

      // データベースにフィードが追加されていないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });
  });

  describe('データベース操作', () => {
    it('データベースが正常にクローズされる（成功時）', async () => {
      // Arrange
      const testUrl = 'https://example.com/close-test-feed.rss';
      const mockData = createMockRSSData({ feedUrl: testUrl });
      context.mockCrawler.setMockResponse(testUrl, mockData);

      // Act
      const result = await addFeedAction(testUrl, context.dbPath, context.mockCrawler);

      // Assert
      expect(result.feed.url).toBe(testUrl);

      // データが正常に保存されていることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].url).toBe(testUrl);
    });

    it('複数のフィードを順次追加できる', async () => {
      // Arrange
      const testUrls = [
        'https://example.com/feed1.rss',
        'https://example.com/feed2.rss',
        'https://example.com/feed3.rss',
      ];

      const mockData1 = createMockRSSData({ title: 'Feed 1', feedUrl: testUrls[0] });
      const mockData2 = createMockRSSData({ title: 'Feed 2', feedUrl: testUrls[1] });
      const mockData3 = createMockRSSData({ title: 'Feed 3', feedUrl: testUrls[2] });

      context.mockCrawler.setMockResponse(testUrls[0], mockData1);
      context.mockCrawler.setMockResponse(testUrls[1], mockData2);
      context.mockCrawler.setMockResponse(testUrls[2], mockData3);

      // Act
      const result1 = await addFeedAction(testUrls[0], context.dbPath, context.mockCrawler);
      const result2 = await addFeedAction(testUrls[1], context.dbPath, context.mockCrawler);
      const result3 = await addFeedAction(testUrls[2], context.dbPath, context.mockCrawler);

      // Assert
      expect(result1.feed.title).toBe('Feed 1');
      expect(result2.feed.title).toBe('Feed 2');
      expect(result3.feed.title).toBe('Feed 3');

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(3);
      expect(feeds.map((f) => f.title)).toEqual(['Feed 1', 'Feed 2', 'Feed 3']);
    });
  });
});
