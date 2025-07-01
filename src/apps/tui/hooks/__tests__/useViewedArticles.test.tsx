import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { useEffect } from 'react';
import { useViewedArticles } from '../useViewedArticles.js';
import type { FeedService } from '../../../../services/feed-service.js';

/**
 * useViewedArticlesフックのテスト用コンポーネント
 * ink-testing-libraryのパターンに従い、フックを使うコンポーネントを作成してテスト
 */

// グローバル変数を拡張
declare global {
  var testActionsRef: { current: ReturnType<typeof useViewedArticles> | null };
}

// テスト用のグローバル変数を初期化
globalThis.testActionsRef = { current: null };

function TestComponent({ feedService }: { feedService: FeedService }) {
  const actions = useViewedArticles(feedService);

  // アクションを実行する関数をグローバルに設定
  useEffect(() => {
    globalThis.testActionsRef.current = actions;
  });

  return (
    <Text>
      Count: {actions.getViewedCount()}, Has: {actions.hasViewedArticles ? 'true' : 'false'}, IDs:{' '}
      {actions.viewedArticleIds.join(',')}
    </Text>
  );
}

describe('useViewedArticles', () => {
  let mockFeedService: Partial<FeedService>;

  beforeEach(() => {
    mockFeedService = {
      markArticleAsRead: vi.fn().mockReturnValue(true),
    };
    globalThis.testActionsRef.current = null;
  });

  describe('フックの基本的な動作', () => {
    it('記事を閲覧済みとして記録できる', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      // グローバル変数が設定されるまで待つ
      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 初期状態
      expect(lastFrame()).toContain('Count: 0');
      expect(lastFrame()).toContain('Has: false');
      expect(lastFrame()).toContain('IDs:');

      // 記事を閲覧済みとして記録
      globalThis.testActionsRef.current!.recordArticleView(123);

      // 更新を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('Has: true');
        expect(lastFrame()).toContain('IDs: 123');
      });
    });

    it('同じ記事IDを複数回記録しても重複しない', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 同じIDを3回記録
      globalThis.testActionsRef.current!.recordArticleView(123);
      globalThis.testActionsRef.current!.recordArticleView(123);
      globalThis.testActionsRef.current!.recordArticleView(123);

      // 1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 123');
      });

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(123);
    });

    it('undefinedのIDは記録されない', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // undefinedを記録
      globalThis.testActionsRef.current!.recordArticleView(undefined);

      // 何も記録されない
      expect(lastFrame()).toContain('Count: 0');
      expect(lastFrame()).toContain('IDs:');

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 何も呼ばれない
      expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    });

    it('複数の異なる記事を記録できる', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 複数の記事を記録
      globalThis.testActionsRef.current!.recordArticleView(1);
      globalThis.testActionsRef.current!.recordArticleView(2);
      globalThis.testActionsRef.current!.recordArticleView(3);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 3');
      });

      // IDsはSetなので順序が保証されないため、個別にチェック
      expect(lastFrame()).toMatch(/IDs: .*1/);
      expect(lastFrame()).toMatch(/IDs: .*2/);
      expect(lastFrame()).toMatch(/IDs: .*3/);

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 3回呼ばれる
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(3);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(2);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);
    });
  });

  describe('既読化処理', () => {
    it('既読化後は閲覧済みリストがクリアされる', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 記事を記録
      globalThis.testActionsRef.current!.recordArticleView(1);
      globalThis.testActionsRef.current!.recordArticleView(2);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 2');
      });

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // リストがクリアされる
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 0');
        expect(lastFrame()).toContain('Has: false');
        expect(lastFrame()).toContain('IDs:');
      });

      // 再度既読化しても何も起きない
      vi.clearAllMocks();
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();
      expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    });

    it('エラーが発生してもクラッシュしない', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFeedService.markArticleAsRead = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('DB Error');
        })
        .mockReturnValueOnce(true);

      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 記事を記録
      globalThis.testActionsRef.current!.recordArticleView(1);
      globalThis.testActionsRef.current!.recordArticleView(2);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 2');
      });

      // 既読化を実行（エラーが発生）
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // エラーが記録される
      expect(consoleErrorSpy).toHaveBeenCalledWith('記事 1 の既読化に失敗:', expect.any(Error));
      // 2番目の記事は成功
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(2);

      // エラーが発生してもリストはクリアされる
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 0');
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('記事移動時の重複防止', () => {
    it('最初の記事でkキー連打時の動作', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 最初の記事（ID: 1）でkキーを3回押す想定
      globalThis.testActionsRef.current!.recordArticleView(1);
      globalThis.testActionsRef.current!.recordArticleView(1);
      globalThis.testActionsRef.current!.recordArticleView(1);

      // Setなので1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 1');
      });

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる（重複防止）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });

    it('最後の記事でjキー連打時の動作', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 最後の記事（ID: 10）でjキーを3回押す想定
      globalThis.testActionsRef.current!.recordArticleView(10);
      globalThis.testActionsRef.current!.recordArticleView(10);
      globalThis.testActionsRef.current!.recordArticleView(10);

      // Setなので1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 10');
      });

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる（重複防止）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(10);
    });

    it('通常の記事移動シミュレーション', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 記事1から開始
      globalThis.testActionsRef.current!.recordArticleView(1);

      // jキーで記事2へ
      globalThis.testActionsRef.current!.recordArticleView(2);

      // jキーで記事3へ
      globalThis.testActionsRef.current!.recordArticleView(3);

      // kキーで記事2へ戻る（重複）
      globalThis.testActionsRef.current!.recordArticleView(2);

      // Setなので重複しない
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 3');
      });

      // IDsはSetなので順序が保証されないため、個別にチェック
      expect(lastFrame()).toMatch(/IDs: .*1/);
      expect(lastFrame()).toMatch(/IDs: .*2/);
      expect(lastFrame()).toMatch(/IDs: .*3/);

      // 既読化を実行
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      // 3回だけ呼ばれる（記事2の重複は防がれる）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(3);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(2);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);
    });
  });

  describe('hasViewedArticlesプロパティ', () => {
    it('閲覧済み記事の有無を正しく反映する', async () => {
      const { lastFrame } = render(<TestComponent feedService={mockFeedService as FeedService} />);

      await vi.waitFor(() => {
        expect(globalThis.testActionsRef.current).toBeDefined();
      });

      // 初期状態
      expect(lastFrame()).toContain('Has: false');

      // 記事を追加
      globalThis.testActionsRef.current!.recordArticleView(1);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Has: true');
      });

      // 既読化してクリア
      globalThis.testActionsRef.current!.markViewedArticlesAsRead();

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Has: false');
      });
    });
  });
});
