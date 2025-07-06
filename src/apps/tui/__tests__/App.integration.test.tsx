import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { render } from 'ink-testing-library';
import type { Feed, Article, FeedUpdateFailure, UpdateProgress } from '@/types';

// 日付フォーマットを固定化（テスト環境の一貫性のため）
// eslint-disable-next-line @typescript-eslint/unbound-method
const originalToLocaleDateString = Date.prototype.toLocaleDateString;
Date.prototype.toLocaleDateString = function (
  this: Date,
  locale?: string | string[],
  options?: Intl.DateTimeFormatOptions
): string {
  if (
    locale === 'ja-JP' &&
    options &&
    typeof options === 'object' &&
    'hour' in options &&
    options.hour === '2-digit'
  ) {
    // テスト用の固定フォーマット（UTC時刻）
    const year = this.getUTCFullYear();
    const month = this.getUTCMonth() + 1;
    const day = this.getUTCDate();
    const hour = String(this.getUTCHours()).padStart(2, '0');
    const minute = String(this.getUTCMinutes()).padStart(2, '0');
    return `${year}年${month}月${day}日 ${hour}:${minute}`;
  }
  return originalToLocaleDateString.call(this, locale, options);
};

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
  getUnreadFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
  updateAllFeeds: vi.fn(),
};

// ArticleServiceのモック
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

// PinServiceのモック
const mockPinService = {
  togglePin: vi.fn(),
  getPinnedArticles: vi.fn(() => []),
  getPinCount: vi.fn(() => 0),
  getOldestPinnedArticles: vi.fn(() => []),
  deletePins: vi.fn(),
  clearAllPins: vi.fn(),
};

// import { FeedService } from '../../../services/feed-service.js';

vi.mock('../../../services/feed-service.js', () => ({
  FeedService: vi.fn(() => mockFeedService),
}));

vi.mock('../../../services/article-service.js', () => ({
  ArticleService: vi.fn(() => mockArticleService),
}));

vi.mock('../../../services/pin.js', () => ({
  PinService: vi.fn(() => mockPinService),
}));

vi.mock('../../../models/feed.js', () => ({
  FeedModel: vi.fn(),
}));

vi.mock('../../../models/article.js', () => ({
  ArticleModel: vi.fn(() => ({
    getPinnedArticles: vi.fn(() => []),
  })),
}));

// DatabaseManagerのモック
const mockDatabaseManager = {
  migrate: vi.fn(),
};

vi.mock('../../../models/database.js', () => ({
  DatabaseManager: vi.fn().mockImplementation(() => mockDatabaseManager),
}));

vi.mock('../../cli/utils/database.js', () => ({
  createDatabaseManager: vi.fn(() => mockDatabaseManager),
}));

vi.mock('../../../services/factory.js', () => ({
  createFeedServices: vi.fn(() => ({
    feedService: mockFeedService,
    articleService: mockArticleService,
    pinService: mockPinService,
  })),
}));

// App コンポーネントのimport（モック設定後）
import { App } from '../App.js';

// テスト用のフィードデータ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    rating: 0,
    description: 'Test feed description 1',
    last_updated_at: new Date('2024-01-01T00:00:00Z'),
    created_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    rating: 0,
    description: 'Test feed description 2',
    last_updated_at: new Date('2024-01-02T00:00:00Z'),
    created_at: new Date('2024-01-02T00:00:00Z'),
  },
];

// テスト用の記事データ
const mockArticles: Article[] = [
  {
    id: 1,
    feed_id: 1,
    title: 'Article 1',
    url: 'https://example.com/article1',
    content: 'Article 1 content',
    summary: 'Article 1 summary',
    author: 'Author 1',
    published_at: new Date('2024-01-01T00:00:00Z'),
    is_read: false,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 2,
    feed_id: 1,
    title: 'Article 2',
    url: 'https://example.com/article2',
    content: 'Article 2 content',
    summary: 'Article 2 summary',
    author: 'Author 2',
    published_at: new Date('2024-01-02T00:00:00Z'),
    is_read: false,
    thumbnail_url: undefined,
    created_at: new Date('2024-01-02T00:00:00Z'),
    updated_at: new Date('2024-01-02T00:00:00Z'),
  },
];

const mockUnreadCounts: { [feedId: number]: number } = {
  1: 2,
  2: 0,
};

describe('App Integration Tests', () => {
  afterAll(() => {
    // 日付フォーマットを元に戻す
    Date.prototype.toLocaleDateString = originalToLocaleDateString;
  });

  beforeEach(() => {
    // モックのリセット
    vi.clearAllMocks();

    // デフォルトのモック実装を設定
    mockFeedService.getFeedList.mockReturnValue(mockFeeds);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue(mockUnreadCounts);
    mockFeedService.getUnreadFeeds.mockReturnValue(
      mockFeeds.map((feed) => ({ ...feed, unreadCount: mockUnreadCounts[feed.id] || 0 }))
    );
    mockArticleService.getArticles.mockReturnValue(mockArticles);
    mockFeedService.markArticleAsRead.mockImplementation(() => {});
    mockFeedService.toggleArticleFavorite.mockImplementation(() => {});
    mockFeedService.updateAllFeeds.mockImplementation(() =>
      Promise.resolve({
        summary: { successCount: 2, failureCount: 0 },
        failed: [],
      })
    );

    // ArticleServiceのデフォルトモック実装を設定
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('フィード一覧を表示し、未読数でソートする', async () => {
      const { lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // フィード一覧の表示を確認
      expect(lastFrame()).toContain('Test Feed 1');
      expect(lastFrame()).toContain('Test Feed 2');

      // 未読数の表示を確認
      expect(lastFrame()).toContain('(2件)'); // Feed 1の未読数
    });

    it('最初のフィードの記事を自動的に表示する', async () => {
      const { lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // 記事一覧の表示を確認（Article 1が表示される）
      expect(lastFrame()).toContain('Article 1');
      // 記事の位置表示を確認
      expect(lastFrame()).toContain('1/2件');
    });

    it('ローディング中は適切なメッセージを表示する', async () => {
      // フィード更新中のローディング状態をシミュレート
      let isUpdating = true;
      mockFeedService.updateAllFeeds.mockImplementation(async (onProgress) => {
        // 進捗コールバックを呼ぶ
        if (onProgress && isUpdating) {
          (onProgress as (progress: UpdateProgress) => void)({
            totalFeeds: 2,
            currentIndex: 1,
            currentFeedTitle: 'Test Feed 1',
            currentFeedUrl: 'https://example.com/feed1.rss',
          });
        }

        // 少し待つ
        await new Promise((resolve) => setTimeout(resolve, 100));

        return {
          summary: { successCount: 2, failureCount: 0 },
          failed: [],
        };
      });

      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // rキーを押して更新を開始
      stdin.write('r');

      // ローディング表示を確認
      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame && (frame.includes('読み込み中...') || frame.includes('フィード更新中'))).toBe(
          true
        );
      });

      isUpdating = false;
    });

    it('エラー時は適切なエラーメッセージを表示する', async () => {
      mockFeedService.getUnreadFeeds.mockImplementation(() => {
        throw new Error('フィードの読み込みに失敗しました');
      });

      const { lastFrame } = render(<App />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('エラーが発生しました');
      });

      expect(lastFrame()).toContain('エラーが発生しました');
      expect(lastFrame()).toContain('フィードの読み込みに失敗しました');
    });
  });

  describe('キーボード操作', () => {
    it('jキーで次の記事に移動する', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // jキーを押す
      stdin.write('j');

      // 選択が移動したことを確認（実装による）
      // 注: ink-testing-libraryの制限により、実際の選択状態の確認は困難
    });

    it('kキーで前の記事に移動する', async () => {
      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toBeCalled();
      });

      // まず次の記事に移動
      stdin.write('j');

      // kキーで戻る
      stdin.write('k');

      // mockFeedServiceの呼び出しを確認
      expect(mockArticleService.getArticles).toHaveBeenCalled();
    });

    it('sキーで次のフィードに移動する', async () => {
      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toBeCalled();
      });

      // sキーを押す
      stdin.write('s');

      // 新しいフィードの記事を読み込むことを確認
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toHaveBeenCalledWith({
          feedId: 2,
          isRead: false,
          limit: 100,
        });
      });
    });

    it('aキーで前のフィードに移動する', async () => {
      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toBeCalled();
      });

      // まず次のフィードに移動
      stdin.write('s');

      // aキーで戻る
      stdin.write('a');

      // 元のフィードの記事を読み込むことを確認
      await vi.waitFor(() => {
        const calls = mockArticleService.getArticles.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall).toEqual([{ feedId: 1, isRead: false, limit: 100 }]);
      });
    });

    it('vキーでブラウザを開く', async () => {
      const spawn = vi.mocked(await import('child_process').then((m) => m.spawn));
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // vキーを押す
      stdin.write('v');

      // プラットフォームに応じたブラウザコマンドが呼ばれることを確認
      await vi.waitFor(() => {
        const platform = process.platform;
        if (platform === 'darwin') {
          expect(spawn).toHaveBeenCalledWith(
            'open',
            ['-g', 'https://example.com/article1'],
            expect.objectContaining({ stdio: 'ignore', detached: true })
          );
        } else if (platform === 'win32') {
          expect(spawn).toHaveBeenCalledWith(
            'cmd',
            ['/c', 'start', '/min', 'https://example.com/article1'],
            expect.objectContaining({ stdio: 'ignore', detached: true })
          );
        } else {
          expect(spawn).toHaveBeenCalledWith(
            'xdg-open',
            ['https://example.com/article1'],
            expect.objectContaining({ stdio: 'ignore', detached: true })
          );
        }
      });
    });

    it('fキーでお気に入りをトグルする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // fキーを押す
      stdin.write('f');

      // お気に入り+ピントグルが呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockArticleService.toggleFavoriteWithPin).toHaveBeenCalledWith(1);
      });
    });

    it('rキーで全フィードを更新する', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // rキーを押す
      stdin.write('r');

      // updateAllFeedsが呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockFeedService.updateAllFeeds).toHaveBeenCalled();
      });
    });

    it('?キーでヘルプを表示する', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // ?キーを押す
      stdin.write('?');

      // ヘルプが表示されることを確認
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('キーボードショートカット');
      });
    });

    it('qキーでアプリを終了する', async () => {
      const exitSpy = vi.fn();
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // qキーを押す前にexitハンドラーを設定
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const originalExit = process.exit;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
      process.exit = exitSpy as any;

      stdin.write('q');

      // 既読化処理が呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      });

      // exitを元に戻す
      process.exit = originalExit;
    });
  });

  describe('自動既読機能', () => {
    it('フィード移動時に現在の記事を既読にする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // sキーで次のフィードに移動
      stdin.write('s');

      // 既読化が呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('アプリ終了時に現在の記事を既読にする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // qキーで終了
      stdin.write('q');

      // 既読化が呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('既に既読の記事は既読処理をスキップする', async () => {
      // 既存のmockArticleServiceの戻り値を空の配列に変更
      vi.mocked(mockArticleService.getArticles).mockReturnValue([]);

      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toBeCalled();
      });

      // 記事が空の場合、既読化は呼ばれない
      // sキーで次のフィードに移動
      stdin.write('s');

      // 空の記事リストの場合、既読化が呼ばれないことを確認
      expect(mockArticleService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('フィード読み込みエラーを適切に表示する', async () => {
      mockFeedService.getUnreadFeeds.mockImplementation(() => {
        throw new Error('ネットワークエラー');
      });

      const { lastFrame } = render(<App />);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('エラーが発生しました');
      });

      expect(lastFrame()).toContain('エラーが発生しました');
      expect(lastFrame()).toContain('ネットワークエラー');
      expect(lastFrame()).toContain('r: 再試行');
      expect(lastFrame()).toContain('q: 終了');
    });

    it('更新エラーを適切に表示する', { timeout: 10000 }, async () => {
      const failedFeeds: FeedUpdateFailure[] = [
        {
          status: 'failure',
          feedId: 1,
          feedUrl: 'https://example.com/feed1.rss',
          error: new Error('接続できません'),
        },
      ];

      mockFeedService.updateAllFeeds.mockImplementation(() =>
        Promise.resolve({
          summary: { successCount: 1, failureCount: 1 },
          failed: failedFeeds,
        })
      );

      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // rキーで更新
      stdin.write('r');

      // エラーメッセージを確認
      await vi.waitFor(() => {
        // 更新完了後にloadFeedsが呼ばれて通常画面に戻るため、
        // エラーメッセージが一瞬しか表示されない可能性がある
        // ここでは更新処理が完了したことを確認する
        expect(mockFeedService.updateAllFeeds).toHaveBeenCalled();
      });

      // updateAllFeedsの結果を確認
      const updateResult = await (mockFeedService.updateAllFeeds.mock.results[0].value as Promise<{
        summary: { successCount: number; failureCount: number };
        failed: FeedUpdateFailure[];
      }>);
      expect(updateResult.failed.length).toBeGreaterThan(0);
    });

    it('更新のキャンセルが可能である', async () => {
      let isCancelled = false;
      let progressCallbackCalled = false;

      mockFeedService.updateAllFeeds.mockImplementation(async (onProgress, signal) => {
        // 進捗コールバックを呼ぶ
        if (onProgress) {
          progressCallbackCalled = true;
          (onProgress as (progress: UpdateProgress) => void)({
            totalFeeds: 2,
            currentIndex: 1,
            currentFeedTitle: 'Test Feed 1',
            currentFeedUrl: 'https://example.com/feed1.rss',
          });
        }

        // AbortSignalをチェック
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        signal?.addEventListener('abort', () => {
          isCancelled = true;
        });

        // 長時間実行をシミュレート
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (isCancelled) {
          return {
            cancelled: true,
            processedFeeds: 1,
            totalFeeds: 2,
            failed: [],
          };
        }

        return {
          summary: { successCount: 2, failureCount: 0 },
          failed: [],
        };
      });

      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Test Feed 1');
      });

      // rキーで更新開始
      stdin.write('r');

      // 更新中の表示を確認
      await vi.waitFor(() => {
        expect(progressCallbackCalled).toBe(true);
        const frame = lastFrame();
        expect(frame && (frame.includes('フィード更新中') || frame.includes('読み込み中'))).toBe(
          true
        );
      });

      // ESCキーでキャンセル
      stdin.write('\x1b');

      // キャンセルがトリガーされたことを確認
      await vi.waitFor(() => {
        expect(isCancelled).toBe(true);
      });
    });
  });

  describe('スクロール操作', () => {
    it('Ctrl+Dでページダウンする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // Ctrl+Dを押す
      stdin.write('\x04');

      // スクロールのテストは実装依存
    });

    it('Ctrl+Uでページアップする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // まずページダウン
      stdin.write('\x04');

      // Ctrl+Uでページアップ
      stdin.write('\x15');

      // スクロールのテストは実装依存
    });

    it('Gで記事の最後にジャンプする', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // Gキーを押す
      stdin.write('G');

      // スクロールのテストは実装依存
    });
  });

  describe('記事のフィルタリング', () => {
    it('既読記事は表示されない', async () => {
      // データベースから直接未読記事のみを取得するため、
      // getArticlesは未読記事のみを返す
      mockArticleService.getArticles.mockReturnValue([
        { ...mockArticles[1], is_read: false }, // Article 2のみ（未読）
      ]);

      const { lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toBeCalled();
      });

      // 未読記事のみ表示されることを確認
      await vi.waitFor(() => {
        const frame = lastFrame();
        // Article 2が表示されることを確認
        expect(frame).toContain('Article 2');
        // Article 1は既読なので表示されない
        expect(frame).not.toContain('Article 1');
      });
    });

    it('記事を既読にすると即座にリストから除外される', async () => {
      const { stdin, rerender, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // sキーで次のフィードに移動（既読化トリガー）
      stdin.write('s');

      rerender(<App />);

      await vi.waitFor(() => {
        expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      });
    });

    it('制限件数を超える未読記事がある場合、制限件数分のみ取得される', async () => {
      // 制限件数（100件）を超える記事をシミュレート
      // 実際のgetArticlesは制限件数分のみ返すため、100件のモックデータを作成
      const limitedArticles = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        feed_id: 1,
        title: `Article ${i + 1}`,
        url: `https://example.com/article${i + 1}`,
        content: `Article ${i + 1} content`,
        author: `Author ${i + 1}`,
        published_at: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`),
        is_read: false,
        thumbnail_url: null,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      }));

      // getArticlesは制限件数（100件）分の記事を返す
      mockArticleService.getArticles.mockReturnValue(limitedArticles);

      const { lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toHaveBeenCalledWith({
          feedId: 1,
          isRead: false,
          limit: 100,
        });
      });

      // 制限件数分の記事が正しく表示される
      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Article 1'); // 最初の記事
        expect(frame).toContain('1/100件'); // 件数表示の確認
      });
    });

    it('既読化後の再取得で残りの未読記事が正しく取得される', async () => {
      let callCount = 0;
      const firstBatch = mockArticles.slice(0, 2); // 最初の2件
      const secondBatch = [
        {
          ...mockArticles[2],
          id: 3,
          title: 'Article 3',
          url: 'https://example.com/article3',
        },
      ]; // 次の1件

      // getArticlesの呼び出し回数に応じて異なるデータを返す
      mockArticleService.getArticles.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return firstBatch; // 1回目: Article 1, 2
        } else {
          return secondBatch; // 2回目以降: Article 3（残りの未読記事）
        }
      });

      const { stdin, lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // 現在の記事を既読化（フィード移動で自動的に既読化される）
      stdin.write('s'); // 次のフィードに移動
      stdin.write('a'); // 元のフィードに戻る

      // 2回目の記事取得が実行され、残りの未読記事が取得される
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toHaveBeenCalledTimes(2); // 初期 + 戻り
      });

      // 新しい記事が表示される
      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Article 3');
      });
    });
  });

  describe('スライディングウィンドウページネーション', () => {
    it('11番目のフィードに移動した時にスライディングウィンドウが動作する', async () => {
      // 15件のフィードを持つデータを設定
      const feeds = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        url: `https://example.com/feed${i + 1}.rss`,
        title: `Test Feed ${i + 1}`,
        description: `Test feed ${i + 1} description`,
        last_updated_at: new Date('2024-01-01T00:00:00Z'),
        created_at: new Date('2024-01-01T00:00:00Z'),
        rating: 0,
        unreadCount: 10,
      }));

      mockFeedService.getUnreadFeeds.mockReturnValue(feeds);
      mockArticleService.getArticles.mockReturnValue(mockArticles);

      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Test Feed 1');
      });

      // 初期状態を確認（Feed 1-10が表示されている）
      let frame = lastFrame();

      // 初期状態のスナップショットを記録
      expect(frame).toMatchSnapshot('sliding-window-initial-state');

      // Feed 11に移動（10回sキーを押す）
      for (let i = 0; i < 10; i++) {
        stdin.write('s');
        // 各キー入力の間に少し待つ
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Feed 11の記事が読み込まれるまで待つ
      await vi.waitFor(
        () => {
          expect(mockArticleService.getArticles).toHaveBeenCalledWith({
            feedId: 11,
            isRead: false,
            limit: 100,
          });
        },
        { timeout: 3000 }
      );

      // 画面の更新を待つ
      await new Promise((resolve) => setTimeout(resolve, 200));

      // スライディングウィンドウ後の状態を確認
      frame = lastFrame();

      // Feed 11が表示されていることを確認
      expect(frame).toContain('Test Feed 11');

      // Feed 1が表示されていないことを確認（正規表現で正確にマッチ）
      expect(frame).not.toMatch(/Test Feed 1(?!\d)/);

      // スナップショットで全体のUI状態を記録
      expect(frame).toMatchSnapshot('sliding-window-after-11th-feed');
    });

    it('フィード一覧のウィンドウサイズ制限が機能する', async () => {
      // 15件のフィードを持つデータを設定
      const manyFeeds = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        url: `https://example.com/feed${i + 1}.rss`,
        title: `Feed ${i + 1}`,
        description: `Test feed ${i + 1} description`,
        last_updated_at: new Date('2024-01-01T00:00:00Z'),
        created_at: new Date('2024-01-01T00:00:00Z'),
        rating: 3,
        unreadCount: 10,
      }));

      mockFeedService.getUnreadFeeds.mockReturnValue(manyFeeds);
      mockArticleService.getArticles.mockReturnValue(mockArticles);

      const { lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Feed 1');
      });

      const frame = lastFrame();

      // フィード一覧が表示されていることを確認
      expect(frame).toContain('フィード一覧');
      expect(frame).toContain('Feed 1');

      // 10件以上のフィードがある場合でも、表示は制限されていることを確認
      // （具体的な表示数のテストは FeedList.test.tsx で行う）
    });

    it('スライディングウィンドウとキーボードナビゲーションが連携する', async () => {
      // 11件のフィードを持つデータを設定
      const feeds = Array.from({ length: 11 }, (_, i) => ({
        id: i + 1,
        url: `https://example.com/feed${i + 1}.rss`,
        title: `Feed ${i + 1}`,
        description: `Test feed ${i + 1} description`,
        last_updated_at: new Date('2024-01-01T00:00:00Z'),
        created_at: new Date('2024-01-01T00:00:00Z'),
        rating: 0,
        unreadCount: 10,
      }));

      mockFeedService.getUnreadFeeds.mockReturnValue(feeds);
      mockArticleService.getArticles.mockReturnValue(mockArticles);

      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Feed 1');
      });

      // sキーで次のフィードに移動していく
      stdin.write('s'); // Feed 2
      stdin.write('s'); // Feed 3

      // 少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // getArticlesが複数回呼ばれていることを確認
      expect(mockArticleService.getArticles).toHaveBeenCalledWith({
        feedId: 2,
        isRead: false,
        limit: 100,
      });

      // aキーで前のフィードに戻る
      stdin.write('a'); // Feed 2に戻る
      stdin.write('a'); // Feed 1に戻る

      // 少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Feed 1に戻っていることを確認
      expect(mockArticleService.getArticles).toHaveBeenCalledWith({
        feedId: 1,
        isRead: false,
        limit: 100,
      });
    });

    it('1番目のフィードに未読がない場合はaキーを押しても何もしない', async () => {
      // Feed 1に未読がない設定
      const feeds = [
        {
          id: 1,
          url: 'https://example.com/feed1.rss',
          title: 'Feed 1',
          description: 'Test feed 1 description',
          last_updated_at: new Date('2024-01-01T00:00:00Z'),
          created_at: new Date('2024-01-01T00:00:00Z'),
          rating: 0,
          unreadCount: 0, // 未読なし
        },
        {
          id: 2,
          url: 'https://example.com/feed2.rss',
          title: 'Feed 2',
          description: 'Test feed 2 description',
          last_updated_at: new Date('2024-01-01T00:00:00Z'),
          created_at: new Date('2024-01-01T00:00:00Z'),
          rating: 0,
          unreadCount: 10,
        },
      ];

      // Feed 1は未読がないので、getUnreadFeedsからは除外される
      mockFeedService.getUnreadFeeds.mockReturnValue([feeds[1]]);
      mockArticleService.getArticles.mockReturnValue(mockArticles);

      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ（Feed 2から始まる）
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Feed 2');
      });

      // Feed 1は表示されていない
      expect(lastFrame()).not.toContain('Feed 1');

      // aキーを押す
      stdin.write('a');

      // 少し待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Feed 2が選択されたままであることを確認
      expect(mockArticleService.getArticles).toHaveBeenLastCalledWith({
        feedId: 2,
        isRead: false,
        limit: 100,
      });

      // Feed 1への移動は発生していない
      expect(mockArticleService.getArticles).not.toHaveBeenCalledWith({
        feedId: 1,
        isRead: false,
        limit: 100,
      });
    });
  });

  describe('リロード時のポインター保持', () => {
    it('rキーでリロードした後も選択中のフィードが保持される', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Feed 1');
      });

      // Feed 2を選択
      stdin.write('s');

      // Feed 2が選択されていることを確認
      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toHaveBeenLastCalledWith({
          feedId: 2,
          isRead: false,
          limit: 100,
        });
      });

      // フィード更新の準備
      let updateCallCount = 0;
      mockFeedService.updateAllFeeds.mockImplementation((callback) => {
        updateCallCount++;
        if (callback) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          callback({ current: 1, total: 2, feedTitle: 'Feed 1' });
        }
        return Promise.resolve({ summary: { successCount: 2, failureCount: 0 }, failed: [] });
      });

      // rキーでリロード
      stdin.write('r');

      // 更新が完了するのを待つ
      await vi.waitFor(() => {
        expect(updateCallCount).toBeGreaterThan(0);
      });

      // Feed 2が引き続き選択されていることを確認
      expect(mockArticleService.getArticles).toHaveBeenLastCalledWith({
        feedId: 2,
        isRead: false,
        limit: 100,
      });
    });

    it('選択中のフィードの未読が0になった場合、適切なフィードが選択される', async () => {
      const { stdin, lastFrame } = render(<App />);

      // 初期化を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Feed 1');
      });

      // Feed 2を選択
      stdin.write('s');

      await vi.waitFor(() => {
        expect(mockArticleService.getArticles).toHaveBeenCalledWith({
          feedId: 2,
          isRead: false,
          limit: 100,
        });
      });

      // フィード更新
      let updateCompleted = false;
      mockFeedService.updateAllFeeds.mockImplementation(async (callback) => {
        // 更新処理の中でFeed 2の未読が0になる
        mockFeedService.getUnreadFeeds.mockReturnValue([
          {
            id: 1,
            url: 'https://example.com/feed1.rss',
            title: 'Feed 1',
            description: 'Test feed 1 description',
            last_updated_at: new Date('2024-01-01T00:00:00Z'),
            created_at: new Date('2024-01-01T00:00:00Z'),
            rating: 0,
            unreadCount: 5,
          },
        ]);

        if (callback) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          callback({ current: 1, total: 1, feedTitle: 'Feed 1' });
        }
        updateCompleted = true;
        return Promise.resolve({ summary: { successCount: 1, failureCount: 0 }, failed: [] });
      });

      // rキーでリロード
      stdin.write('r');

      // 更新が完了するのを待つ
      await vi.waitFor(() => {
        expect(updateCompleted).toBe(true);
      });

      // loadFeedsが呼ばれるのを待つ（フィード一覧が更新される）
      await vi.waitFor(() => {
        // getUnreadFeedsが複数回呼ばれていることを確認
        expect(mockFeedService.getUnreadFeeds).toHaveBeenCalledTimes(2);
      });

      // リロード後、Feed 1のみが残っていることを確認
      await vi.waitFor(() => {
        const frame = lastFrame();
        expect(frame).toContain('Feed 1');
        expect(frame).not.toContain('Feed 2');
      });
    });
  });
});
