import { useState, useCallback } from 'react';
import type { Article } from '../../../types/index.js';
import type { FeedService } from '../../../services/feed-service.js';
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
  toggleFavorite: () => void;
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
  feedService: FeedService,
  currentFeedId: number | null
): ArticleManagerState & ArticleManagerActions {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const loadArticles = useCallback(
    (feedId: number) => {
      try {
        setIsLoading(true);
        setError('');

        // データベースから直接未読記事のみを取得（上限付き）
        const unreadArticles =
          feedService.getArticles({
            feed_id: feedId,
            is_read: false,
            limit: TUI_CONFIG.DEFAULT_ARTICLE_LIMIT,
          }) || []; // 防御的プログラミング
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
    [feedService]
  );

  const toggleFavorite = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.id && currentFeedId) {
      try {
        feedService.toggleArticleFavorite(selectedArticle.id);
        // 現在の記事IDを保持
        const currentArticleId = selectedArticle.id;
        // 記事リストを再読み込み
        const unreadArticles =
          feedService.getArticles({
            feed_id: currentFeedId,
            is_read: false,
            limit: TUI_CONFIG.DEFAULT_ARTICLE_LIMIT,
          }) || [];
        setArticles(unreadArticles);

        // 同じ記事を再選択する
        const newIndex = unreadArticles.findIndex((article) => article.id === currentArticleId);
        if (newIndex !== -1) {
          setSelectedArticleIndex(newIndex);
        } else {
          // 記事が見つからない場合は最初の記事を選択
          setSelectedArticleIndex(0);
        }
      } catch (err) {
        console.error('お気に入り状態の更新に失敗しました:', err);
      }
    }
  }, [articles, selectedArticleIndex, currentFeedId, feedService]);

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
    toggleFavorite,
    scrollDown,
    scrollUp,
    pageDown,
    pageUp,
    scrollToEnd,
  };
}
