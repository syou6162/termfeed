import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DatabaseManager } from '../../../../models/database.js';
import { FeedModel } from '../../../../models/feed.js';
import { ArticleModel } from '../../../../models/article.js';
import { FeedService } from '../../../../services/feed-service.js';
import { RSSCrawler } from '../../../../services/rss-crawler.js';
import type { CrawlResult, RSSItem } from '@/types';

/**
 * テスト用のモックRSSクローラー
 */
export class MockRSSCrawler extends RSSCrawler {
  private mockResponses = new Map<string, CrawlResult>();
  private shouldThrow = false;
  private errorToThrow: Error | null = null;

  constructor() {
    super();
  }

  /**
   * 指定されたURLに対するモックレスポンスを設定
   */
  setMockResponse(url: string, result: CrawlResult): void {
    this.mockResponses.set(url, result);
  }

  /**
   * エラーを投げるように設定
   */
  setThrowError(error: Error): void {
    this.shouldThrow = true;
    this.errorToThrow = error;
  }

  /**
   * モック状態をリセット
   */
  reset(): void {
    this.mockResponses.clear();
    this.shouldThrow = false;
    this.errorToThrow = null;
  }

  override async crawl(url: string): Promise<CrawlResult> {
    if (this.shouldThrow && this.errorToThrow) {
      return Promise.reject(this.errorToThrow);
    }

    const response = this.mockResponses.get(url);
    if (!response) {
      return Promise.reject(new Error(`No mock response set for URL: ${url}`));
    }

    return Promise.resolve(response);
  }
}

/**
 * テスト用のコンテキストを作成
 */
export interface TestContext {
  tempDir: string;
  dbPath: string;
  database: DatabaseManager;
  feedModel: FeedModel;
  articleModel: ArticleModel;
  feedService: FeedService;
  mockCrawler: MockRSSCrawler;
  cleanup: () => void;
}

/**
 * テストコンテキストを作成する
 */
export function createTestContext(): TestContext {
  const tempDir = mkdtempSync(join(tmpdir(), 'termfeed-test-'));
  const dbPath = join(tempDir, 'test.db');

  const database = new DatabaseManager(dbPath);
  database.migrate();

  const feedModel = new FeedModel(database);
  const articleModel = new ArticleModel(database);
  const mockCrawler = new MockRSSCrawler();
  const feedService = new FeedService(feedModel, articleModel, mockCrawler);

  const cleanup = () => {
    try {
      database.close();
    } catch {
      // データベースが既に閉じられている場合は無視
    }
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // ディレクトリが存在しない場合は無視
    }
  };

  return {
    tempDir,
    dbPath,
    database,
    feedModel,
    articleModel,
    feedService,
    mockCrawler,
    cleanup,
  };
}

/**
 * モックRSSデータを作成
 */
export function createMockRSSData(
  overrides: Partial<{
    title: string;
    description: string;
    items: RSSItem[];
    feedUrl?: string;
  }> = {}
): CrawlResult {
  // フィードURLから記事URLのプレフィックスを生成
  const feedUrl = overrides.feedUrl || 'https://example.com/feed.rss';
  const parsedUrl = new URL(feedUrl);
  // ホスト名とパス名を組み合わせてユニークなプレフィックスを生成
  const urlBase = (parsedUrl.hostname + parsedUrl.pathname)
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const defaultItems: RSSItem[] = [
    {
      title: 'Test Article 1',
      link: `https://example.com/${urlBase}/article1`,
      content: 'Test content 1',
      pubDate: new Date('2023-01-01').toISOString(),
      guid: `${urlBase}-article1`,
    },
    {
      title: 'Test Article 2',
      link: `https://example.com/${urlBase}/article2`,
      content: 'Test content 2',
      pubDate: new Date('2023-01-02').toISOString(),
      guid: `${urlBase}-article2`,
    },
  ];

  return {
    feed: {
      url: feedUrl,
      title: overrides.title || 'Test Feed',
      description: overrides.description || 'Test feed description',
      last_updated_at: new Date(),
    },
    articles: (overrides.items || defaultItems).map((item) => ({
      title: item.title || 'Untitled Article',
      url: item.link || item.guid || '',
      content: item.content,
      author: item.creator,
      published_at: new Date(item.pubDate || new Date()),
      is_read: false,
      is_favorite: false,
      thumbnail_url: undefined,
    })),
  };
}
