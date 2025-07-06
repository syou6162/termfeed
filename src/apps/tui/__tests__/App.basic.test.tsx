import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import type { Feed, Article } from '@/types';

// モックサービスの定義（グローバルスコープ）
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  getUnreadFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  updateAllFeeds: vi.fn(),
};

const mockArticleService = {
  getArticles: vi.fn(),
  getArticleById: vi.fn(),
  markAsRead: vi.fn(),
  markAsUnread: vi.fn(),
  toggleFavorite: vi.fn(),
  toggleFavoriteWithPin: vi.fn(),
  getUnreadCount: vi.fn(),
  getTotalCount: vi.fn(),
};

const mockPinService = {
  togglePin: vi.fn(),
  getPinnedArticles: vi.fn(() => []),
  getPinCount: vi.fn(() => 0),
  setPin: vi.fn(),
  unsetPin: vi.fn(),
  clearAllPins: vi.fn(),
};

const mockFavoriteService = {
  getFavoriteArticles: vi.fn(() => []),
  toggleFavorite: vi.fn(),
  setFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  isFavorite: vi.fn(() => false),
};

// child_processのモック
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

// DatabaseManagerのモック
const mockDatabaseManager = {
  migrate: vi.fn(),
};

vi.mock('../../../models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => mockDatabaseManager),
}));

// モデルのモック
vi.mock('../../../models/feed.js', () => ({
  FeedModel: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../../models/article.js', () => ({
  ArticleModel: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(() => []),
    update: vi.fn(),
    delete: vi.fn(),
    markAsRead: vi.fn(),
    markAsUnread: vi.fn(),
    getFavoriteArticles: vi.fn(() => []),
    getUnreadCount: vi.fn(() => 0),
    count: vi.fn(() => 0),
    findAllWithPinStatus: vi.fn(() => []),
    getPinnedArticles: vi.fn(() => []),
    getUnreadCountsByFeedIds: vi.fn(() => ({})),
  })),
}));

vi.mock('../../../models/favorite.js', () => ({
  FavoriteModel: vi.fn().mockImplementation(() => ({
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(() => []),
    update: vi.fn(),
    delete: vi.fn(),
    getFavoriteArticles: vi.fn(() => []),
    isFavorite: vi.fn(() => false),
  })),
}));

// FeedServiceのモック
vi.mock('../../../services/feed-service.js', () => ({
  FeedService: vi.fn().mockImplementation(() => mockFeedService),
}));

// ArticleServiceのモック
vi.mock('../../../services/article-service.js', () => ({
  ArticleService: vi.fn().mockImplementation(() => mockArticleService),
}));

// PinServiceのモック
vi.mock('../../../services/pin.js', () => ({
  PinService: vi.fn().mockImplementation(() => mockPinService),
}));

// FavoriteServiceのモック
vi.mock('../../../services/favorite.js', () => ({
  FavoriteService: vi.fn().mockImplementation(() => mockFavoriteService),
}));

// Factoryのモック
vi.mock('../../../services/factory.js', () => ({
  createFeedServices: vi.fn(() => ({
    feedService: mockFeedService,
    articleService: mockArticleService,
    pinService: mockPinService,
    favoriteService: mockFavoriteService,
  })),
  createModelsAndServices: vi.fn(() => ({
    feedService: mockFeedService,
    articleService: mockArticleService,
    pinService: mockPinService,
    favoriteService: mockFavoriteService,
    articleModel: {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(() => []),
      update: vi.fn(),
      delete: vi.fn(),
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      getFavoriteArticles: vi.fn(() => []),
      getUnreadCount: vi.fn(() => 0),
      count: vi.fn(() => 0),
      findAllWithPinStatus: vi.fn(() => []),
      getPinnedArticles: vi.fn(() => []),
      getUnreadCountsByFeedIds: vi.fn(() => ({})),
    },
    feedModel: {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(() => []),
      update: vi.fn(),
      delete: vi.fn(),
      setRating: vi.fn(),
    },
    favoriteModel: {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(() => []),
      update: vi.fn(),
      delete: vi.fn(),
      getFavoriteArticles: vi.fn(() => []),
      isFavorite: vi.fn(() => false),
    },
  })),
}));

// データベースユーティリティのモック
vi.mock('../../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => mockDatabaseManager),
}));

// App コンポーネントのimport（モック設定後）
import { App } from '../App.js';

// テストデータ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    rating: 0,
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
    mockFeedService.getUnreadFeeds.mockReturnValue(
      mockFeeds.map((feed) => ({ ...feed, unreadCount: 1 }))
    );
    mockFeedService.getArticles.mockReturnValue(mockArticles);
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});
    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 1, failureCount: 0 },
      failed: [],
    });

    // ArticleServiceのモック実装
    mockArticleService.getArticles.mockReturnValue(mockArticles);
    mockArticleService.getArticleById.mockImplementation(
      (id: number) => mockArticles.find((article) => article.id === id) || null
    );
    mockArticleService.markAsRead.mockImplementation(() => true);
    mockArticleService.markAsUnread.mockImplementation(() => true);
    mockArticleService.toggleFavorite.mockImplementation(() => true);
    mockArticleService.toggleFavoriteWithPin.mockImplementation(() => true);
    mockArticleService.getUnreadCount.mockReturnValue(mockArticles.length);
    mockArticleService.getTotalCount.mockReturnValue(mockArticles.length);

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

  it('フィードが表示される', async () => {
    const { lastFrame } = render(<App />);

    // useEffectの実行を待つ
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('Test Feed 1');
    });
  });

  it('記事が表示される', async () => {
    const { lastFrame } = render(<App />);

    // useEffectの実行を待つ
    await vi.waitFor(() => {
      const output = lastFrame();
      expect(output).toContain('Article 1');
    });
  });

  it('サービスメソッドが呼ばれる', async () => {
    render(<App />);

    // useEffectの非同期処理を待つ
    await vi.waitFor(() => {
      expect(mockFeedService.getUnreadFeeds).toHaveBeenCalled();
    });

    // getArticlesは遅れて呼ばれる可能性があるので別途待つ
    await vi.waitFor(() => {
      expect(mockArticleService.getArticles).toHaveBeenCalled();
    });
  });
});
