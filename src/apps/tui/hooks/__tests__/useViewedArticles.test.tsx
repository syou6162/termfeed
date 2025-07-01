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

interface TestComponentProps {
  feedService: FeedService;
  onActionsReady?: (actions: ReturnType<typeof useViewedArticles>) => void;
}

function TestComponent({ feedService, onActionsReady }: TestComponentProps) {
  const actions = useViewedArticles(feedService);

  // コールバックでアクションを通知
  useEffect(() => {
    onActionsReady?.(actions);
  }, [actions, onActionsReady]);

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
  });

  describe('フックの基本的な動作', () => {
    it('記事を閲覧済みとして記録できる', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      // アクションが設定されるまで待つ
      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 初期状態
      expect(lastFrame()).toContain('Count: 0');
      expect(lastFrame()).toContain('Has: false');
      expect(lastFrame()).toContain('IDs:');

      // 記事を閲覧済みとして記録
      actions!.recordArticleView(123);

      // 更新を待つ
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('Has: true');
        expect(lastFrame()).toContain('IDs: 123');
      });
    });

    it('同じ記事IDを複数回記録しても重複しない', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 同じIDを3回記録
      actions!.recordArticleView(123);
      actions!.recordArticleView(123);
      actions!.recordArticleView(123);

      // 1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 123');
      });

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(123);
    });

    it('undefinedのIDは記録されない', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // undefinedを記録
      actions!.recordArticleView(undefined);

      // 何も記録されない
      expect(lastFrame()).toContain('Count: 0');
      expect(lastFrame()).toContain('IDs:');

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 何も呼ばれない
      expect(mockFeedService.markArticleAsRead).not.toHaveBeenCalled();
    });

    it('複数の異なる記事を記録できる', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 複数の記事を記録
      actions!.recordArticleView(1);
      actions!.recordArticleView(2);
      actions!.recordArticleView(3);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 3');
      });

      // IDsはSetなので順序が保証されないため、個別にチェック
      expect(lastFrame()).toMatch(/IDs: .*1/);
      expect(lastFrame()).toMatch(/IDs: .*2/);
      expect(lastFrame()).toMatch(/IDs: .*3/);

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 3回呼ばれる
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(3);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(2);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);
    });
  });

  describe('既読化処理', () => {
    it('既読化後は閲覧済みリストがクリアされる', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 記事を記録
      actions!.recordArticleView(1);
      actions!.recordArticleView(2);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 2');
      });

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // リストがクリアされる
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 0');
        expect(lastFrame()).toContain('Has: false');
        expect(lastFrame()).toContain('IDs:');
      });

      // 再度既読化しても何も起きない
      vi.clearAllMocks();
      actions!.markViewedArticlesAsRead();
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

      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 記事を記録
      actions!.recordArticleView(1);
      actions!.recordArticleView(2);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 2');
      });

      // 既読化を実行（エラーが発生）
      actions!.markViewedArticlesAsRead();

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
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 最初の記事（ID: 1）でkキーを3回押す想定
      actions!.recordArticleView(1);
      actions!.recordArticleView(1);
      actions!.recordArticleView(1);

      // Setなので1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 1');
      });

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる（重複防止）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
    });

    it('最後の記事でjキー連打時の動作', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 最後の記事（ID: 10）でjキーを3回押す想定
      actions!.recordArticleView(10);
      actions!.recordArticleView(10);
      actions!.recordArticleView(10);

      // Setなので1つだけ記録される
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 1');
        expect(lastFrame()).toContain('IDs: 10');
      });

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 1回だけ呼ばれる（重複防止）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(10);
    });

    it('通常の記事移動シミュレーション', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 記事1から開始
      actions!.recordArticleView(1);

      // jキーで記事2へ
      actions!.recordArticleView(2);

      // jキーで記事3へ
      actions!.recordArticleView(3);

      // kキーで記事2へ戻る（重複）
      actions!.recordArticleView(2);

      // Setなので重複しない
      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Count: 3');
      });

      // IDsはSetなので順序が保証されないため、個別にチェック
      expect(lastFrame()).toMatch(/IDs: .*1/);
      expect(lastFrame()).toMatch(/IDs: .*2/);
      expect(lastFrame()).toMatch(/IDs: .*3/);

      // 既読化を実行
      actions!.markViewedArticlesAsRead();

      // 3回だけ呼ばれる（記事2の重複は防がれる）
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(3);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(2);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);
    });
  });

  describe('hasViewedArticlesプロパティ', () => {
    it('閲覧済み記事の有無を正しく反映する', async () => {
      let actions: ReturnType<typeof useViewedArticles>;
      const { lastFrame } = render(
        <TestComponent
          feedService={mockFeedService as FeedService}
          onActionsReady={(a) => {
            actions = a;
          }}
        />
      );

      await vi.waitFor(() => {
        expect(actions!).toBeDefined();
      });

      // 初期状態
      expect(lastFrame()).toContain('Has: false');

      // 記事を追加
      actions!.recordArticleView(1);

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Has: true');
      });

      // 既読化してクリア
      actions!.markViewedArticlesAsRead();

      await vi.waitFor(() => {
        expect(lastFrame()).toContain('Has: false');
      });
    });
  });
});
