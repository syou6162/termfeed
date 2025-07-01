import { useState, useCallback } from 'react';
import type { FeedService } from '../../../services/feed-service.js';

/**
 * 閲覧済み記事を管理するカスタムフック
 * - j/kキーで移動した記事のIDをメモリに記録
 * - フィード移動時にまとめてDB書き込み
 * - 重複防止のためSetを使用
 */
export function useViewedArticles(feedService: FeedService) {
  const [viewedArticleIds, setViewedArticleIds] = useState<Set<number>>(new Set());

  /**
   * 記事を閲覧済みとして記録
   * Setを使用しているため重複は自動的に防がれる
   */
  const recordArticleView = useCallback((articleId: number | undefined) => {
    if (articleId !== undefined) {
      setViewedArticleIds((prev) => new Set(prev).add(articleId));
    }
  }, []);

  /**
   * 記録された記事をすべて既読にしてクリア
   */
  const markViewedArticlesAsRead = useCallback(() => {
    const ids = Array.from(viewedArticleIds);

    // 記録がない場合は何もしない
    if (ids.length === 0) {
      return;
    }

    // まとめて既読化（エラーは個別にログ出力）
    for (const articleId of ids) {
      try {
        feedService.markArticleAsRead(articleId);
      } catch (err) {
        console.error(`記事 ${articleId} の既読化に失敗:`, err);
      }
    }

    // クリア
    setViewedArticleIds(new Set());
  }, [viewedArticleIds, feedService]);

  /**
   * 閲覧済み記事の数を取得
   */
  const getViewedCount = useCallback(() => {
    return viewedArticleIds.size;
  }, [viewedArticleIds]);

  /**
   * 特定の記事が閲覧済みかチェック
   */
  const isArticleViewed = useCallback(
    (articleId: number | undefined): boolean => {
      return articleId !== undefined && viewedArticleIds.has(articleId);
    },
    [viewedArticleIds]
  );

  return {
    recordArticleView,
    markViewedArticlesAsRead,
    getViewedCount,
    isArticleViewed,
    viewedArticleIds: Array.from(viewedArticleIds), // テスト用
  };
}
