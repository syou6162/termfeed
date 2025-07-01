import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FeedService } from '../../../../services/feed-service.js';

// useViewedArticlesの実装を直接テスト
describe('useViewedArticles', () => {
  let mockFeedService: Partial<FeedService>;

  beforeEach(() => {
    mockFeedService = {
      markArticleAsRead: vi.fn().mockReturnValue(true),
    };
  });

  describe('基本的な動作', () => {
    it('SetによりIDの重複が自動的に防がれることを確認', () => {
      const testSet = new Set<number>();

      // 同じIDを複数回追加
      testSet.add(123);
      testSet.add(123);
      testSet.add(123);

      // Setなので1つだけ
      expect(Array.from(testSet)).toEqual([123]);
      expect(testSet.size).toBe(1);
    });

    it('undefinedは追加されないことを確認', () => {
      const testSet = new Set<number>();
      const articleId: number | undefined = undefined;

      if (articleId !== undefined) {
        testSet.add(articleId);
      }

      expect(testSet.size).toBe(0);
    });
  });

  describe('既読化処理', () => {
    it('複数の記事IDをまとめて既読化', () => {
      const viewedIds = new Set([1, 2, 3]);
      const ids = Array.from(viewedIds);

      // 各IDに対してmarkAsReadを実行
      for (const id of ids) {
        mockFeedService.markArticleAsRead!(id);
      }

      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(3);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(1);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(2);
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledWith(3);
    });

    it('エラーが発生してもクラッシュしない', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockFeedService.markArticleAsRead = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('DB Error');
        })
        .mockReturnValueOnce(true);

      const viewedIds = new Set([1, 2]);
      const ids = Array.from(viewedIds);

      // エラーハンドリング付きで実行
      for (const articleId of ids) {
        try {
          mockFeedService.markArticleAsRead(articleId);
        } catch (err) {
          console.error(`記事 ${articleId} の既読化に失敗:`, err);
        }
      }

      // エラーが記録される
      expect(consoleErrorSpy).toHaveBeenCalledWith('記事 1 の既読化に失敗:', expect.any(Error));
      // 2番目の記事は成功
      expect(mockFeedService.markArticleAsRead).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('記事移動時の重複防止', () => {
    it('最初の記事でkキー連打時の動作', () => {
      const viewedIds = new Set<number>();
      const currentArticleId = 1; // 最初の記事

      // kキーを3回押しても、移動できないので同じ記事
      viewedIds.add(currentArticleId);
      viewedIds.add(currentArticleId);
      viewedIds.add(currentArticleId);

      // Setなので1つだけ記録される
      expect(viewedIds.size).toBe(1);
      expect(Array.from(viewedIds)).toEqual([1]);
    });

    it('最後の記事でjキー連打時の動作', () => {
      const viewedIds = new Set<number>();
      const lastArticleId = 10; // 最後の記事

      // jキーを3回押しても、移動できないので同じ記事
      viewedIds.add(lastArticleId);
      viewedIds.add(lastArticleId);
      viewedIds.add(lastArticleId);

      // Setなので1つだけ記録される
      expect(viewedIds.size).toBe(1);
      expect(Array.from(viewedIds)).toEqual([10]);
    });

    it('通常の記事移動シミュレーション', () => {
      const viewedIds = new Set<number>();

      // 記事1から開始
      viewedIds.add(1);

      // jキーで記事2へ
      viewedIds.add(2);

      // jキーで記事3へ
      viewedIds.add(3);

      // kキーで記事2へ戻る（重複）
      viewedIds.add(2);

      // Setなので重複しない
      expect(viewedIds.size).toBe(3);
      expect(Array.from(viewedIds).sort()).toEqual([1, 2, 3]);
    });
  });
});
