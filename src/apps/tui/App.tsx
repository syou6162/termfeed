import { useApp, useStdout } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { FavoriteList } from './components/FavoriteList.js';
import { LoadingView } from './components/LoadingView.js';
import { ErrorView } from './components/ErrorView.js';
import { TemporaryMessage } from './components/TemporaryMessage.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useTermfeedData } from './hooks/useTermfeedData.js';
import { useFeedManager } from './hooks/useFeedManager.js';
import { useArticleManager } from './hooks/useArticleManager.js';
import { useErrorManager } from './hooks/useErrorManager.js';
import { useErrorSync } from './hooks/useErrorSync.js';
import { useViewedArticles } from './hooks/useViewedArticles.js';
import { usePinManager } from './hooks/usePinManager.js';
import { useTemporaryMessage } from './hooks/useTemporaryMessage.js';
import { useBrowserActions } from './hooks/useBrowserActions.js';
import { useProcessExitHandler } from './hooks/useProcessExitHandler.js';
import { openUrlInBrowser } from './utils/browser.js';
import { ERROR_SOURCES } from './types/error.js';
import type { DatabaseManager } from '../../models/database.js';

interface AppProps {
  databaseManager?: DatabaseManager;
}

export function App(props: AppProps = {}) {
  const { databaseManager } = props;
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [showHelp, setShowHelp] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

  // 一時的なメッセージ管理
  const { message: temporaryMessage, showMessage: showTemporaryMessage } = useTemporaryMessage();

  // データベースとサービスを初期化
  const { feedService, articleService, pinService, favoriteService } =
    useTermfeedData(databaseManager);

  // フィード管理
  const {
    feeds,
    selectedFeedIndex,
    selectedFeedId,
    isLoading: feedsLoading,
    error,
    updateProgress,
    failedFeeds,
    showFailedFeeds,
    loadFeeds,
    updateAllFeeds,
    setSelectedFeedIndex,
    cancelUpdate,
    toggleFailedFeeds,
  } = useFeedManager(feedService);

  // 記事管理
  const {
    articles,
    selectedArticleIndex,
    scrollOffset,
    isLoading: articlesLoading,
    error: articlesError,
    loadArticles,
    setSelectedArticleIndex,
    setScrollOffset,
    toggleFavoriteWithPin,
    scrollDown,
    scrollUp,
    pageDown,
    pageUp,
    scrollToEnd,
  } = useArticleManager(articleService, selectedFeedId);

  const isLoading = feedsLoading || articlesLoading;

  // エラー管理
  const errorManager = useErrorManager();

  // 閲覧済み記事の管理
  const { recordArticleView, markViewedArticlesAsRead } = useViewedArticles(feedService);

  // 現在選択中の記事
  const currentArticle = articles[selectedArticleIndex];

  // ピン管理
  const { pinnedArticleIds, pinnedCount, isPinned, togglePin, refreshPinnedState } = usePinManager({
    pinService,
    currentArticleId: currentArticle?.id,
  });

  // エラーを統合管理
  const { addError } = errorManager;

  // フィードエラーの同期
  useErrorSync(errorManager, ERROR_SOURCES.FEED, error);

  // 記事エラーの同期
  useErrorSync(errorManager, ERROR_SOURCES.ARTICLE, articlesError);

  // ブラウザアクション管理
  const { handleOpenInBrowser, handleOpenAllPinned } = useBrowserActions({
    articles,
    selectedArticleIndex,
    pinService,
    errorManager,
    showTemporaryMessage,
    refreshPinnedState,
  });

  const handleFeedSelectionChange = useCallback(
    (index: number) => {
      // 閲覧済み記事をまとめて既読化
      markViewedArticlesAsRead();
      setSelectedFeedIndex(index);
    },
    [markViewedArticlesAsRead, setSelectedFeedIndex]
  );

  const handleArticleSelectionChange = useCallback(
    (index: number) => {
      // 現在の記事を閲覧済みとして記録（重複はSetが自動的に防ぐ）
      const currentArticle = articles[selectedArticleIndex];
      if (currentArticle?.id) {
        recordArticleView(currentArticle.id);
      }

      // 新しい記事も記録
      const newArticle = articles[index];
      if (newArticle?.id) {
        recordArticleView(newArticle.id);
      }

      setSelectedArticleIndex(index);
    },
    [articles, selectedArticleIndex, recordArticleView, setSelectedArticleIndex]
  );

  // pキー: ピンのトグル
  const handleTogglePin = useCallback(() => {
    if (currentArticle) {
      togglePin();
    }
  }, [currentArticle, togglePin]);

  // プロセス終了時の既読化処理
  useProcessExitHandler(() => {
    markViewedArticlesAsRead();
  });

  const handleQuit = useCallback(() => {
    // 閲覧済み記事をまとめて既読化
    markViewedArticlesAsRead();
    exit();
  }, [markViewedArticlesAsRead, exit]);

  const handleSetFeedRating = useCallback(
    (rating: number) => {
      const selectedFeed = feeds[selectedFeedIndex];
      if (selectedFeed?.id) {
        try {
          feedService.setFeedRating(selectedFeed.id, rating);
          // フィード一覧を再読み込みすることで、useFeedManagerが自動的に選択状態を同期
          loadFeeds();
        } catch (error) {
          addError({
            source: ERROR_SOURCES.NETWORK,
            message: error instanceof Error ? error.message : 'レーティング設定に失敗しました',
            timestamp: new Date(),
            recoverable: true,
          });
        }
      }
    },
    [feeds, selectedFeedIndex, feedService, loadFeeds, addError]
  );

  // 初期化時に最初のフィードの記事を読み込み
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    if (feeds.length > 0 && feeds[selectedFeedIndex]?.id) {
      loadArticles(feeds[selectedFeedIndex].id);
    }
  }, [feeds, selectedFeedIndex, loadArticles]);

  // 初期表示時と記事リスト更新時に最初の記事を閲覧済みとして記録
  useEffect(() => {
    if (articles.length > 0 && articles[selectedArticleIndex]?.id) {
      recordArticleView(articles[selectedArticleIndex].id);
    }
  }, [articles, selectedArticleIndex, recordArticleView]);

  // キーボードナビゲーション
  useKeyboardNavigation({
    articleCount: articles.length,
    feedCount: feeds.length,
    selectedArticleIndex,
    selectedFeedIndex,
    onArticleSelectionChange: handleArticleSelectionChange,
    onFeedSelectionChange: handleFeedSelectionChange,
    onOpenInBrowser: () => {
      void handleOpenInBrowser();
    },
    onRefreshAll: () => {
      void updateAllFeeds();
    },
    onToggleFavorite: () => toggleFavoriteWithPin(refreshPinnedState),
    onToggleHelp: () => setShowHelp((prev) => !prev),
    onQuit: handleQuit,
    onScrollDown: scrollDown,
    onScrollUp: scrollUp,
    onPageDown: () => pageDown(stdout?.rows),
    onPageUp: () => pageUp(stdout?.rows),
    onScrollOffsetChange: setScrollOffset,
    onScrollToEnd: scrollToEnd,
    onCancel: cancelUpdate,
    onToggleFailedFeeds: toggleFailedFeeds,
    onSetFeedRating: handleSetFeedRating,
    onTogglePin: handleTogglePin,
    onOpenAllPinned: () => {
      void handleOpenAllPinned();
    },
    onToggleFavoriteMode: () => setShowFavorites((prev) => !prev),
  });

  if (isLoading) {
    return <LoadingView updateProgress={updateProgress ?? undefined} />;
  }

  if (errorManager.hasError) {
    const latestError = errorManager.getLatestError();
    return (
      <ErrorView
        latestError={latestError ?? undefined}
        errors={errorManager.errors}
        failedFeeds={failedFeeds}
        showFailedFeeds={showFailedFeeds}
      />
    );
  }

  const selectedArticle = articles[selectedArticleIndex];

  // ヘルプ表示時は通常UIを隠してヘルプのみ表示
  if (showHelp) {
    return <HelpOverlay isVisible={true} />;
  }

  // お気に入りモード表示
  if (showFavorites) {
    return (
      <>
        <FavoriteList
          favoriteService={favoriteService}
          isPinned={(articleId) => pinnedArticleIds.has(articleId)}
          onOpenInBrowser={(url) => void openUrlInBrowser(url)}
          onToggleFavorite={(articleId) => {
            articleService.toggleFavoriteWithPin(articleId);
            refreshPinnedState();
          }}
          onTogglePin={(articleId) => {
            pinService.togglePin(articleId);
            refreshPinnedState();
          }}
          onFavoriteChange={() => {}}
        />
        <TemporaryMessage message={temporaryMessage} />
      </>
    );
  }

  // 選択された記事のお気に入り状態を判定
  const isFavorite = selectedArticle ? favoriteService.isFavorite(selectedArticle.id) : false;

  return (
    <>
      <TwoPaneLayout
        leftWidth={30}
        rightWidth={70}
        leftPane={
          <FeedList feeds={feeds} selectedIndex={selectedFeedIndex} pinnedCount={pinnedCount} />
        }
        rightPane={
          <ArticleList
            articles={articles}
            selectedArticle={selectedArticle}
            scrollOffset={scrollOffset}
            onScrollOffsetChange={setScrollOffset}
            isPinned={isPinned}
            isFavorite={isFavorite}
          />
        }
      />
      <TemporaryMessage message={temporaryMessage} />
    </>
  );
}
