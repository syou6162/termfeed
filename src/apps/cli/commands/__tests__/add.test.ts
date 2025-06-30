/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { createAddCommand } from '../add.js';
import { RSSCrawler } from '../../../../services/rss-crawler.js';
import { RSSFetchError } from '../../../../services/errors.js';

describe('add command', () => {
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

    // RSSCrawlerをモック
    crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');
  });

  afterEach(() => {
    context.cleanup();
    process.exit = originalExit;
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
      crawlSpy.mockResolvedValueOnce(mockData);

      // 環境変数を設定
      process.env.TERMFEED_DB = context.dbPath;

      // Act - コマンドを実行
      const command = createAddCommand();
      await command.parseAsync(['node', 'termfeed', testUrl]);

      // Assert - データベースの状態を確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].url).toBe(testUrl);
      expect(feeds[0].title).toBe('Example Feed');
      expect(feeds[0].description).toBe('Example feed description');

      const articles = context.articleModel.findAll();
      expect(articles).toHaveLength(2);
    });

    it('記事のないフィードも追加できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/empty-feed.rss';
      const mockData = createMockRSSData({
        title: 'Empty Feed',
        items: [], // 記事なし
        feedUrl: testUrl,
      });
      crawlSpy.mockResolvedValueOnce(mockData);
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createAddCommand();
      await command.parseAsync(['node', 'termfeed', testUrl]);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('Empty Feed');

      const articles = context.articleModel.findAll();
      expect(articles).toHaveLength(0);
    });

    it('descriptionがないフィードも追加できる', async () => {
      // Arrange
      const testUrl = 'https://example.com/no-desc-feed.rss';
      const mockData = createMockRSSData({
        title: 'No Description Feed',
        feedUrl: testUrl,
      });
      mockData.feed.description = undefined;
      crawlSpy.mockResolvedValueOnce(mockData);
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createAddCommand();
      await command.parseAsync(['node', 'termfeed', testUrl]);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
      expect(feeds[0].title).toBe('No Description Feed');
      expect(feeds[0].description).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('RSSフェッチエラー時にprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const testUrl = 'https://example.com/invalid-feed.rss';
      const fetchError = new RSSFetchError('Failed to fetch RSS feed', testUrl);
      crawlSpy.mockRejectedValueOnce(fetchError);
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createAddCommand();
      try {
        await command.parseAsync(['node', 'termfeed', testUrl]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);

      // データベースにフィードが追加されていないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });

    it('重複フィードエラー時にprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const testUrl = 'https://example.com/duplicate-feed.rss';
      const mockData = createMockRSSData({ feedUrl: testUrl });
      crawlSpy.mockResolvedValue(mockData);
      process.env.TERMFEED_DB = context.dbPath;

      // 最初にフィードを追加
      const command1 = createAddCommand();
      await command1.parseAsync(['node', 'termfeed', testUrl]);

      // Act - 重複追加を試行
      const command2 = createAddCommand();
      try {
        await command2.parseAsync(['node', 'termfeed', testUrl]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);

      // フィードは1つのままであることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
    });

    it('一般的なエラー時にprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const testUrl = 'https://example.com/generic-error-feed.rss';
      const genericError = new Error('Generic error occurred');
      crawlSpy.mockRejectedValueOnce(genericError);
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      const command = createAddCommand();
      try {
        await command.parseAsync(['node', 'termfeed', testUrl]);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);

      // データベースにフィードが追加されていないことを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });
  });

  describe('複数フィードの追加', () => {
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

      crawlSpy
        .mockResolvedValueOnce(mockData1)
        .mockResolvedValueOnce(mockData2)
        .mockResolvedValueOnce(mockData3);

      process.env.TERMFEED_DB = context.dbPath;

      // Act - 各URLに対して個別にコマンドを実行
      for (const url of testUrls) {
        const command = createAddCommand();
        await command.parseAsync(['node', 'termfeed', url]);
      }

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(3);
      expect(feeds.map((f) => f.title).sort()).toEqual(['Feed 1', 'Feed 2', 'Feed 3']);

      const articles = context.articleModel.findAll();
      expect(articles).toHaveLength(6); // 各フィード2記事 × 3フィード
    });
  });
});
