/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { createRmCommand } from '../rm.js';
import { RSSCrawler } from '../../../../services/rss-crawler.js';

describe('rm command', () => {
  let context: TestContext;
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let crawlSpy: any;

  beforeEach(() => {
    context = createTestContext();

    // process.exitをモック
    exitCode = undefined;
    originalExit = process.exit;
    process.exit = vi.fn((code?: number) => {
      exitCode = code;
      throw new Error(`Process exited with code ${code}`);
    }) as never;

    // console出力をミュート
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // RSSCrawlerをモック（addFeedのため）
    crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');
  });

  afterEach(() => {
    context.cleanup();
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  describe('基本的なフィード削除', () => {
    it('存在するフィードを削除できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/feed-to-delete.rss';
      const mockData = createMockRSSData({ title: 'Feed to Delete', feedUrl: testUrl });
      crawlSpy.mockResolvedValueOnce(mockData);

      // フィードを追加
      const addResult = await context.feedService.addFeed(testUrl);
      const feedId = addResult.feed.id;

      // 記事が存在することを確認
      const articlesBefore = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesBefore).toHaveLength(2); // mockDataには2つの記事がある

      process.env.TERMFEED_DB = context.dbPath;

      // Act - コマンドを実行
      const command = createRmCommand();
      await command.parseAsync(['node', 'termfeed', feedId.toString()]);

      // Assert
      // フィードが削除されていることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);

      // 関連する記事も削除されていることを確認
      const articlesAfter = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesAfter).toHaveLength(0);
    });

    it('複数のフィードから特定のフィードのみを削除できる', async () => {
      // Arrange
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
        crawlSpy.mockResolvedValueOnce(mockData);
        const result = await context.feedService.addFeed(urls[i]);
        feedIds.push(result.feed.id);
        totalArticlesAdded += result.articlesCount;
      }

      // 削除前の記事数を確認
      const articlesBeforeRemoval = context.articleModel.findAll();
      expect(articlesBeforeRemoval).toHaveLength(totalArticlesAdded);

      process.env.TERMFEED_DB = context.dbPath;

      // Act - 2番目のフィードを削除
      const targetId = feedIds[1];
      const command = createRmCommand();
      await command.parseAsync(['node', 'termfeed', targetId.toString()]);

      // Assert
      const remainingFeeds = context.feedModel.findAll();
      expect(remainingFeeds).toHaveLength(2);
      const remainingTitles = remainingFeeds.map((f) => f.title).sort();
      expect(remainingTitles).toEqual(['Feed 1', 'Feed 3']);

      // 削除されたフィードの記事も削除されていることを確認
      const deletedFeedArticles = context.articleModel.findAll({ feed_id: targetId });
      expect(deletedFeedArticles).toHaveLength(0);

      // 他のフィードの記事は残っていることを確認
      const allArticles = context.articleModel.findAll();
      expect(allArticles).toHaveLength(4); // 2フィード×2記事

      const feed1Articles = allArticles.filter((a) => a.feed_id === feedIds[0]);
      const feed3Articles = allArticles.filter((a) => a.feed_id === feedIds[2]);
      expect(feed1Articles).toHaveLength(2);
      expect(feed3Articles).toHaveLength(2);
    });
  });

  describe('エラーハンドリング', () => {
    it('存在しないフィードIDでprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const nonExistentId = 999;
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      try {
        await command.parseAsync(['node', 'termfeed', nonExistentId.toString()]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);

      // フィードが存在しないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });

    it('無効なフィードID（負の数）でprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const invalidId = '-1';
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      try {
        await command.parseAsync(['node', 'termfeed', invalidId]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });

    it('無効なフィードID（ゼロ）でprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const invalidId = '0';
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      try {
        await command.parseAsync(['node', 'termfeed', invalidId]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });

    it('無効なフィードID（文字列）でprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const invalidId = 'abc';
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      try {
        await command.parseAsync(['node', 'termfeed', invalidId]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });

    it('無効なフィードID（小数）でprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const invalidId = '1.5';
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      try {
        await command.parseAsync(['node', 'termfeed', invalidId]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
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
      crawlSpy.mockResolvedValueOnce(mockData);

      // フィードを追加
      const addResult = await context.feedService.addFeed(testUrl);
      const feedId = addResult.feed.id;

      // 記事が追加されていることを確認
      const articlesBefore = context.articleModel.findAll({ feed_id: feedId });
      expect(articlesBefore).toHaveLength(50);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createRmCommand();
      await command.parseAsync(['node', 'termfeed', feedId.toString()]);

      // Assert
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
      crawlSpy.mockResolvedValueOnce(mockData1);

      const result1 = await context.feedService.addFeed(url1);
      const feedId1 = result1.feed.id;

      process.env.TERMFEED_DB = context.dbPath;

      // Act - フィードを削除
      const command = createRmCommand();
      await command.parseAsync(['node', 'termfeed', feedId1.toString()]);

      // Assert - 削除後も新しいフィードを追加できることを確認
      const url2 = 'https://example.com/feed2.rss';
      const mockData2 = createMockRSSData({ title: 'Feed 2', feedUrl: url2 });
      crawlSpy.mockResolvedValueOnce(mockData2);

      const result2 = await context.feedService.addFeed(url2);
      expect(result2.feed.title).toBe('Feed 2');

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('Feed 2');
    });
  });
});
