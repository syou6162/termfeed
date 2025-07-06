import { useState, useCallback } from 'react';
import type { Article } from '../../../types/index.js';
import type { FeedService } from '../../../services/feed-service.js';
import type { ArticleService } from '../../../services/article-service.js';
import { TUI_CONFIG } from '../config/constants.js';

export type ArticleManagerState = {
  articles: Article[];
  selectedArticleIndex: number;
  scrollOffset: number;
  isLoading: boolean;
  error: string;
};

export type ArticleManagerActions = {
  loadArticles: (feedId: number) => void;
  setSelectedArticleIndex: (index: number) => void;
  setScrollOffset: (offset: number) => void;
  toggleFavoriteWithPin: (onPinStateChanged?: () => void) => void;
  scrollDown: () => void;
  scrollUp: () => void;
  pageDown: (totalHeight?: number) => void;
  pageUp: (totalHeight?: number) => void;
  scrollToEnd: () => void;
};

/**
 * 記事管理に関する状態とロジックを管理するカスタムフック
 * - 記事一覧の取得と表示
 * - 記事の選択状態とスクロール位置の管理
 * - お気に入りのトグル機能
 */
export function useArticleManager(
  _feedService: FeedService,
  articleService: ArticleService,
  currentFeedId: number | null
): ArticleManagerState & ArticleManagerActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // 共通の記事取得ロジック
  const fetchArticles = useCallback(
    (feedId: number): Article[] => {
      return (
        articleService.getArticles({
          feedId: feedId,
          isRead: false,
          limit: TUI_CONFIG.DEFAULT_ARTICLE_LIMIT,
        }) || []
      ); // 防御的プログラミング
    },
    [articleService]
  );

  const loadArticles = useCallback(
    (feedId: number) => {
      try {
        setIsLoading(true);
        setError('');

        // 共通ロジックを使用して記事を取得
        const unreadArticles = fetchArticles(feedId);
        setArticles(unreadArticles);
        setSelectedArticleIndex(0);
        setScrollOffset(0); // スクロール位置をリセット
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '記事の読み込みに失敗しました';
        setError(errorMessage);
        console.error('記事の読み込みに失敗しました:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [fetchArticles]
  );

  const toggleFavoriteWithPin = useCallback(
    (onPinStateChanged?: () => void) => {
      const selectedArticle = articles[selectedArticleIndex];
      if (selectedArticle?.id && currentFeedId) {
        try {
          const isFavorite = articleService.toggleFavoriteWithPin(selectedArticle.id);

          // パフォーマンス改善: 記事リストの全件再取得を避け、ローカル状態のみ更新
          setArticles((prevArticles) =>
            prevArticles.map((article) =>
              article.id === selectedArticle.id ? { ...article, is_favorite: isFavorite } : article
            )
          );

          // ピン状態の変更を通知
          onPinStateChanged?.();
        } catch (err) {
          console.error('お気に入り状態の更新に失敗しました:', err);
          // エラー時は共通ロジックで記事リストを再取得し、同じ記事を再選択
          try {
            const currentArticleId = selectedArticle.id;
            const unreadArticles = fetchArticles(currentFeedId);
            setArticles(unreadArticles);

            // 同じ記事を再選択する（エラー時でもカーソル位置を維持）
            const newIndex = unreadArticles.findIndex((article) => article.id === currentArticleId);
            if (newIndex !== -1) {
              setSelectedArticleIndex(newIndex);
            } else {
              // 記事が見つからない場合は最初の記事を選択
              setSelectedArticleIndex(0);
            }
          } catch {
            // フォールバック: 通常のloadArticlesを使用
            loadArticles(currentFeedId);
          }
        }
      }
    },
    [articles, selectedArticleIndex, currentFeedId, articleService, fetchArticles, loadArticles]
  );

  const scrollDown = useCallback(() => {
    setScrollOffset((prev) => prev + 1);
  }, []);

  const scrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - 1));
  }, []);

  const pageDown = useCallback((totalHeight: number = TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT) => {
    // 実際の表示行数分スクロール
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
    setScrollOffset((prev) => prev + availableLines);
  }, []);

  const pageUp = useCallback((totalHeight: number = TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT) => {
    // 実際の表示行数分スクロール
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
    setScrollOffset((prev) => Math.max(0, prev - availableLines));
  }, []);

  const scrollToEnd = useCallback(() => {
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
    error,

    // Actions
    loadArticles,
    setSelectedArticleIndex,
    setScrollOffset,
    toggleFavoriteWithPin,
    scrollDown,
    scrollUp,
    pageDown,
    pageUp,
    scrollToEnd,
  };
}
