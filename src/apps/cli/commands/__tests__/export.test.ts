/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { exportCommand } from '../export.js';
import { RSSCrawler } from '../../../../services/rss-crawler.js';

// fs.writeFileをモック
vi.mock('fs/promises');

describe('export command', () => {
  let context: TestContext;
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let writeFileSpy: any;
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

    writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();

    // RSSCrawlerをモック（フィード追加のため）
    crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');
  });

  afterEach(() => {
    context.cleanup();
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  describe('基本的なエクスポート機能', () => {
    it('フィードをOPML形式でエクスポートできる', async () => {
      // Arrange - 3つのフィードを追加
      const feeds = [
        { url: 'https://example.com/feed1.rss', title: 'Feed 1' },
        { url: 'https://example.com/feed2.rss', title: 'Feed 2' },
        { url: 'https://example.com/feed3.rss', title: 'Feed 3' },
      ];

      for (const feed of feeds) {
        const mockData = createMockRSSData({ title: feed.title, feedUrl: feed.url });
        crawlSpy.mockResolvedValueOnce(mockData);
        await context.feedService.addFeed(feed.url);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act - コマンドを実行
      await exportCommand.parseAsync(['node', 'termfeed', 'feeds.opml']);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/feeds\.opml$/),
        expect.stringContaining('<?xml version="1.0" encoding="UTF-8"?>'),
        'utf-8'
      );

      // エクスポートされた内容を検証
      const content = writeFileSpy.mock.calls[0][1] as string;
      expect(content).toContain('<opml version="2.0">');
      feeds.forEach((feed) => {
        expect(content).toContain(`xmlUrl="${feed.url}"`);
        expect(content).toContain(`text="${feed.title}"`);
      });
    });

    it('フィードをテキスト形式でエクスポートできる', async () => {
      // Arrange
      const feeds = [
        { url: 'https://example.com/feed1.rss', title: 'Feed 1' },
        { url: 'https://example.com/feed2.rss', title: 'Feed 2' },
      ];

      for (const feed of feeds) {
        const mockData = createMockRSSData({ title: feed.title, feedUrl: feed.url });
        crawlSpy.mockResolvedValueOnce(mockData);
        await context.feedService.addFeed(feed.url);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', 'feeds.txt', '--format', 'text']);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/feeds\.txt$/),
        'https://example.com/feed1.rss\nhttps://example.com/feed2.rss',
        'utf-8'
      );
    });

    it('デフォルトファイル名でエクスポートできる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed']);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/subscriptions\.opml$/),
        expect.any(String),
        'utf-8'
      );
    });

    it('拡張子から自動的に形式を判定できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      process.env.TERMFEED_DB = context.dbPath;

      // Act - .txt拡張子
      await exportCommand.parseAsync(['node', 'termfeed', 'output.txt']);

      // Assert
      const content = writeFileSpy.mock.calls[0][1] as string;
      expect(content).not.toContain('<?xml');
      expect(content).toBe(feedUrl);

      // Act - .opml拡張子
      writeFileSpy.mockClear();
      await exportCommand.parseAsync(['node', 'termfeed', 'output.opml']);

      // Assert
      const opmlContent = writeFileSpy.mock.calls[0][1] as string;
      expect(opmlContent).toContain('<?xml');
      expect(opmlContent).toContain('<opml version="2.0">');
    });
  });

  describe('特殊文字とエスケープ処理', () => {
    it('OPML内の特殊文字が正しくエスケープされる', async () => {
      // Arrange
      const specialTitle = 'Feed & "News" <Latest> \'Updates\'';
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({
        title: specialTitle,
        feedUrl,
      });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', 'special.opml']);

      // Assert
      const content = writeFileSpy.mock.calls[0][1] as string;
      expect(content).toContain('Feed &amp; &quot;News&quot; &lt;Latest&gt; &apos;Updates&apos;');
      expect(content).not.toContain(specialTitle); // 元の文字列は含まれないはず
    });

    it('URLと同じタイトルのフィードをエクスポートできる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/sameasurl.rss';
      // フィードを直接作成（タイトルがURLと同じ）
      context.feedModel.create({
        url: feedUrl,
        title: feedUrl, // URLをタイトルとして使用
        description: undefined,
      });

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', 'sameasurl.opml']);

      // Assert
      const content = writeFileSpy.mock.calls[0][1] as string;
      expect(content).toContain(`text="${feedUrl}"`); // URLがタイトルとして使用される
      expect(content).toContain(`xmlUrl="${feedUrl}"`);
    });
  });

  describe('エラーハンドリング', () => {
    it('フィードがない場合は早期リターン（exitなし）', async () => {
      // Arrange
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed']);

      // Assert
      expect(writeFileSpy).not.toHaveBeenCalled();
      expect(exitCode).toBeUndefined(); // process.exitは呼ばれない
    });

    it('無効な形式を指定した場合はprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      try {
        await exportCommand.parseAsync(['node', 'termfeed', 'output.txt', '--format', 'invalid']);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
      expect(writeFileSpy).not.toHaveBeenCalled();
    });

    it('ファイル書き込みエラーが発生した場合はprocess.exitが1で呼ばれる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      // ファイル書き込みでエラーを発生させる
      writeFileSpy.mockRejectedValue(new Error('Permission denied'));

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      try {
        await exportCommand.parseAsync(['node', 'termfeed']);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });
  });

  describe('大量フィードのエクスポート', () => {
    it('100件のフィードを正常にエクスポートできる', async () => {
      // Arrange - 100件のフィードを追加
      const feedCount = 100;
      for (let i = 1; i <= feedCount; i++) {
        const feedUrl = `https://example.com/feed${i}.rss`;
        const mockData = createMockRSSData({
          title: `Feed ${i}`,
          feedUrl,
          items: [], // 記事は不要
        });
        crawlSpy.mockResolvedValueOnce(mockData);
        await context.feedService.addFeed(feedUrl);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', 'many-feeds.opml']);

      // Assert
      const content = writeFileSpy.mock.calls[0][1] as string;

      // すべてのフィードが含まれていることを確認
      for (let i = 1; i <= feedCount; i++) {
        expect(content).toContain(`https://example.com/feed${i}.rss`);
      }

      // outline要素の数を確認
      const outlineCount = (content.match(/<outline/g) || []).length;
      expect(outlineCount).toBe(feedCount);
    });
  });

  describe('フルパスと相対パスの処理', () => {
    it('相対パスを正しく解決できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', './exports/feeds.opml']);

      // Assert
      const filePath = writeFileSpy.mock.calls[0][0] as string;
      expect(filePath).toContain('exports');
      expect(filePath).toContain('feeds.opml');
      expect(path.isAbsolute(filePath)).toBe(true);
    });

    it('絶対パスもそのまま使用できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(feedUrl);

      const absolutePath = '/tmp/test-export.opml';
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await exportCommand.parseAsync(['node', 'termfeed', absolutePath]);

      // Assert
      expect(writeFileSpy).toHaveBeenCalledWith(absolutePath, expect.any(String), 'utf-8');
    });
  });
});
