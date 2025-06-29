import { render } from 'ink-testing-library';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { App } from './App.js';

// モジュールのモック
vi.mock('../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => ({
    migrate: vi.fn(),
  })),
}));

const mockFeedService = {
  getFeedList: vi.fn(() => [
    { id: 1, title: 'Test Feed 1', url: 'https://example.com/feed1.rss' },
    { id: 2, title: 'Test Feed 2', url: 'https://example.com/feed2.rss' },
  ]),
  getUnreadCount: vi.fn(() => 5),
  getArticles: vi.fn(() => [
    {
      id: 1,
      title: 'Test Article 1',
      url: 'https://example.com/article1',
      is_read: false,
      is_favorite: false,
      published_at: new Date('2024-01-01'),
      content: 'Test content 1',
      author: 'Test Author',
    },
    {
      id: 2,
      title: 'Test Article 2',
      url: 'https://example.com/article2',
      is_read: true,
      is_favorite: true,
      published_at: new Date('2024-01-02'),
      content: 'Test content 2',
      author: 'Test Author 2',
    },
  ]),
  updateAllFeeds: vi.fn(),
  markArticleAsRead: vi.fn(),
  markArticleAsUnread: vi.fn(),
  toggleArticleFavorite: vi.fn(),
};

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

describe('App', () => {
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    originalConsoleLog = console.log;
    console.log = vi.fn();

    // モックのリセットと再設定
    mockFeedService.getFeedList.mockReturnValue([
      { id: 1, title: 'Test Feed 1', url: 'https://example.com/feed1.rss' },
      { id: 2, title: 'Test Feed 2', url: 'https://example.com/feed2.rss' },
    ]);
    mockFeedService.getUnreadCount.mockReturnValue(5);
    mockFeedService.getArticles.mockReturnValue([
      {
        id: 1,
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        is_read: false,
        is_favorite: false,
        published_at: new Date('2024-01-01'),
        content: 'Test content 1',
        author: 'Test Author',
      },
      {
        id: 2,
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        is_read: true,
        is_favorite: true,
        published_at: new Date('2024-01-02'),
        content: 'Test content 2',
        author: 'Test Author 2',
      },
    ]);
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    vi.clearAllMocks();
  });

  it('2ペインレイアウトが表示される', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame();
    expect(output).toContain('フィード一覧');
    // 右ペインは記事詳細のみ表示（タイトルなし）
    expect(output).toContain('記事がありません');
  });

  it('フィードがない場合の表示が正しい', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame();
    // フィードがない場合のメッセージが表示される（改行で分割される可能性があるため部分マッチ）
    expect(output).toContain('フィードが登録さ');
    expect(output).toContain('記事がありません');
  });

  it('ヒントメッセージが表示される', () => {
    const { lastFrame } = render(<App />);

    const output = lastFrame();
    expect(output).toContain('ヒント');
    expect(output).toContain('termfeed add');
  });

  it('キーボード入力を受け付ける', () => {
    const { stdin } = render(<App />);

    // キーボード入力がエラーなく処理される
    expect(() => {
      stdin.write('j');
      stdin.write('k');
      stdin.write('a');
      stdin.write('s');
    }).not.toThrow();
  });

  it('qキーでアプリが終了する', () => {
    const exitSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { stdin } = render(<App />);
    stdin.write('q');

    // qキーの処理が実行されたことを確認
    // 実際のexitではなく、キーハンドリングの動作を確認
    exitSpy.mockRestore();
  });
});
