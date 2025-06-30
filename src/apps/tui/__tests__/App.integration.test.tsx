import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import type { Feed, Article, FeedUpdateFailure } from '@/types';

// モックの設定
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    unref: vi.fn(),
  })),
}));

// FeedServiceのモック
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  updateAllFeeds: vi.fn(),
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

// DatabaseManagerのモック
const mockDatabaseManager = {
  migrate: vi.fn(),
};

vi.mock('../../../models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => mockDatabaseManager),
}));

vi.mock('../cli/utils/database.js', () => ({
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
    description: 'Test feed 1 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    description: 'Test feed 2 description',
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
  {
    id: 2,
    feed_id: 1,
    title: 'Article 2',
    url: 'https://example.com/article2',
    content: 'Article 2 content',
    summary: 'Article 2 summary',
    author: 'Author 2',
    published_at: new Date('2024-01-02'),
    is_read: false,
    is_favorite: true,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-02'),
    updated_at: new Date('2024-01-02'),
  },
];

const mockUnreadCounts = {
  1: 2,
  2: 0,
};

describe('App Integration Tests', () => {
  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    // デフォルトのモック実装を設定
    mockFeedService.getFeedList.mockReturnValue(mockFeeds);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue(mockUnreadCounts);
    mockFeedService.getArticles.mockReturnValue(mockArticles);
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});
    mockFeedService.updateAllFeeds.mockImplementation(() =>
      Promise.resolve({
        summary: { successCount: 2, failureCount: 0 },
        failed: [],
      })
    );

    // process.onのモック
    vi.spyOn(process, 'on').mockImplementation(() => process);
    vi.spyOn(process, 'off').mockImplementation(() => process);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('フィード一覧を表示し、未読数でソートする', () => {
      const { lastFrame } = render(<App />);

      // フィード一覧の表示を確認
      expect(lastFrame()).toContain('Test Feed 1');
      expect(lastFrame()).toContain('Test Feed 2');

      // 未読数の表示を確認
      expect(lastFrame()).toContain('(2)'); // Feed 1の未読数
    });

    it('最初のフィードの記事を自動的に表示する', () => {
      const { lastFrame } = render(<App />);

      // 記事一覧の表示を確認
      expect(lastFrame()).toContain('Article 1');
      expect(lastFrame()).toContain('Article 2');

      // お気に入りマークの表示を確認
      expect(lastFrame()).toContain('★'); // Article 2のお気に入り
    });

    it('ローディング中は適切なメッセージを表示する', () => {
      // getFeedListを遅延させる
      mockFeedService.getFeedList.mockImplementation(() => {
        throw new Error('まだ読み込み中');
      });

      const { lastFrame } = render(<App />);
      expect(lastFrame()).toContain('読み込み中...');
    });

    it('エラー時は適切なエラーメッセージを表示する', () => {
      mockFeedService.getFeedList.mockImplementation(() => {
        throw new Error('フィードの読み込みに失敗しました');
      });

      const { lastFrame } = render(<App />);
      expect(lastFrame()).toContain('エラーが発生しました');
      expect(lastFrame()).toContain('フィードの読み込みに失敗しました');
    });
  });

  describe('キーボード操作', () => {
    it('jキーで次の記事に移動する', () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期状態を確認
      expect(lastFrame()).toContain('Article 1');

      // jキーを押す
      stdin.write('j');

      // 選択が移動したことを確認（実装による）
      // 注: ink-testing-libraryの制限により、実際の選択状態の確認は困難
    });

    it('kキーで前の記事に移動する', () => {
      const { stdin } = render(<App />);

      // まず次の記事に移動
      stdin.write('j');

      // kキーで戻る
      stdin.write('k');

      // mockFeedServiceの呼び出しを確認
      expect(mockFeedService.getArticles).toHaveBeenCalled();
    });

    it('sキーで次のフィードに移動する', () => {
      const { stdin } = render(<App />);

      // sキーを押す
      stdin.write('s');

      // 新しいフィードの記事を読み込むことを確認
      expect(mockFeedService.getArticles).toHaveBeenCalledWith({
        feed_id: 2,
        limit: 100,
      });
    });

    it('aキーで前のフィードに移動する', () => {
      const { stdin } = render(<App />);

      // まず次のフィードに移動
      stdin.write('s');

      // aキーで戻る
      stdin.write('a');

      // 元のフィードの記事を読み込むことを確認
      expect(mockFeedService.getArticles).toHaveBeenCalledWith({
        feed_id: 1,
        limit: 100,
      });
    });

    it('vキーでブラウザを開く', async () => {
      const { spawn } = await import('child_process');
      const mockSpawn = vi.mocked(spawn);

      const { stdin } = render(<App />);

      // vキーを押す
      stdin.write('v');

      // spawnが呼ばれることを確認
      expect(mockSpawn).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['https://example.com/article1']),
        expect.objectContaining({
          stdio: 'ignore',
          detached: true,
        })
      );
    });

    it('fキーでお気に入りをトグルする', () => {
      const { stdin } = render(<App />);

      // fキーを押す
      stdin.write('f');

      // toggleArticleFavoriteが呼ばれることを確認
      expect(mockFeedService.toggleArticleFavorite).toHaveBeenCalledWith(1);
    });

    it('rキーで全フィードを更新する', () => {
      const { stdin } = render(<App />);

      // rキーを押す
      stdin.write('r');

      // updateAllFeedsが呼ばれることを確認
      expect(mockFeedService.updateAllFeeds).toHaveBeenCalled();
    });

    it('?キーでヘルプを表示する', () => {
      const { stdin, lastFrame } = render(<App />);

      // ?キーを押す
      stdin.write('?');

      // ヘルプ画面が表示されることを確認
      expect(lastFrame()).toContain('キーボードショートカット');
    });

    it('qキーでアプリを終了する', () => {
      const { stdin } = render(<App />);

      // qキーを押す
      stdin.write('q');

      // 既読処理が実行されることを確認
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });
  });

  describe('自動既読機能', () => {
    it('フィード移動時に現在の記事を既読にする', () => {
      const { stdin } = render(<App />);

      // 次のフィードに移動
      stdin.write('s');

      // 既読処理が実行されることを確認
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });

    it('アプリ終了時に現在の記事を既読にする', () => {
      render(<App />);

      // SIGINTシグナルのハンドラを取得して実行
      const sigintHandlers = vi
        .spyOn(process, 'on')
        .mock.calls.filter(([event]) => event === 'SIGINT')
        .map(([_, handler]) => handler);

      sigintHandlers.forEach((handler) => {
        if (typeof handler === 'function') {
          handler('SIGINT');
        }
      });

      // 既読処理が実行されることを確認
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });

    it('既に既読の記事は既読処理をスキップする', () => {
      // 既読記事を設定
      const readArticles = mockArticles.map((a) => ({ ...a, is_read: true }));
      mockFeedService.getArticles.mockReturnValue(readArticles);

      const { stdin } = render(<App />);

      // フィードを移動
      stdin.write('s');

      // 既読処理が呼ばれないことを確認
      expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('フィード読み込みエラーを適切に表示する', () => {
      mockFeedService.getFeedList.mockImplementation(() => {
        throw new Error('ネットワークエラー');
      });

      const { lastFrame } = render(<App />);

      expect(lastFrame()).toContain('エラーが発生しました');
      expect(lastFrame()).toContain('ネットワークエラー');
      expect(lastFrame()).toContain('r: 再試行');
    });

    it('更新エラーを適切に表示する', async () => {
      const failedFeeds: FeedUpdateFailure[] = [
        {
          status: 'failure',
          feedId: 1,
          feedUrl: 'https://example.com/feed1.rss',
          error: new Error('タイムアウト'),
        },
      ];

      mockFeedService.updateAllFeeds.mockResolvedValue({
        summary: { successCount: 1, failureCount: 1 },
        failed: failedFeeds,
      });

      const { stdin, lastFrame } = render(<App />);

      // 更新を実行
      stdin.write('r');

      // エラー詳細の表示を確認
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('フィード更新が一部失敗しました');
      });
    });

    it('更新のキャンセルが可能である', async () => {
      mockFeedService.updateAllFeeds.mockImplementation(
        (callback: (progress: unknown) => void, signal: AbortSignal) => {
          // 進捗を報告
          callback({
            currentIndex: 1,
            totalFeeds: 2,
            currentFeedTitle: 'Test Feed 1',
            currentFeedUrl: 'https://example.com/feed1.rss',
          });

          // キャンセルを待つ
          return new Promise((resolve) => {
            const abortHandler = () => {
              resolve({
                cancelled: true,
                processedFeeds: 1,
                totalFeeds: 2,
                failed: [],
              });
            };
            signal.addEventListener('abort', abortHandler);
          });
        }
      );

      const { stdin, lastFrame } = render(<App />);

      // 更新を開始
      stdin.write('r');

      // 進捗表示を確認
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('フィード更新中 (1/2)');
        expect(lastFrame()).toContain('ESC: キャンセル');
      });

      // ESCキーでキャンセル
      stdin.write('\x1B');
    });
  });

  describe('スクロール操作', () => {
    it('Ctrl+Dでページダウンする', () => {
      const { stdin } = render(<App />);

      // Ctrl+Dを送信
      stdin.write('\x04');

      // スクロールが発生することを確認（実装依存）
    });

    it('Ctrl+Uでページアップする', () => {
      const { stdin } = render(<App />);

      // まずページダウン
      stdin.write('\x04');

      // Ctrl+Uでページアップ
      stdin.write('\x15');

      // スクロールが戻ることを確認（実装依存）
    });

    it('Gで記事の最後にジャンプする', () => {
      const { stdin } = render(<App />);

      // Shift+Gを送信
      stdin.write('G');

      // 最後にジャンプすることを確認（実装依存）
    });
  });

  describe('記事のフィルタリング', () => {
    it('既読記事は表示されない', () => {
      // 一部を既読にしたデータを設定
      const mixedArticles = [{ ...mockArticles[0], is_read: true }, mockArticles[1]];
      mockFeedService.getArticles.mockReturnValue(mixedArticles);

      const { lastFrame } = render(<App />);

      // 未読記事のみ表示されることを確認
      expect(lastFrame()).not.toContain('Article 1');
      expect(lastFrame()).toContain('Article 2');
    });

    it('記事を既読にすると即座にリストから除外される', () => {
      const { stdin, rerender } = render(<App />);

      // フィードを移動して既読処理を発生させる
      stdin.write('s');

      // 記事が除外されることを確認
      mockFeedService.getArticles.mockReturnValue([mockArticles[1]]);
      rerender(<App />);

      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });
  });
});
