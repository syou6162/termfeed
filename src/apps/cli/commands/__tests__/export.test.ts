import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { FeedModel } from '../../../../models/feed.js';
import { createDatabaseManager } from '../../utils/database.js';
import { OPMLService } from '../../../../services/opml.js';

// fs.writeFileをモック
vi.mock('fs/promises');

// export.tsの内部ロジックを直接テストするため、アクション関数を抽出してテスト
async function exportFeedsAction(
  dbPath: string,
  outputFile?: string,
  format?: string
): Promise<{ content: string; path: string; format: string }> {
  const originalDb = process.env.TERMFEED_DB;
  process.env.TERMFEED_DB = dbPath;

  try {
    const dbManager = createDatabaseManager();
    dbManager.migrate();

    const feedModel = new FeedModel(dbManager);

    // すべてのフィードを取得
    const feeds = feedModel.findAll();

    if (feeds.length === 0) {
      throw new Error('No feeds to export');
    }

    // ファイルパスの決定
    const outputPath = outputFile || 'subscriptions.opml';
    const absolutePath = path.resolve(outputPath);

    // 形式の決定
    let exportFormat: 'opml' | 'text';
    if (format === 'auto' || !format) {
      exportFormat = OPMLService.detectFormat(outputPath);
    } else if (format === 'opml' || format === 'text') {
      exportFormat = format;
    } else {
      throw new Error('Invalid format');
    }

    // 指定された形式でエクスポート
    let content: string;
    if (exportFormat === 'opml') {
      content = OPMLService.exportToOPML(feeds);
    } else {
      content = OPMLService.exportToText(feeds);
    }

    // ファイルに書き込み（テストではモック）
    await fs.writeFile(absolutePath, content, 'utf-8');

    dbManager.close();

    return {
      content,
      path: absolutePath,
      format: exportFormat,
    };
  } finally {
    if (originalDb) {
      process.env.TERMFEED_DB = originalDb;
    } else {
      delete process.env.TERMFEED_DB;
    }
  }
}

describe('export command', () => {
  let context: TestContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let writeFileSpy: any;

  beforeEach(() => {
    context = createTestContext();
    writeFileSpy = vi.spyOn(fs, 'writeFile').mockResolvedValue();
  });

  afterEach(() => {
    context.cleanup();
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
        context.mockCrawler.setMockResponse(feed.url, mockData);
        await context.feedService.addFeed(feed.url);
      }

      // Act
      const result = await exportFeedsAction(context.dbPath, 'feeds.opml');

      // Assert
      expect(result.format).toBe('opml');
      expect(result.path).toMatch(/feeds\.opml$/);
      expect(result.content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result.content).toContain('<opml version="2.0">');

      // 各フィードが含まれていることを確認
      feeds.forEach((feed) => {
        expect(result.content).toContain(`xmlUrl="${feed.url}"`);
        expect(result.content).toContain(`text="${feed.title}"`);
      });

      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/feeds\.opml$/),
        result.content,
        'utf-8'
      );
    });

    it('フィードをテキスト形式でエクスポートできる', async () => {
      // Arrange
      const feeds = [
        { url: 'https://example.com/feed1.rss', title: 'Feed 1' },
        { url: 'https://example.com/feed2.rss', title: 'Feed 2' },
      ];

      for (const feed of feeds) {
        const mockData = createMockRSSData({ title: feed.title, feedUrl: feed.url });
        context.mockCrawler.setMockResponse(feed.url, mockData);
        await context.feedService.addFeed(feed.url);
      }

      // Act
      const result = await exportFeedsAction(context.dbPath, 'feeds.txt', 'text');

      // Assert
      expect(result.format).toBe('text');
      expect(result.path).toMatch(/feeds\.txt$/);
      expect(result.content).toBe('https://example.com/feed1.rss\nhttps://example.com/feed2.rss');

      expect(writeFileSpy).toHaveBeenCalledWith(
        expect.stringMatching(/feeds\.txt$/),
        result.content,
        'utf-8'
      );
    });

    it('デフォルトファイル名でエクスポートできる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // Act
      const result = await exportFeedsAction(context.dbPath);

      // Assert
      expect(result.path).toMatch(/subscriptions\.opml$/);
      expect(result.format).toBe('opml');
    });

    it('拡張子から自動的に形式を判定できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // Act - .txt拡張子
      const resultTxt = await exportFeedsAction(context.dbPath, 'output.txt', 'auto');
      expect(resultTxt.format).toBe('text');

      // Act - .opml拡張子
      const resultOpml = await exportFeedsAction(context.dbPath, 'output.opml', 'auto');
      expect(resultOpml.format).toBe('opml');

      // Act - .xml拡張子
      const resultXml = await exportFeedsAction(context.dbPath, 'output.xml', 'auto');
      expect(resultXml.format).toBe('opml');
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
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // Act
      const result = await exportFeedsAction(context.dbPath, 'special.opml');

      // Assert
      expect(result.content).toContain(
        'Feed &amp; &quot;News&quot; &lt;Latest&gt; &apos;Updates&apos;'
      );
      expect(result.content).not.toContain(specialTitle); // 元の文字列は含まれないはず
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

      // Act
      const result = await exportFeedsAction(context.dbPath, 'sameasurl.opml');

      // Assert
      expect(result.content).toContain(`text="${feedUrl}"`); // URLがタイトルとして使用される
      expect(result.content).toContain(`xmlUrl="${feedUrl}"`);
    });
  });

  describe('エラーハンドリング', () => {
    it('フィードがない場合はエラーメッセージを表示', async () => {
      // Act & Assert
      await expect(exportFeedsAction(context.dbPath)).rejects.toThrow('No feeds to export');
    });

    it('無効な形式を指定した場合はエラー', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // Act & Assert
      await expect(exportFeedsAction(context.dbPath, 'output.txt', 'invalid')).rejects.toThrow(
        'Invalid format'
      );
    });

    it('ファイル書き込みエラーが発生した場合', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // ファイル書き込みでエラーを発生させる
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      writeFileSpy.mockRejectedValue(new Error('Permission denied'));

      // Act & Assert
      await expect(exportFeedsAction(context.dbPath)).rejects.toThrow('Permission denied');
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
        context.mockCrawler.setMockResponse(feedUrl, mockData);
        await context.feedService.addFeed(feedUrl);
      }

      // Act
      const result = await exportFeedsAction(context.dbPath, 'many-feeds.opml');

      // Assert
      expect(result.format).toBe('opml');

      // すべてのフィードが含まれていることを確認
      for (let i = 1; i <= feedCount; i++) {
        expect(result.content).toContain(`https://example.com/feed${i}.rss`);
      }

      // outline要素の数を確認
      const outlineCount = (result.content.match(/<outline/g) || []).length;
      expect(outlineCount).toBe(feedCount);
    });
  });

  describe('フルパスと相対パスの処理', () => {
    it('相対パスを正しく解決できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      // Act
      const result = await exportFeedsAction(context.dbPath, './exports/feeds.opml');

      // Assert
      expect(result.path).toContain('exports');
      expect(result.path).toContain('feeds.opml');
      expect(path.isAbsolute(result.path)).toBe(true);
    });

    it('絶対パスもそのまま使用できる', async () => {
      // Arrange
      const feedUrl = 'https://example.com/feed.rss';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);
      await context.feedService.addFeed(feedUrl);

      const absolutePath = '/tmp/test-export.opml';

      // Act
      const result = await exportFeedsAction(context.dbPath, absolutePath);

      // Assert
      expect(result.path).toBe(absolutePath);
    });
  });
});
