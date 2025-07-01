import { useState, useCallback } from 'react';
import type { Article } from '@/types';
import type { FeedService } from '@/services/feed-service.js';

export type ArticleManagerState = {
  articles: Article[];
  selectedArticleIndex: number;
  scrollOffset: number;
  isLoading: boolean;
};

export type ArticleManagerActions = {
  loadArticles: (feedId: number) => void;
  setSelectedArticleIndex: (index: number) => void;
  setScrollOffset: (offset: number) => void;
  handleToggleFavorite: () => void;
  handleScrollDown: () => void;
  handleScrollUp: () => void;
  handlePageDown: (totalHeight?: number) => void;
  handlePageUp: (totalHeight?: number) => void;
  handleScrollToEnd: () => void;
};

/**
 * 記事管理に関する状態とロジックを管理するカスタムフック
 * - 記事一覧の取得と表示
 * - 記事の選択状態とスクロール位置の管理
 * - お気に入りのトグル機能
 */
export function useArticleManager(
  feedService: FeedService,
  currentFeedId: number | null,
  onError: (error: string) => void
): ArticleManagerState & ArticleManagerActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadArticles = useCallback(
    (feedId: number) => {
      try {
        setIsLoading(true);
        onError(''); // エラーをクリア

        const allArticles = feedService.getArticles({ feed_id: feedId, limit: 100 });
        // 未読記事のみをフィルタリング
        const unreadArticles = allArticles.filter((article) => !article.is_read);
        setArticles(unreadArticles);
        setSelectedArticleIndex(0);
        setScrollOffset(0); // スクロール位置をリセット
      } catch (err) {
        onError(err instanceof Error ? err.message : '記事の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    },
    [feedService, onError]
  );

  const handleToggleFavorite = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.id && currentFeedId) {
      try {
        feedService.toggleArticleFavorite(selectedArticle.id);
        // 記事リストを再読み込み
        loadArticles(currentFeedId);
      } catch (err) {
        onError(err instanceof Error ? err.message : 'お気に入り状態の更新に失敗しました');
      }
    }
  }, [articles, selectedArticleIndex, currentFeedId, loadArticles, feedService, onError]);

  const handleScrollDown = useCallback(() => {
    setScrollOffset((prev) => prev + 1);
  }, []);

  const handleScrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - 1));
  }, []);

  const handlePageDown = useCallback((totalHeight: number = 24) => {
    // 実際の表示行数分スクロール
    const fixedLines = 16; // ArticleListと同じ固定行数
    const availableLines = Math.max(1, totalHeight - fixedLines);
    setScrollOffset((prev) => prev + availableLines);
  }, []);

  const handlePageUp = useCallback((totalHeight: number = 24) => {
    // 実際の表示行数分スクロール
    const fixedLines = 16; // ArticleListと同じ固定行数
    const availableLines = Math.max(1, totalHeight - fixedLines);
    setScrollOffset((prev) => Math.max(0, prev - availableLines));
  }, []);

  const handleScrollToEnd = useCallback(() => {
    // 記事の最後にジャンプするため、大きな値を設定
    // ArticleListコンポーネントで実際の最大値に調整される
    setScrollOffset(999999);
  }, []);

  return {
    // State
    articles,
    selectedArticleIndex,
    scrollOffset,
    isLoading,

    // Actions
    loadArticles,
    setSelectedArticleIndex,
    setScrollOffset,
    handleToggleFavorite,
    handleScrollDown,
    handleScrollUp,
    handlePageDown,
    handlePageUp,
    handleScrollToEnd,
  };
}
