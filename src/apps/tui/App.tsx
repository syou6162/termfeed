import { Box, Text, useApp, useStdout } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { useTermfeedData } from './hooks/useTermfeedData.js';
import { useFeedManager } from './hooks/useFeedManager.js';
import { useArticleManager } from './hooks/useArticleManager.js';
import { useAutoMarkAsRead } from './hooks/useAutoMarkAsRead.js';
import { useErrorManager } from './hooks/useErrorManager.js';
import { openUrlInBrowser } from './utils/browser.js';
import { ERROR_SOURCES } from './types/error.js';

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [showHelp, setShowHelp] = useState(false);

  // データベースとサービスを初期化
  const { feedService } = useTermfeedData();

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
    toggleFavorite,
    scrollDown,
    scrollUp,
    pageDown,
    pageUp,
    scrollToEnd,
  } = useArticleManager(feedService, selectedFeedId);

  const isLoading = feedsLoading || articlesLoading;

  // エラー管理
  const errorManager = useErrorManager();

  // エラーを統合管理
  const { addError, clearErrorsBySource } = errorManager;

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

  // 自動既読機能
  const { markCurrentArticleAsRead } = useAutoMarkAsRead({
    articles,
    selectedArticleIndex,
    feedService,
    // フィード移動時は記事リストの再読み込みは不要（useEffectで処理される）
    onArticleMarkedAsRead: undefined,
  });

  const handleFeedSelectionChange = useCallback(
    (index: number) => {
      markCurrentArticleAsRead();
      setSelectedFeedIndex(index);
    },
    [markCurrentArticleAsRead, setSelectedFeedIndex]
  );

  const handleArticleSelect = useCallback(async () => {
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

  const handleQuit = useCallback(() => {
    markCurrentArticleAsRead();
    exit();
  }, [markCurrentArticleAsRead, exit]);

  // 初期化時に最初のフィードの記事を読み込み
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    if (feeds.length > 0 && feeds[selectedFeedIndex]?.id) {
      loadArticles(feeds[selectedFeedIndex].id);
    }
  }, [feeds, selectedFeedIndex, loadArticles]);

  // キーボードナビゲーション
  useKeyboardNavigation({
    articleCount: articles.length,
    feedCount: feeds.length,
    selectedArticleIndex,
    selectedFeedIndex,
    onArticleSelectionChange: setSelectedArticleIndex,
    onFeedSelectionChange: handleFeedSelectionChange,
    onOpenInBrowser: () => void handleArticleSelect(),
    onRefreshAll: () => void updateAllFeeds(),
    onToggleFavorite: toggleFavorite,
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

  return (
    <TwoPaneLayout
      leftWidth={20}
      rightWidth={80}
      leftPane={<FeedList feeds={feeds} selectedIndex={selectedFeedIndex} />}
      rightPane={
        <ArticleList
          articles={articles}
          selectedArticle={selectedArticle}
          scrollOffset={scrollOffset}
          onScrollOffsetChange={setScrollOffset}
        />
      }
    />
  );
}
