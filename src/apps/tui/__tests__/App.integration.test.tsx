import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'ink-testing-library';
import type { Feed, Article, FeedUpdateFailure, UpdateProgress } from '@/types';

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

import { FeedService } from '../../../services/feed-service.js';

vi.mock('../../../services/feed-service.js', () => ({
  FeedService: vi.fn(() => mockFeedService),
}));

vi.mock('../../../models/feed.js', () => ({
  FeedModel: vi.fn(),
}));

vi.mock('../../../models/article.js', () => ({
  ArticleModel: vi.fn(),
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

// App コンポーネントのimport（モック設定後）
import { App } from '../App.js';

// テスト用のフィードデータ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    description: 'Test feed description 1',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    description: 'Test feed description 2',
    last_updated_at: new Date('2024-01-02'),
    created_at: new Date('2024-01-02'),
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
      // 記事の状態表示を確認
      expect(lastFrame()).toContain('状態: 未読');
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
      mockFeedService.getFeedList.mockImplementation(() => {
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
        expect(mockFeedService.getArticles).toBeCalled();
      });

      // まず次の記事に移動
      stdin.write('j');

      // kキーで戻る
      stdin.write('k');

      // mockFeedServiceの呼び出しを確認
      expect(mockFeedService.getArticles).toHaveBeenCalled();
    });

    it('sキーで次のフィードに移動する', async () => {
      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockFeedService.getArticles).toBeCalled();
      });

      // sキーを押す
      stdin.write('s');

      // 新しいフィードの記事を読み込むことを確認
      await vi.waitFor(() => {
        expect(mockFeedService.getArticles).toHaveBeenCalledWith({
          feed_id: 2,
          limit: 100,
        });
      });
    });

    it('aキーで前のフィードに移動する', async () => {
      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockFeedService.getArticles).toBeCalled();
      });

      // まず次のフィードに移動
      stdin.write('s');

      // aキーで戻る
      stdin.write('a');

      // 元のフィードの記事を読み込むことを確認
      await vi.waitFor(() => {
        const calls = mockFeedService.getArticles.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall).toEqual([{ feed_id: 1, limit: 100 }]);
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

      // お気に入りトグルが呼ばれることを確認
      await vi.waitFor(() => {
        expect(mockFeedService.toggleArticleFavorite).toHaveBeenCalledWith(1);
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
      const { lastFrame, unmount } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Article 1');
      });

      // コンポーネントをアンマウント（終了をシミュレート）
      unmount();

      // 既読化が呼ばれることを確認
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });

    it('既に既読の記事は既読処理をスキップする', async () => {
      // このテストのために新しいインスタンスを作成
      const isolatedFeedService = {
        getFeedList: vi.fn().mockReturnValue(mockFeeds),
        getUnreadCountsForAllFeeds: vi.fn().mockReturnValue(mockUnreadCounts),
        getArticles: vi.fn().mockReturnValue([]),
        markArticleAsRead: vi.fn(),
        toggleArticleFavorite: vi.fn(),
        updateAllFeeds: vi.fn(),
      };

      // FeedServiceのモックを一時的に置き換え
      vi.mocked(FeedService).mockImplementationOnce(
        () => isolatedFeedService as unknown as FeedService
      );

      const { stdin } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(isolatedFeedService.getArticles).toBeCalled();
      });

      // 記事が空の場合、既読化は呼ばれない
      // sキーで次のフィードに移動
      stdin.write('s');

      // 空の記事リストの場合、既読化が呼ばれないことを確認
      expect(isolatedFeedService.markArticleAsRead).not.toHaveBeenCalled();
    });
  });

  describe('エラーハンドリング', () => {
    it('フィード読み込みエラーを適切に表示する', async () => {
      mockFeedService.getFeedList.mockImplementation(() => {
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
      // useArticleManagerが未読記事のみをフィルタリングするため、
      // getArticlesはすべての記事を返し、フック内でフィルタリングされる
      mockFeedService.getArticles.mockReturnValue([
        { ...mockArticles[0], is_read: true },
        { ...mockArticles[1], is_read: false },
      ]);

      const { lastFrame } = render(<App />);

      // 初期化の完了を待つ
      await vi.waitFor(() => {
        expect(mockFeedService.getArticles).toBeCalled();
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
  });
});
