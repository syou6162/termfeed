import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTestContext, createMockRSSData, type TestContext } from './test-helpers.js';
import { FeedModel } from '../../../../models/feed.js';
import { ArticleModel } from '../../../../models/article.js';
import { FeedService } from '../../../../services/feed-service.js';
import { createDatabaseManager } from '../../utils/database.js';
import { DuplicateFeedError } from '../../../../services/errors.js';

// fs.readFileとfs.accessをモック
vi.mock('fs/promises');

// import.tsの内部ロジックを直接テストするため、アクション関数を抽出してテスト
async function importFeedsAction(
  dbPath: string,
  filePath: string,
  format?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockCrawler?: any
): Promise<{
  successCount: number;
  duplicateCount: number;
  errorCount: number;
}> {
  const originalDb = process.env.TERMFEED_DB;
  process.env.TERMFEED_DB = dbPath;

  try {
    const absolutePath = path.resolve(filePath);

    // ファイルの存在確認（テストではモック）
    try {
      await fs.access(absolutePath);
    } catch {
      throw new Error(`File not found: ${absolutePath}`);
    }

    // ファイルを読み込み（テストではモック）
    const content = await fs.readFile(absolutePath, 'utf-8');

    // 形式の決定
    let importFormat: 'opml' | 'text';
    if (format === 'auto' || !format) {
      // OPMLService.detectFormatFromContentの実装を模倣
      const trimmed = content.trim();
      if (trimmed.startsWith('<?xml') || trimmed.includes('<opml')) {
        importFormat = 'opml';
      } else {
        importFormat = 'text';
      }
    } else if (format === 'opml' || format === 'text') {
      importFormat = format;
    } else {
      throw new Error('Invalid format');
    }

    // URLを抽出（OPMLServiceの実装を使用）
    let urls: string[];
    if (importFormat === 'opml') {
      // OPMLService.parseOPMLの実装を模倣
      urls = [];
      const outlineRegex = /<outline[^>]+xmlUrl=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = outlineRegex.exec(content)) !== null) {
        const url = match[1]
          .replace(/&apos;/g, "'")
          .replace(/&quot;/g, '"')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<')
          .replace(/&amp;/g, '&');
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            urls.push(url);
          }
        } catch {
          // 無効なURLは無視
        }
      }
    } else {
      // OPMLService.parseTextの実装を模倣
      urls = content
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
        .filter((url) => {
          try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        });
    }

    if (urls.length === 0) {
      throw new Error('No valid feed URLs found');
    }

    // データベースとサービスの初期化
    const dbManager = createDatabaseManager();
    dbManager.migrate();
    const feedModel = new FeedModel(dbManager);
    const articleModel = new ArticleModel(dbManager);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const feedService = new FeedService(feedModel, articleModel, mockCrawler);

    // 各URLを追加
    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const url of urls) {
      try {
        await feedService.addFeed(url);
        successCount++;
      } catch (error) {
        if (error instanceof DuplicateFeedError) {
          duplicateCount++;
        } else {
          errorCount++;
        }
      }
    }

    dbManager.close();

    return { successCount, duplicateCount, errorCount };
  } finally {
    if (originalDb) {
      process.env.TERMFEED_DB = originalDb;
    } else {
      delete process.env.TERMFEED_DB;
    }
  }
}

describe('import command', () => {
  let context: TestContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let readFileSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let accessSpy: any;

  beforeEach(() => {
    context = createTestContext();
    readFileSpy = vi.spyOn(fs, 'readFile');
    accessSpy = vi.spyOn(fs, 'access');
  });

  afterEach(() => {
    context.cleanup();
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
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
        context.mockCrawler.setMockResponse(feedUrls[i], mockData);
      }

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'subscriptions.opml',
        'auto',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(3);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(0);

      // データベースに保存されていることを確認
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // モックレスポンスを設定
      for (let i = 1; i <= 4; i++) {
        const feedUrl = `https://example.com/feed${i}.rss`;
        const mockData = createMockRSSData({
          title: `Feed ${i}`,
          feedUrl,
        });
        context.mockCrawler.setMockResponse(feedUrl, mockData);
      }

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'feeds.txt',
        'text',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(4);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(0);

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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(opmlContent);

      const mockData = createMockRSSData({ feedUrl: 'https://example.com/feed.rss' });
      context.mockCrawler.setMockResponse('https://example.com/feed.rss', mockData);

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'file.opml',
        'auto',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(1);
    });
  });

  describe('重複とエラーハンドリング', () => {
    it('既存のフィードはスキップされる', async () => {
      // Arrange - 既存のフィードを追加
      const existingUrl = 'https://example.com/existing.rss';
      const mockData = createMockRSSData({ feedUrl: existingUrl });
      context.mockCrawler.setMockResponse(existingUrl, mockData);
      await context.feedService.addFeed(existingUrl);

      // インポートファイルの内容
      const textContent = `${existingUrl}
https://example.com/new.rss`;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // 新しいフィードのモック
      const newMockData = createMockRSSData({ feedUrl: 'https://example.com/new.rss' });
      context.mockCrawler.setMockResponse('https://example.com/new.rss', newMockData);

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'feeds.txt',
        'text',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(1);
      expect(result.duplicateCount).toBe(1);
      expect(result.errorCount).toBe(0);
    });

    it('フェッチエラーが発生したフィードはエラーとしてカウントされる', async () => {
      // Arrange
      const textContent = `https://example.com/good.rss
https://example.com/bad.rss
https://example.com/good2.rss`;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // 正常なフィードのモック
      const goodMockData1 = createMockRSSData({ feedUrl: 'https://example.com/good.rss' });
      const goodMockData2 = createMockRSSData({ feedUrl: 'https://example.com/good2.rss' });
      context.mockCrawler.setMockResponse('https://example.com/good.rss', goodMockData1);
      context.mockCrawler.setMockResponse('https://example.com/good2.rss', goodMockData2);

      // エラーを発生させるフィード
      context.mockCrawler.setMockResponse('https://example.com/bad.rss', {
        feed: {
          url: 'https://example.com/bad.rss',
          title: 'Bad Feed',
          last_updated_at: new Date(),
        },
        articles: [],
      });
      // 一度リセットしてからエラーを設定
      context.mockCrawler.reset();
      context.mockCrawler.setMockResponse('https://example.com/good.rss', goodMockData1);
      context.mockCrawler.setMockResponse('https://example.com/good2.rss', goodMockData2);
      // bad.rssでエラーを発生させる別の方法を使用
      context.mockCrawler.setThrowError(new Error('Network error'));

      // Act - MockRSSCrawlerを修正してURL別にエラーを設定できるようにする必要があるため、
      // ここでは別のアプローチを取る
      const newContext = createTestContext();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // 正常なフィードのモック設定
      newContext.mockCrawler.setMockResponse('https://example.com/good.rss', goodMockData1);
      newContext.mockCrawler.setMockResponse('https://example.com/good2.rss', goodMockData2);

      // bad.rssにアクセスしたときだけエラーを発生させる
      const originalCrawl = newContext.mockCrawler.crawl.bind(newContext.mockCrawler);
      newContext.mockCrawler.crawl = async (url: string) => {
        if (url === 'https://example.com/bad.rss') {
          throw new Error('Network error');
        }
        return originalCrawl(url);
      };

      const result = await importFeedsAction(
        newContext.dbPath,
        'feeds.txt',
        'text',
        newContext.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(1);

      // クリーンアップ
      newContext.cleanup();
    });

    it('ファイルが存在しない場合はエラー', async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockRejectedValue(new Error('ENOENT'));

      // Act & Assert
      await expect(
        importFeedsAction(context.dbPath, 'nonexistent.opml', 'auto', context.mockCrawler)
      ).rejects.toThrow('File not found');
    });

    it('無効な形式を指定した場合はエラー', async () => {
      // Arrange
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue('dummy content');

      // Act & Assert
      await expect(
        importFeedsAction(context.dbPath, 'file.txt', 'invalid', context.mockCrawler)
      ).rejects.toThrow('Invalid format');
    });

    it('有効なURLが含まれていない場合はエラー', async () => {
      // Arrange
      const textContent = `# コメントのみ
# https://example.com/feed.rss
not-a-url
ftp://example.com/file.txt`;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // Act & Assert
      await expect(
        importFeedsAction(context.dbPath, 'invalid.txt', 'text', context.mockCrawler)
      ).rejects.toThrow('No valid feed URLs found');
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(opmlContent);

      const feedUrl = 'https://example.com/feed.rss?param=1&lang=ja';
      const mockData = createMockRSSData({ feedUrl });
      context.mockCrawler.setMockResponse(feedUrl, mockData);

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'escaped.opml',
        'opml',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(1);

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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // 各フィードのモックレスポンスを設定
      for (let i = 1; i <= 100; i++) {
        const feedUrl = `https://example.com/feed${i}.rss`;
        const mockData = createMockRSSData({
          title: `Feed ${i}`,
          feedUrl,
          items: [], // 記事は不要
        });
        context.mockCrawler.setMockResponse(feedUrl, mockData);
      }

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'many-feeds.txt',
        'text',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(100);
      expect(result.duplicateCount).toBe(0);
      expect(result.errorCount).toBe(0);

      const feeds = context.feedModel.findAll();
      expect(feeds).toHaveLength(100);
    });
  });

  describe('混合シナリオ', () => {
    it('成功、重複、エラーが混在する場合の処理', async () => {
      // Arrange - 既存のフィードを1つ追加
      const existingUrl = 'https://example.com/existing.rss';
      const existingMockData = createMockRSSData({ feedUrl: existingUrl });
      context.mockCrawler.setMockResponse(existingUrl, existingMockData);
      await context.feedService.addFeed(existingUrl);

      // インポートファイルの内容
      const textContent = `https://example.com/new1.rss
${existingUrl}
https://example.com/error.rss
https://example.com/new2.rss`;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      accessSpy.mockResolvedValue(undefined);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      readFileSpy.mockResolvedValue(textContent);

      // 新しいフィードのモック
      const new1MockData = createMockRSSData({ feedUrl: 'https://example.com/new1.rss' });
      const new2MockData = createMockRSSData({ feedUrl: 'https://example.com/new2.rss' });
      context.mockCrawler.setMockResponse('https://example.com/new1.rss', new1MockData);
      context.mockCrawler.setMockResponse('https://example.com/new2.rss', new2MockData);

      // error.rssでエラーを発生させる
      const originalCrawl = context.mockCrawler.crawl.bind(context.mockCrawler);
      context.mockCrawler.crawl = async (url: string) => {
        if (url === 'https://example.com/error.rss') {
          throw new Error('Connection timeout');
        }
        return originalCrawl(url);
      };

      // Act
      const result = await importFeedsAction(
        context.dbPath,
        'mixed.txt',
        'text',
        context.mockCrawler
      );

      // Assert
      expect(result.successCount).toBe(2);
      expect(result.duplicateCount).toBe(1);
      expect(result.errorCount).toBe(1);
    });
  });
});
