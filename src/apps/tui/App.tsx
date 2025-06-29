import { Box, Text, useApp, useStdout } from 'ink';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { spawn } from 'child_process';
import type { Article, Feed, UpdateProgress } from '@/types';
import { FeedService } from '../../services/feed-service.js';
import { FeedModel } from '../../models/feed.js';
import { ArticleModel } from '../../models/article.js';
import { createDatabaseManager } from '../cli/utils/database.js';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';

type FeedWithUnreadCount = Feed & {
  unreadCount: number;
};

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const [feeds, setFeeds] = useState<FeedWithUnreadCount[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState(0);
  const [selectedFeedId, setSelectedFeedId] = useState<number | null>(null);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);
  const [updateProgress, setUpdateProgress] = useState<UpdateProgress | null>(null);

  // データベースとサービスを初期化（一度だけ実行）
  const { feedService } = useMemo(() => {
    const databaseManager = createDatabaseManager();
    // マイグレーションを実行
    databaseManager.migrate();

    const feedModel = new FeedModel(databaseManager);
    const articleModel = new ArticleModel(databaseManager);
    const feedService = new FeedService(feedModel, articleModel);

    return { feedService };
  }, []);

  const loadFeeds = useCallback(() => {
    try {
      setIsLoading(true);
      setError('');

      const allFeeds = feedService.getFeedList();
      const unreadCounts = feedService.getUnreadCountsForAllFeeds();
      const feedsWithUnreadCount = allFeeds.map((feed) => {
        const unreadCount = feed.id ? unreadCounts[feed.id] || 0 : 0;
        return { ...feed, unreadCount };
      });

      // 未読件数でソート：未読あり → 未読なし
      const sortedFeeds = feedsWithUnreadCount.sort((a, b) => {
        // 未読件数が多い順、同じ場合は元の順序を維持
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
        if (a.unreadCount > 0 && b.unreadCount > 0) return b.unreadCount - a.unreadCount;
        return 0; // 両方とも未読なしの場合は元の順序
      });

      setFeeds(sortedFeeds);

      // ソート後に選択中のフィードのインデックスを更新
      if (selectedFeedId) {
        const newIndex = sortedFeeds.findIndex((feed) => feed.id === selectedFeedId);
        if (newIndex !== -1) {
          setSelectedFeedIndex(newIndex);
        }
      } else if (sortedFeeds.length > 0 && sortedFeeds[0].id) {
        // 初回読み込み時は最初のフィードを選択
        setSelectedFeedId(sortedFeeds[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [feedService, selectedFeedId]);

  const loadArticles = useCallback(
    (feedId: number) => {
      try {
        setIsLoading(true);
        setError('');

        const allArticles = feedService.getArticles({ feed_id: feedId, limit: 100 });
        // 未読記事のみをフィルタリング
        const unreadArticles = allArticles.filter((article) => !article.is_read);
        setArticles(unreadArticles);
        setSelectedArticleIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : '記事の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    },
    [feedService]
  );

  const updateAllFeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');
      setUpdateProgress(null);

      const result = await feedService.updateAllFeeds((progress) => {
        setUpdateProgress(progress);
      });

      // 更新完了後、成功/失敗の結果を表示
      if (result.failed.length > 0) {
        setError(
          `フィード更新が一部失敗しました (成功: ${result.summary.successCount}件, 失敗: ${result.summary.failureCount}件)`
        );
      }

      setUpdateProgress(null);
      loadFeeds();

      if (feeds[selectedFeedIndex]?.id) {
        loadArticles(feeds[selectedFeedIndex].id);
      }
    } catch (err) {
      // エラー時は進捗情報を保持してエラーメッセージを表示
      setError(err instanceof Error ? err.message : 'フィードの更新に失敗しました');
      // エラー表示後も少し進捗を見せてから消す
      setTimeout(() => {
        setUpdateProgress(null);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeedIndex, feeds, loadFeeds, loadArticles, feedService]);

  const handleFeedSelectionChange = useCallback(
    (index: number) => {
      // フィード移動前に現在選択中の記事を既読にする
      const currentArticle = articles[selectedArticleIndex];
      if (currentArticle && currentArticle.id && !currentArticle.is_read) {
        try {
          feedService.markArticleAsRead(currentArticle.id);
          // 既読化した記事をリストから除外
          const updatedArticles = articles.filter((article) => article.id !== currentArticle.id);
          setArticles(updatedArticles);
          // インデックスを調整
          setSelectedArticleIndex(Math.min(selectedArticleIndex, updatedArticles.length - 1));
        } catch (err) {
          console.error('記事の既読化に失敗しました:', err);
        }
      }

      setSelectedFeedIndex(index);
      if (feeds[index]?.id) {
        setSelectedFeedId(feeds[index].id);
      }
      setSelectedArticleIndex(0); // 記事選択をリセット
      // loadArticlesはuseEffectで自動的に呼ばれる
    },
    [articles, selectedArticleIndex, feedService, feeds]
  );

  const handleArticleSelect = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.url) {
      // URLの安全性チェック
      const url = selectedArticle.url.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        console.error('無効なURLです:', url);
        return;
      }

      // クロスプラットフォーム対応でブラウザを開く（セキュア版）
      let command: string;
      let args: string[];

      if (process.platform === 'darwin') {
        // macOS - バックグラウンドで開く
        command = 'open';
        args = ['-g', url];
      } else if (process.platform === 'win32') {
        // Windows - 最小化で開く
        command = 'cmd';
        args = ['/c', 'start', '/min', url];
      } else {
        // Linux/Unix - バックグラウンドで開く
        command = 'xdg-open';
        args = [url];
      }

      const childProcess = spawn(command, args, {
        stdio: 'ignore',
        detached: true,
      });

      childProcess.on('error', (error) => {
        console.error('ブラウザの起動に失敗しました:', error.message);
      });

      // プロセスを親から切り離す
      childProcess.unref();
    }
  }, [articles, selectedArticleIndex]);

  const handleToggleFavorite = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.id) {
      try {
        feedService.toggleArticleFavorite(selectedArticle.id);

        // 記事リストを再読み込み
        const selectedFeed = feeds[selectedFeedIndex];
        if (selectedFeed?.id) {
          loadArticles(selectedFeed.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'お気に入り状態の更新に失敗しました');
      }
    }
  }, [articles, selectedArticleIndex, feeds, selectedFeedIndex, loadArticles, feedService]);

  // 初期化時に最初のフィードの記事を読み込み
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

  useEffect(() => {
    if (feeds.length > 0 && feeds[selectedFeedIndex]?.id) {
      loadArticles(feeds[selectedFeedIndex].id);
    }
  }, [feeds, selectedFeedIndex, loadArticles]);

  // Ctrl+C等での終了時にも既読処理を行う
  useEffect(() => {
    const handleExit = () => {
      const currentArticle = articles[selectedArticleIndex];
      if (currentArticle && currentArticle.id && !currentArticle.is_read) {
        try {
          feedService.markArticleAsRead(currentArticle.id);
        } catch (err) {
          console.error('記事の既読化に失敗しました:', err);
        }
      }
    };

    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);

    return () => {
      // クリーンアップ時にも実行
      handleExit();
      process.off('SIGINT', handleExit);
      process.off('SIGTERM', handleExit);
    };
  }, [articles, selectedArticleIndex, feedService]);

  const handleToggleHelp = useCallback(() => {
    setShowHelp((prev) => !prev);
  }, []);

  const handleQuit = useCallback(() => {
    // TUI終了前に現在選択中の記事を既読にする
    const currentArticle = articles[selectedArticleIndex];
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      try {
        feedService.markArticleAsRead(currentArticle.id);
      } catch (err) {
        console.error('記事の既読化に失敗しました:', err);
      }
    }
    exit();
  }, [articles, selectedArticleIndex, feedService, exit]);

  const handleScrollDown = useCallback(() => {
    setScrollOffset((prev) => prev + 1);
  }, []);

  const handleScrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(0, prev - 1));
  }, []);

  const handlePageDown = useCallback(() => {
    // 実際の表示行数分スクロール
    const totalHeight = stdout?.rows || 24;
    const fixedLines = 16; // ArticleListと同じ固定行数
    const availableLines = Math.max(1, totalHeight - fixedLines);
    setScrollOffset((prev) => prev + availableLines);
  }, [stdout]);

  const handlePageUp = useCallback(() => {
    // 実際の表示行数分スクロール
    const totalHeight = stdout?.rows || 24;
    const fixedLines = 16; // ArticleListと同じ固定行数
    const availableLines = Math.max(1, totalHeight - fixedLines);
    setScrollOffset((prev) => Math.max(0, prev - availableLines));
  }, [stdout]);

  const handleScrollToEnd = useCallback(() => {
    // 記事の最後にジャンプするため、大きな値を設定
    // ArticleListコンポーネントで実際の最大値に調整される
    setScrollOffset(999999);
  }, []);

  // キーボードナビゲーション
  useKeyboardNavigation({
    articleCount: articles.length,
    feedCount: feeds.length,
    selectedArticleIndex,
    selectedFeedIndex,
    onArticleSelectionChange: setSelectedArticleIndex,
    onFeedSelectionChange: handleFeedSelectionChange,
    onOpenInBrowser: handleArticleSelect,
    onRefreshAll: () => void updateAllFeeds(),
    onToggleFavorite: handleToggleFavorite,
    onToggleHelp: handleToggleHelp,
    onQuit: handleQuit,
    onScrollDown: handleScrollDown,
    onScrollUp: handleScrollUp,
    onPageDown: handlePageDown,
    onPageUp: handlePageUp,
    onScrollOffsetChange: setScrollOffset,
    onScrollToEnd: handleScrollToEnd,
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
            </>
          ) : (
            <Text color="yellow">読み込み中...</Text>
          )}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="red">
          エラーが発生しました
        </Text>
        <Text color="red">{error}</Text>
        <Text color="gray">r: 再試行 | q: 終了</Text>
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
