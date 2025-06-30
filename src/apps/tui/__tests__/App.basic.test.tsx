import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import type { Feed, Article } from '@/types';

// モックサービスの定義（グローバルスコープ）
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  updateAllFeeds: vi.fn(),
};

// child_processのモック
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

// DatabaseManagerのモック
vi.mock('../../../models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => ({
    migrate: vi.fn(),
  })),
}));

// モデルのモック
vi.mock('../../models/feed.js', () => ({
  FeedModel: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../models/article.js', () => ({
  ArticleModel: vi.fn().mockImplementation(() => ({})),
}));

// FeedServiceのモック
vi.mock('../../services/feed-service.js', () => ({
  FeedService: vi.fn().mockImplementation(() => mockFeedService),
}));

// データベースユーティリティのモック
vi.mock('../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => ({
    migrate: vi.fn(),
  })),
}));

// App コンポーネントのimport（モック設定後）
import { App } from '../App.js';

// テストデータ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    description: 'Test feed 1 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
];

const mockArticles: Article[] = [
  {
    id: 1,
    feed_id: 1,
    title: 'Article 1',
    url: 'https://example.com/article1',
    content: 'Article 1 content',
    summary: 'Article 1 summary',
    author: 'Author 1',
    published_at: new Date('2024-01-01'),
    is_read: false,
    is_favorite: false,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

describe('App Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    mockFeedService.getFeedList.mockReturnValue(mockFeeds);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue({ 1: 1 });
    mockFeedService.getArticles.mockReturnValue(mockArticles);
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});
    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 1, failureCount: 0 },
      failed: [],
    });

    // process.onのモック
    vi.spyOn(process, 'on').mockImplementation(() => process);
    vi.spyOn(process, 'off').mockImplementation(() => process);
  });

  it('基本的なレンダリングが可能', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();

    // 何らかの出力があることを確認
    expect(output).toBeDefined();
    expect(output?.length ?? 0).toBeGreaterThan(0);
  });

  it('フィードが表示される', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();

    // フィードタイトルが表示されることを確認
    expect(output).toContain('Test Feed 1');
  });

  it('記事が表示される', () => {
    const { lastFrame } = render(<App />);
    const output = lastFrame();

    // 記事タイトルが表示されることを確認
    expect(output).toContain('Article 1');
  });

  it('サービスメソッドが呼ばれる', async () => {
    render(<App />);

    // useEffectの非同期処理を待つ
    await vi.waitFor(() => {
      expect(mockFeedService.getFeedList).toHaveBeenCalled();
    });

    expect(mockFeedService.getUnreadCountsForAllFeeds).toHaveBeenCalled();
    expect(mockFeedService.getArticles).toHaveBeenCalled();
  });
});
