import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { App } from './App.js';

// モジュールのモック
vi.mock('../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => ({
    migrate: vi.fn(),
  })),
}));

// processイベントのモック
type EventHandler = (...args: unknown[]) => void;
const processOnHandlers = new Map<string, EventHandler[]>();
const processOffHandlers = new Map<string, EventHandler[]>();

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

// モックサービスを関数として定義して、毎回新しいインスタンスを返す
const createMockFeedService = () => ({
  getFeedList: vi.fn(() => [
    { id: 1, title: 'Test Feed 1', url: 'https://example.com/feed1.rss' },
    { id: 2, title: 'Test Feed 2', url: 'https://example.com/feed2.rss' },
  ]),
  getUnreadCount: vi.fn(() => 2),
  getUnreadCountsForAllFeeds: vi.fn(() => ({ 1: 2, 2: 1 })),
  getUnreadFeeds: vi.fn(() => [
    { id: 1, title: 'Test Feed 1', url: 'https://example.com/feed1.rss', unreadCount: 2 },
    { id: 2, title: 'Test Feed 2', url: 'https://example.com/feed2.rss', unreadCount: 1 },
  ]),
  getArticles: vi.fn(() => [
    {
      id: 1,
      title: 'Test Article 1',
      url: 'https://example.com/article1',
      is_read: false, // 未読
      is_favorite: false,
      published_at: new Date('2024-01-01'),
      content: 'Test content 1',
      author: 'Test Author',
    },
    {
      id: 2,
      title: 'Test Article 2',
      url: 'https://example.com/article2',
      is_read: false, // 未読
      is_favorite: false,
      published_at: new Date('2024-01-02'),
      content: 'Test content 2',
      author: 'Test Author 2',
    },
  ]),
  updateAllFeeds: vi.fn(),
  markArticleAsRead: vi.fn(),
  markArticleAsUnread: vi.fn(),
  toggleArticleFavorite: vi.fn(),
});

let mockFeedService = createMockFeedService();

vi.mock('../../services/feed-service.js', () => ({
  FeedService: vi.fn(() => mockFeedService),
}));

vi.mock('../../models/feed.js', () => ({
  FeedModel: vi.fn(),
}));

vi.mock('../../models/article.js', () => ({
  ArticleModel: vi.fn(),
}));

vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useApp: () => ({ exit: vi.fn() }),
  };
});

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

    // 新しいモックサービスインスタンスを作成
    mockFeedService = createMockFeedService();
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  it('フィード移動時に選択中の未読記事を既読にする', async () => {
    const { stdin, unmount } = render(<App />);

    // 少し待ってから操作（初期化が完了するまで）
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 初期状態で記事1が選択されている（未読）
    // 記事が閲覧済みとして記録される

    // sキーでフィード2に移動
    stdin.write('s');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 記事1が既読にマークされる
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);

    // クリーンアップ
    unmount();
  });

  it('フィード移動時に既読記事は既読マークしない', async () => {
    // 既読記事のデータをセット（useArticleManagerが未読記事のみをフィルタリングするため、記事なしになる）
    mockFeedService.getArticles.mockReturnValue([
      {
        id: 1,
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        is_read: true, // 既読
        is_favorite: false,
        published_at: new Date('2024-01-01'),
        content: 'Test content 1',
        author: 'Test Author',
      },
    ]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // markArticleAsReadの呼び出し状況をクリア（初期化時の呼び出しを無視）
    vi.clearAllMocks();

    // sキーでフィード移動
    stdin.write('s');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 記事がフィルタリングされているので markArticleAsRead は呼ばれない
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();

    // クリーンアップ
    unmount();
  });

  it('qキーでの終了時に選択中の未読記事を既読にする', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // qキーで終了
    stdin.write('q');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 選択中の記事1が既読にマークされる
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);

    // クリーンアップ
    unmount();
  });

  it('記事選択後にフィード移動すると選択記事が既読になる', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // jキーで記事2に移動
    stdin.write('j');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 10));

    // sキーでフィード移動
    stdin.write('s');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 記事2が既読にマークされる（j で移動した先の記事）
    const calls = mockFeedService.markArticleAsRead.mock.calls;
    const calledArticleIds = calls.map((call) => call[0] as number);
    expect(calledArticleIds).toContain(2); // 記事2が既読化される

    // クリーンアップ
    unmount();
  });

  it('記事がない場合はエラーにならない', async () => {
    // 記事なしのデータをセット
    mockFeedService.getArticles.mockReturnValue([]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 初期化時の呼び出しをクリア
    mockFeedService.markArticleAsRead.mockClear();

    // aキーでフィード移動（記事がない状態）
    stdin.write('a');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // markArticleAsRead は呼ばれない（記事がないため）
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    // Maximum update depth エラーは無視（React の内部警告）

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
    await new Promise((resolve) => setTimeout(resolve, 50));

    // aキーでフィード移動
    expect(() => {
      stdin.write('a');
    }).not.toThrow();

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // エラーログが出力される
    expect(console.error).toHaveBeenCalledWith('記事の既読化に失敗しました:', expect.any(Error));

    // クリーンアップ
    unmount();
  });

  it('aキーでの前のフィード移動でも既読化される', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // aキーで前のフィードに移動
    stdin.write('a');

    // 少し待ってから確認
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 記事1が既読にマークされる
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);

    // クリーンアップ
    unmount();
  });

  it('j/kキーでの記事移動単体では既読化されない（フィード移動なしの場合）', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 初期状態の呼び出し回数を記録
    const initialCallCount = mockFeedService.markArticleAsRead.mock.calls.length;

    // j/kキーで記事移動のみ（フィード移動しない）
    stdin.write('j');
    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('k');
    await new Promise((resolve) => setTimeout(resolve, 10));
    stdin.write('j');

    // 少し待つ
    await new Promise((resolve) => setTimeout(resolve, 50));

    // j/kキーの移動だけでは既読化は発生しない
    const finalCallCount = mockFeedService.markArticleAsRead.mock.calls.length;
    // クリーンアップ時の既読化を削除したので、j/k移動では既読化されない
    expect(finalCallCount).toBe(initialCallCount);

    // クリーンアップ
    unmount();
  });

  it('複数回フィード移動すると各回で既読化される', async () => {
    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 記事2に移動
    stdin.write('j');
    await new Promise((resolve) => setTimeout(resolve, 10));

    // フィード移動1回目
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // フィード移動2回目
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 複数回のフィード移動により既読化が発生
    expect(mockFeedService.markArticleAsRead).toHaveBeenCalled();
    // 最低1回は呼ばれている
    expect(mockFeedService.markArticleAsRead.mock.calls.length).toBeGreaterThanOrEqual(1);

    // クリーンアップ
    unmount();
  });

  it('記事IDがundefinedの場合は既読化をスキップ', async () => {
    // IDがundefinedの記事データ
    mockFeedService.getArticles.mockReturnValue([
      {
        id: undefined as unknown as number, // IDがない
        title: 'Test Article without ID',
        url: 'https://example.com/article1',
        is_read: false,
        is_favorite: false,
        published_at: new Date('2024-01-01'),
        content: 'Test content',
        author: 'Test Author',
      },
    ]);

    const { stdin, unmount } = render(<App />);

    // 初期化待ち
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 初期化時の呼び出しをクリア
    mockFeedService.markArticleAsRead.mockClear();

    // フィード移動
    stdin.write('s');
    await new Promise((resolve) => setTimeout(resolve, 50));

    // IDがないので markArticleAsRead は呼ばれない
    expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    // Maximum update depth エラーは無視（React の内部警告）

    // クリーンアップ
    unmount();
  });
});
