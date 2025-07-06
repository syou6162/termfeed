import { Box, Text, useApp, useStdout } from 'ink';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { FavoriteList } from './components/FavoriteList.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useTermfeedData } from './hooks/useTermfeedData.js';
import { useFeedManager } from './hooks/useFeedManager.js';
import { useArticleManager } from './hooks/useArticleManager.js';
import { useErrorManager } from './hooks/useErrorManager.js';
import { useViewedArticles } from './hooks/useViewedArticles.js';
import { usePinManager } from './hooks/usePinManager.js';
import { openUrlInBrowser, type OpenUrlResult } from './utils/browser.js';
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
  const [temporaryMessage, setTemporaryMessage] = useState<string | null>(null);

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
  const { addError, clearErrorsBySource } = errorManager;

  // 一時的なメッセージを表示する関数
  const showTemporaryMessage = useCallback((message: string, duration = 3000) => {
    setTemporaryMessage(message);
    setTimeout(() => {
      setTemporaryMessage(null);
    }, duration);
  }, []);

  // フィードエラーの管理
  useEffect(() => {
    if (error) {
      addError({
        source: ERROR_SOURCES.FEED,
        message: error,
        timestamp: new Date(),
        recoverable: true,
      });
    } else {
      clearErrorsBySource(ERROR_SOURCES.FEED);
    }
  }, [error, addError, clearErrorsBySource]);

  // 記事エラーの管理
  useEffect(() => {
    if (articlesError) {
      addError({
        source: ERROR_SOURCES.ARTICLE,
        message: articlesError,
        timestamp: new Date(),
        recoverable: true,
      });
    } else {
      clearErrorsBySource(ERROR_SOURCES.ARTICLE);
    }
  }, [articlesError, addError, clearErrorsBySource]);

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

  // vキー: 現在の記事を開く
  const handleOpenInBrowser = useCallback(async () => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.url) {
      try {
        await openUrlInBrowser(selectedArticle.url);
      } catch (error) {
        addError({
          source: ERROR_SOURCES.NETWORK,
          message: error instanceof Error ? error.message : 'ブラウザの起動に失敗しました',
          timestamp: new Date(),
          recoverable: true,
        });
      }
    }
  }, [articles, selectedArticleIndex, addError]);

  // oキー: ピンした記事を10個ずつ開く
  const handleOpenAllPinned = useCallback(async () => {
    const PINS_PER_BATCH = 10;
    const totalPinCount = pinService.getPinCount();

    if (totalPinCount === 0) {
      showTemporaryMessage('📌 ピンした記事がありません');
      return;
    }

    // 古い順に最大10個取得
    const articlesToOpen = pinService.getOldestPinnedArticles(PINS_PER_BATCH);
    const urls = articlesToOpen.map((article) => article.url);
    const articleIds = articlesToOpen.map((article) => article.id);

    try {
      await openUrlInBrowser(urls);
      // すべて成功した場合は開いたピンを削除
      pinService.deletePins(articleIds);
      // ピン状態を更新
      refreshPinnedState();
    } catch (error) {
      // エラーがOpenUrlResultを含むかチェック
      const openUrlError = error as Error & { result?: OpenUrlResult };

      // 成功したURLに対応する記事IDを特定
      if (openUrlError.result?.succeeded?.length && openUrlError.result.succeeded.length > 0) {
        const succeededArticleIds = articlesToOpen
          .filter((article) => openUrlError.result!.succeeded.includes(article.url))
          .map((article) => article.id);

        if (succeededArticleIds.length > 0) {
          pinService.deletePins(succeededArticleIds);
          // ピン状態を更新
          refreshPinnedState();
        }
      }

      // エラーメッセージをより詳細に
      let errorMessage = error instanceof Error ? error.message : 'ブラウザの起動に失敗しました';
      if (openUrlError.result?.failed?.length && openUrlError.result.failed.length > 0) {
        const failedUrls = openUrlError.result.failed.map((f) => f.url).join(', ');
        errorMessage = `一部のURLを開けませんでした (${openUrlError.result.failed.length}件失敗): ${failedUrls}`;
      }

      addError({
        source: ERROR_SOURCES.NETWORK,
        message: errorMessage,
        timestamp: new Date(),
        recoverable: true,
      });
    }
  }, [pinService, showTemporaryMessage, refreshPinnedState, addError]);

  // pキー: ピンのトグル
  const handleTogglePin = useCallback(() => {
    if (currentArticle) {
      togglePin();
    }
  }, [currentArticle, togglePin]);

  // 閲覧済み記事の参照を保持（プロセス終了時の既読化用）
  const markViewedArticlesAsReadRef = useRef(markViewedArticlesAsRead);
  useEffect(() => {
    markViewedArticlesAsReadRef.current = markViewedArticlesAsRead;
  }, [markViewedArticlesAsRead]);

  // プロセス終了時の既読化処理（アプリ全体で1回だけ登録）
  useEffect(() => {
    const handleExit = () => {
      // 閲覧済み記事をまとめて既読化
      markViewedArticlesAsReadRef.current();
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    return () => {
      process.off('SIGINT', handleExit);
      process.off('SIGTERM', handleExit);
    };
  }, []); // 空の依存配列 = アプリ起動時に1回だけ実行

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
    return (
      <Box justifyContent="center" alignItems="center" height="100%">
        <Box flexDirection="column" alignItems="center">
          {updateProgress ? (
            <>
              <Text color="yellow">
                フィード更新中 ({updateProgress.currentIndex}/{updateProgress.totalFeeds})
              </Text>
              <Text color="gray">現在: {updateProgress.currentFeedTitle}</Text>
              <Text color="gray" dimColor>
                {updateProgress.currentFeedUrl}
              </Text>
              <Box marginTop={1}>
                <Text color="cyan">ESC: キャンセル</Text>
              </Box>
            </>
          ) : (
            <Text color="yellow">読み込み中...</Text>
          )}
        </Box>
      </Box>
    );
  }

  if (errorManager.hasError) {
    const latestError = errorManager.getLatestError();
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          エラーが発生しました
        </Text>
        {latestError && (
          <>
            <Text color="red">
              [{latestError.source.toUpperCase()}] {latestError.message}
            </Text>
            <Text color="gray" dimColor>
              発生時刻: {latestError.timestamp.toLocaleTimeString('ja-JP')}
            </Text>
          </>
        )}
        {errorManager.errors.length > 1 && (
          <Box marginTop={1} flexDirection="column">
            <Text color="yellow">エラー履歴 ({errorManager.errors.length}件):</Text>
            {errorManager.errors.slice(-3).map((err, index) => (
              <Text key={index} color="gray" dimColor>
                • [{err.source}]{' '}
                {err.message.length > 40 ? err.message.substring(0, 40) + '...' : err.message}
              </Text>
            ))}
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">
            r: 再試行 | {failedFeeds.length > 0 ? 'e: エラー詳細 | ' : ''}q: 終了
          </Text>
        </Box>
        {showFailedFeeds && failedFeeds.length > 0 && (
          <Box marginTop={1} flexDirection="column">
            <Text bold color="yellow">
              失敗したフィード:
            </Text>
            {failedFeeds.map((failed, index) => (
              <Box key={index} flexDirection="column" marginLeft={2}>
                <Text color="red">• {failed.feedUrl}</Text>
                <Text color="gray" dimColor>
                  エラー: {failed.error.message}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
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
        {temporaryMessage && (
          <Box position="absolute" marginLeft={2} marginTop={2}>
            <Box borderStyle="round" padding={1}>
              <Text color="yellow">{temporaryMessage}</Text>
            </Box>
          </Box>
        )}
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
      {temporaryMessage && (
        <Box position="absolute" marginLeft={2} marginTop={2}>
          <Box borderStyle="round" padding={1}>
            <Text color="yellow">{temporaryMessage}</Text>
          </Box>
        </Box>
      )}
    </>
  );
}
