import { useCallback } from 'react';
import type { Article } from '../../../types/index.js';
import type { FeedService } from '../../../services/feed-service.js';

type UseAutoMarkAsReadProps = {
  articles: Article[];
  selectedArticleIndex: number;
  feedService: FeedService;
  onArticleMarkedAsRead?: (articleId: number) => void;
};

/**
 * 記事の自動既読機能を管理するカスタムフック
 * - フィード移動時の既読処理
 * - 既読化後の記事リスト更新
 *
 * 注意: アプリ終了時の既読処理はApp.tsxで一元管理されています
 */
export function useAutoMarkAsRead({
  articles,
  selectedArticleIndex,
  feedService,
  onArticleMarkedAsRead,
}: UseAutoMarkAsReadProps) {
  const markCurrentArticleAsRead = useCallback(() => {
    const currentArticle = articles[selectedArticleIndex];
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      try {
        feedService.markArticleAsRead(currentArticle.id);
        onArticleMarkedAsRead?.(currentArticle.id);
      } catch (err) {
        console.error('記事の既読化に失敗しました:', err);
      }
    }
  }, [articles, selectedArticleIndex, feedService, onArticleMarkedAsRead]);

  return {
    markCurrentArticleAsRead,
  };
}
