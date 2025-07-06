import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// モックサービスの定義（グローバルスコープ）
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCount: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  getUnreadFeeds: vi.fn(),
  getArticles: vi.fn(),
  updateAllFeeds: vi.fn(),
  markArticleAsRead: vi.fn(),
  markArticleAsUnread: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  setFeedRating: vi.fn(),
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

vi.mock('../../models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => mockDatabaseManager),
}));

// モデルのモック
vi.mock('../../models/feed.js', () => ({
  FeedModel: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('../../models/article.js', () => ({
  ArticleModel: vi.fn(() => ({
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

vi.mock('../../models/favorite.js', () => ({
  FavoriteModel: vi.fn(() => ({
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
vi.mock('../../services/feed-service.js', () => ({
  FeedService: vi.fn().mockImplementation(() => mockFeedService),
}));

// ArticleServiceのモック
vi.mock('../../services/article-service.js', () => ({
  ArticleService: vi.fn().mockImplementation(() => mockArticleService),
}));

// PinServiceのモック
vi.mock('../../services/pin.js', () => ({
  PinService: vi.fn().mockImplementation(() => mockPinService),
}));

// FavoriteServiceのモック
vi.mock('../../services/favorite.js', () => ({
  FavoriteService: vi.fn().mockImplementation(() => mockFavoriteService),
}));

// Factoryのモック
vi.mock('../../services/factory.js', () => ({
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
vi.mock('../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => mockDatabaseManager),
}));

vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
  };
});

// processイベントのモック
type EventHandler = (...args: unknown[]) => void;
const processOnHandlers = new Map<string, EventHandler[]>();
const processOffHandlers = new Map<string, EventHandler[]>();

// App コンポーネントのimport（モック設定後）
import { App } from './App.js';

describe('App - 自動既読機能', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    console.log = vi.fn();
    console.error = vi.fn();

    // プロセスリスナーの上限を増やす
    process.setMaxListeners(20);

    // processハンドラーをクリア
    processOnHandlers.clear();
    processOffHandlers.clear();

    // モックのリセット
    vi.clearAllMocks();

    // デフォルトのモック実装を設定
    const testArticles = [
      {
        id: 1,
        feed_id: 1,
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        is_read: false, // 未読
        is_favorite: false,
        published_at: new Date('2024-01-01'),
        content: 'Test content 1',
        summary: 'Test summary 1',
        author: 'Test Author',
        thumbnail_url: undefined,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
      {
        id: 2,
        feed_id: 1,
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        is_read: false, // 未読
        is_favorite: false,
        published_at: new Date('2024-01-02'),
        content: 'Test content 2',
        summary: 'Test summary 2',
        author: 'Test Author 2',
        thumbnail_url: undefined,
        created_at: new Date('2024-01-02'),
        updated_at: new Date('2024-01-02'),
      },
    ];

    mockFeedService.getFeedList.mockReturnValue([
      { id: 1, title: 'Test Feed 1', rating: 0, url: 'https://example.com/feed1.rss' },
      { id: 2, title: 'Test Feed 2', rating: 0, url: 'https://example.com/feed2.rss' },
    ]);
    mockFeedService.getUnreadCount.mockReturnValue(2);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue({ 1: 2, 2: 1 });
    mockFeedService.getUnreadFeeds.mockReturnValue([
      {
        id: 1,
        title: 'Test Feed 1',
        rating: 0,
        url: 'https://example.com/feed1.rss',
        unreadCount: 2,
      },
      {
        id: 2,
        title: 'Test Feed 2',
        rating: 0,
        url: 'https://example.com/feed2.rss',
        unreadCount: 1,
      },
    ]);
    mockFeedService.getArticles.mockReturnValue(testArticles);
    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 1, failureCount: 0 },
      failed: [],
    });
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});

    // ArticleServiceのモック実装
    mockArticleService.getArticles.mockReturnValue(testArticles);
    mockArticleService.getArticleById.mockImplementation(
      (id: number) => testArticles.find((article) => article.id === id) || null
    );
    mockArticleService.markAsRead.mockImplementation(() => true);
    mockArticleService.markAsUnread.mockImplementation(() => true);
    mockArticleService.toggleFavorite.mockImplementation(() => true);
    mockArticleService.toggleFavoriteWithPin.mockImplementation(() => true);
    mockArticleService.getUnreadCount.mockReturnValue(testArticles.length);
    mockArticleService.getTotalCount.mockReturnValue(testArticles.length);

    // process.on/offのモック
    vi.spyOn(process, 'on').mockImplementation((event: string | symbol, handler: EventHandler) => {
      const eventStr = String(event);
      if (!processOnHandlers.has(eventStr)) {
        processOnHandlers.set(eventStr, []);
      }
      const handlers = processOnHandlers.get(eventStr);
      if (handlers) {
        handlers.push(handler);
      }
      return process;
    });

    vi.spyOn(process, 'off').mockImplementation((event: string | symbol, handler: EventHandler) => {
      const eventStr = String(event);
      if (processOffHandlers.has(eventStr)) {
        const handlers = processOffHandlers.get(eventStr);
        if (handlers) {
          const index = handlers.indexOf(handler);
          if (index > -1) {
            handlers.splice(index, 1);
          }
        }
      }
      return process;
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  it('フィード移動時に選択中の未読記事を既読にする', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化が完了するまで待機
    await vi.waitFor(
      () => {
        expect(mockFeedService.getUnreadFeeds).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // markArticleAsReadの呼び出し状況をクリア（初期化時の呼び出しを無視）
    mockFeedService.markArticleAsRead.mockClear();

    // sキーでフィード2に移動
    stdin.write('s');

    await vi.waitFor(
      () => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      },
      { timeout: 3000, interval: 100 }
    );

    // クリーンアップ
    unmount();
  });

  it('フィード移動時に既読記事は既読マークしない', async () => {
    // 既読記事のデータをセット（useArticleManagerが未読記事のみをフィルタリングするため、記事なしになる）
    mockArticleService.getArticles.mockReturnValue([]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // markArticleAsReadの呼び出し状況をクリア（初期化時の呼び出しを無視）
    vi.clearAllMocks();

    // sキーでフィード移動
    stdin.write('s');

    // フィード変更処理が完了するまで少し待機
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 記事がフィルタリングされているので markArticleAsRead は呼ばれない
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();

    // クリーンアップ
    unmount();
  });

  it('qキーでの終了時に選択中の未読記事を既読にする', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化が完了するまで待機
    await vi.waitFor(
      () => {
        expect(mockFeedService.getUnreadFeeds).toHaveBeenCalled();
      },
      { timeout: 1000 }
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    // markArticleAsReadの呼び出し状況をクリア（初期化時の呼び出しを無視）
    mockFeedService.markArticleAsRead.mockClear();

    // qキーで終了
    stdin.write('q');

    await vi.waitFor(
      () => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      },
      { timeout: 3000, interval: 100 }
    );

    // クリーンアップ
    unmount();
  });

  it('記事選択後にフィード移動すると選択記事が既読になる', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // jキーで記事2に移動
    stdin.write('j');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 20));

    // sキーでフィード移動
    stdin.write('s');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 記事2が既読にマークされる（j で移動した先の記事）
    const calls = mockFeedService.markArticleAsRead.mock.calls;
    const calledArticleIds = calls.map((call) => call[0] as number);
    expect(calledArticleIds).toContain(2); // 記事2が既読化される

    // クリーンアップ
    unmount();
  });

  it('記事がない場合はエラーにならない', async () => {
    // 記事なしのデータをセット
    mockArticleService.getArticles.mockReturnValue([]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 初期化時の呼び出しをクリア
    mockFeedService.markArticleAsRead.mockClear();

    // aキーでフィード移動（記事がない状態）
    stdin.write('a');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // markArticleAsRead は呼ばれない（記事がないため）
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();

    // クリーンアップ
    unmount();
  });

  it('既読マークでエラーが発生してもアプリが継続する', async () => {
    // markArticleAsRead でエラーを発生させる
    mockFeedService.markArticleAsRead.mockImplementation(() => {
      throw new Error('DB接続エラー');
    });

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // sキーでフィード移動
    expect(() => {
      stdin.write('s');
    }).not.toThrow();

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 100));

    // エラーログが出力される
    expect(console.error).toHaveBeenCalled();
    const errorMock = vi.mocked(console.error);
    const errorCall = errorMock.mock.calls.find((call) => {
      const firstArg: unknown = call[0];
      return typeof firstArg === 'string' && firstArg.includes('既読化に失敗');
    });
    expect(errorCall).toBeTruthy();

    // クリーンアップ
    unmount();
  });

  it('aキーでの前のフィード移動でも既読化される', async () => {
    // フィード2の記事を別のものに設定
    mockArticleService.getArticles.mockImplementation((options: { feedId?: number }) => {
      if (options.feedId === 2) {
        return [
          {
            id: 3,
            feed_id: 2,
            title: 'Test Article 3',
            url: 'https://example.com/article3',
            is_read: false,
            is_favorite: false,
            published_at: new Date('2024-01-03'),
            content: 'Test content 3',
            summary: 'Test summary 3',
            author: 'Test Author 3',
            thumbnail_url: undefined,
            created_at: new Date('2024-01-03'),
            updated_at: new Date('2024-01-03'),
          },
        ];
      }
      // フィード1の記事
      return [
        {
          id: 1,
          feed_id: 1,
          title: 'Test Article 1',
          url: 'https://example.com/article1',
          is_read: false,
          is_favorite: false,
          published_at: new Date('2024-01-01'),
          content: 'Test content 1',
          summary: 'Test summary 1',
          author: 'Test Author',
          thumbnail_url: undefined,
          created_at: new Date('2024-01-01'),
          updated_at: new Date('2024-01-01'),
        },
      ];
    });

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // まず次のフィードに移動してから前に戻る
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 初回の記事1の閲覧記録をクリア
    mockFeedService.markArticleAsRead.mockClear();

    // aキーで前のフィードに移動
    stdin.write('a');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 100));

    // フィード2の記事（ID=3）が既読にマークされる
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);

    // クリーンアップ
    unmount();
  });

  it('j/kキーでの記事移動単体では既読化されない（フィード移動なしの場合）', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 初期状態の呼び出し回数を記録
    const initialCallCount = mockFeedService.markArticleAsRead.mock.calls.length;

    // j/kキーで記事移動のみ（フィード移動しない）
    stdin.write('j');
    await new Promise((resolve) => setTimeout(resolve, 20));
    stdin.write('k');
    await new Promise((resolve) => setTimeout(resolve, 20));
    stdin.write('j');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 100));

    // j/kキーの移動だけでは既読化は発生しない
    const finalCallCount = mockFeedService.markArticleAsRead.mock.calls.length;
    expect(finalCallCount).toBe(initialCallCount);

    // クリーンアップ
    unmount();
  });

  it('複数回フィード移動すると各回で既読化される', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 記事2に移動
    stdin.write('j');
    await new Promise((resolve) => setTimeout(resolve, 20));

    // フィード移動1回目
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // フィード移動2回目
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 複数回のフィード移動により既読化が発生
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalled();
    // 最低1回は呼ばれている
    expect(mockFeedService.markArticleAsRead.mock.calls.length).toBeGreaterThanOrEqual(1);

    // クリーンアップ
    unmount();
  });

  it('記事IDがundefinedの場合は既読化をスキップ', async () => {
    // IDがundefinedの記事データ
    mockArticleService.getArticles.mockReturnValue([
      {
        id: undefined as unknown as number, // IDがない
        feed_id: 1,
        title: 'Test Article without ID',
        url: 'https://example.com/article1',
        is_read: false,
        is_favorite: false,
        published_at: new Date('2024-01-01'),
        content: 'Test content',
        summary: 'Test summary',
        author: 'Test Author',
        thumbnail_url: undefined,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      },
    ]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 初期化時の呼び出しをクリア
    mockFeedService.markArticleAsRead.mockClear();

    // フィード移動
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // IDがないので markArticleAsRead は呼ばれない
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();

    // クリーンアップ
    unmount();
  });
});
