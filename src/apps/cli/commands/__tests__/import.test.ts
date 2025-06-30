/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { importCommand } from '../import.js';
import { RSSCrawler } from '../../../../services/rss-crawler.js';

// fs.readFileとfs.accessをモック
vi.mock('fs/promises');

describe('import command', () => {
  let context: TestContext;
  let originalExit: typeof process.exit;
  let exitCode: number | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let readFileSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accessSpy: any;
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

    readFileSpy = vi.spyOn(fs, 'readFile');
    accessSpy = vi.spyOn(fs, 'access');

    // RSSCrawlerをモック
    crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');
  });

  afterEach(() => {
    context.cleanup();
    process.exit = originalExit;
    vi.restoreAllMocks();
  });

  describe('基本的なインポート機能', () => {
    it('OPML形式のファイルから複数のフィードをインポートできる', async () => {
      // Arrange
      const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>My Subscriptions</title>
  </head>
  <body>
    <outline text="Feed 1" title="Feed 1" type="rss" xmlUrl="https://example.com/feed1.rss" htmlUrl="https://example.com"/>
    <outline text="Feed 2" title="Feed 2" type="rss" xmlUrl="https://example.com/feed2.rss" htmlUrl="https://example.com"/>
    <outline text="Feed 3" title="Feed 3" type="rss" xmlUrl="https://example.com/feed3.rss" htmlUrl="https://example.com"/>
  </body>
</opml>`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(opmlContent);

      // 各フィードのモックレスポンスを設定
      const feedUrls = [
        'https://example.com/feed1.rss',
        'https://example.com/feed2.rss',
        'https://example.com/feed3.rss',
      ];
      for (let i = 0; i < feedUrls.length; i++) {
        const mockData = createMockRSSData({
          title: `Feed ${i + 1}`,
          feedUrl: feedUrls[i],
        });
        crawlSpy.mockResolvedValueOnce(mockData);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act - コマンドを実行
      await importCommand.parseAsync(['node', 'termfeed', 'subscriptions.opml']);

      // Assert - データベースに保存されていることを確認
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(3);
      expect(feeds.map((f) => f.url).sort()).toEqual(feedUrls.sort());
    });

    it('テキスト形式のファイルからフィードをインポートできる', async () => {
      // Arrange
      const textContent = `https://example.com/feed1.rss
https://example.com/feed2.rss
# これはコメント
https://example.com/feed3.rss

https://example.com/feed4.rss`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);

      // モックレスポンスを設定
      for (let i = 1; i <= 4; i++) {
        const feedUrl = `https://example.com/feed${i}.rss`;
        const mockData = createMockRSSData({
          title: `Feed ${i}`,
          feedUrl,
        });
        crawlSpy.mockResolvedValueOnce(mockData);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'feeds.txt', '--format', 'text']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(4);
    });

    it('自動形式検出が正しく動作する', async () => {
      // Arrange - OPML形式
      const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline xmlUrl="https://example.com/feed.rss"/>
  </body>
</opml>`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(opmlContent);

      const mockData = createMockRSSData({ feedUrl: 'https://example.com/feed.rss' });
      crawlSpy.mockResolvedValueOnce(mockData);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'file.opml']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(1);
    });
  });

  describe('重複とエラーハンドリング', () => {
    it('既存のフィードはスキップされる', async () => {
      // Arrange - 既存のフィードを追加
      const existingUrl = 'https://example.com/existing.rss';
      const mockData = createMockRSSData({ feedUrl: existingUrl });
      crawlSpy.mockResolvedValueOnce(mockData);
      await context.feedService.addFeed(existingUrl);

      // インポートファイルの内容
      const textContent = `${existingUrl}
https://example.com/new.rss`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);

      // 新しいフィードのモック
      const newMockData = createMockRSSData({ feedUrl: 'https://example.com/new.rss' });
      crawlSpy.mockResolvedValueOnce(newMockData);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'feeds.txt', '--format', 'text']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(2);
    });

    it('フェッチエラーが発生したフィードは追加されない', async () => {
      // Arrange
      const textContent = `https://example.com/good.rss
https://example.com/bad.rss
https://example.com/good2.rss`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);

      // 正常なフィードのモック
      const goodMockData1 = createMockRSSData({ feedUrl: 'https://example.com/good.rss' });
      const goodMockData2 = createMockRSSData({ feedUrl: 'https://example.com/good2.rss' });

      crawlSpy
        .mockResolvedValueOnce(goodMockData1)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(goodMockData2);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'feeds.txt', '--format', 'text']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(2);
      expect(feeds.map((f) => f.url).sort()).toEqual([
        'https://example.com/good.rss',
        'https://example.com/good2.rss',
      ]);
    });

    it('ファイルが存在しない場合はprocess.exitが1で呼ばれる', async () => {
      // Arrange
      accessSpy.mockRejectedValue(new Error('ENOENT'));
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      try {
        await importCommand.parseAsync(['node', 'termfeed', 'nonexistent.opml']);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });

    it('無効な形式を指定した場合はprocess.exitが1で呼ばれる', async () => {
      // Arrange
      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue('dummy content');
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      try {
        await importCommand.parseAsync(['node', 'termfeed', 'file.txt', '--format', 'invalid']);
      } catch (error) {
        // process.exitが呼ばれると例外が発生する
        expect(error).toBeDefined();
      }

      // Assert
      expect(exitCode).toBe(1);
    });

    it('有効なURLが含まれていない場合は早期リターン（exitなし）', async () => {
      // Arrange
      const textContent = `# コメントのみ
# https://example.com/feed.rss
not-a-url
ftp://example.com/file.txt`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);
      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'invalid.txt', '--format', 'text']);

      // Assert
      expect(exitCode).toBeUndefined(); // process.exitは呼ばれない

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(0);
    });
  });

  describe('特殊文字とエスケープ処理', () => {
    it('OPML内のエスケープされた文字を正しく処理できる', async () => {
      // Arrange
      const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <body>
    <outline xmlUrl="https://example.com/feed.rss?param=1&amp;lang=ja" text="Feed &amp; News"/>
  </body>
</opml>`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(opmlContent);

      const feedUrl = 'https://example.com/feed.rss?param=1&lang=ja';
      const mockData = createMockRSSData({ feedUrl });
      crawlSpy.mockResolvedValueOnce(mockData);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'escaped.opml', '--format', 'opml']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds[0].url).toBe(feedUrl);
    });
  });

  describe('大量フィードのインポート', () => {
    it('100件のフィードを正常にインポートできる', async () => {
      // Arrange - 100件のURLを含むテキストファイル
      const urls: string[] = [];
      for (let i = 1; i <= 100; i++) {
        urls.push(`https://example.com/feed${i}.rss`);
      }
      const textContent = urls.join('\n');

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);

      // 各フィードのモックレスポンスを設定
      for (let i = 1; i <= 100; i++) {
        const feedUrl = `https://example.com/feed${i}.rss`;
        const mockData = createMockRSSData({
          title: `Feed ${i}`,
          feedUrl,
          items: [], // 記事は不要
        });
        crawlSpy.mockResolvedValueOnce(mockData);
      }

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'many-feeds.txt', '--format', 'text']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(100);
    });
  });

  describe('混合シナリオ', () => {
    it('成功、重複、エラーが混在する場合の処理', async () => {
      // Arrange - 既存のフィードを1つ追加
      const existingUrl = 'https://example.com/existing.rss';
      const existingMockData = createMockRSSData({ feedUrl: existingUrl });
      crawlSpy.mockResolvedValueOnce(existingMockData);
      await context.feedService.addFeed(existingUrl);

      // インポートファイルの内容
      const textContent = `https://example.com/new1.rss
${existingUrl}
https://example.com/error.rss
https://example.com/new2.rss`;

      accessSpy.mockResolvedValue(undefined);
      readFileSpy.mockResolvedValue(textContent);

      // 新しいフィードのモック
      const new1MockData = createMockRSSData({ feedUrl: 'https://example.com/new1.rss' });
      const new2MockData = createMockRSSData({ feedUrl: 'https://example.com/new2.rss' });

      crawlSpy
        .mockResolvedValueOnce(new1MockData)
        .mockRejectedValueOnce(new Error('Connection timeout'))
        .mockResolvedValueOnce(new2MockData);

      process.env.TERMFEED_DB = context.dbPath;

      // Act
      await importCommand.parseAsync(['node', 'termfeed', 'mixed.txt', '--format', 'text']);

      // Assert
      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(3); // existing + new1 + new2
      expect(feeds.map((f) => f.url).sort()).toEqual([
        'https://example.com/existing.rss',
        'https://example.com/new1.rss',
        'https://example.com/new2.rss',
      ]);
    });
  });
});
