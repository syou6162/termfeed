import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useState, useMemo } from 'react';
import type { Article, Feed } from '../models/types.js';
import { FeedService } from '../services/feed-service.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { createDatabaseManager } from '../cli/utils/database.js';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';

type FeedWithUnreadCount = Feed & {
  unreadCount: number;
};

export function App() {
  const { exit } = useApp();
  const [feeds, setFeeds] = useState<FeedWithUnreadCount[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState(0);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

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
      const feedsWithUnreadCount = allFeeds.map((feed) => {
        const unreadCount = feedService.getUnreadCount(feed.id);
        return { ...feed, unreadCount };
      });

      setFeeds(feedsWithUnreadCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [feedService]);

  const loadArticles = useCallback(
    (feedId: number) => {
      try {
        setIsLoading(true);
        setError('');

        const feedArticles = feedService.getArticles({ feed_id: feedId, limit: 100 });
        setArticles(feedArticles);
        setSelectedArticleIndex(0);
      } catch (err) {
        setError(err instanceof Error ? err.message : '記事の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    },
    [feedService]
  );

  const updateFeeds = useCallback(async () => {
    try {
      setIsLoading(true);
      setError('');

      await feedService.updateAllFeeds();
      loadFeeds();

      if (feeds[selectedFeedIndex]?.id) {
        loadArticles(feeds[selectedFeedIndex].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFeedIndex, feeds, loadFeeds, loadArticles]);

  const handleFeedSelectionChange = useCallback((index: number) => {
    // フィード移動前に現在選択中の記事を既読にする
    const currentArticle = articles[selectedArticleIndex];
    if (currentArticle && currentArticle.id && !currentArticle.is_read) {
      try {
        feedService.markArticleAsRead(currentArticle.id);
      } catch (err) {
        console.error('記事の既読化に失敗しました:', err);
      }
    }

    setSelectedFeedIndex(index);
    setSelectedArticleIndex(0); // 記事選択をリセット
    // loadArticlesはuseEffectで自動的に呼ばれる
  }, [articles, selectedArticleIndex, feedService]);

  const handleArticleSelect = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.url) {
      // ブラウザでURLを開く（実装は環境に依存）
      // console.log(`Opening: ${selectedArticle.url}`);
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

  // キーボードナビゲーション
  useKeyboardNavigation({
    articleCount: articles.length,
    feedCount: feeds.length,
    selectedArticleIndex,
    selectedFeedIndex,
    onArticleSelectionChange: setSelectedArticleIndex,
    onFeedSelectionChange: handleFeedSelectionChange,
    onSelect: handleArticleSelect,
    onRefresh: () => void updateFeeds(),
    onToggleFavorite: handleToggleFavorite,
    onQuit: handleQuit,
  });

  if (isLoading) {
    return (
      <Box justifyContent="center" alignItems="center" height={5}>
        <Text color="yellow">読み込み中...</Text>
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

  return (
    <TwoPaneLayout
      leftWidth={20}
      rightWidth={80}
      leftPane={<FeedList feeds={feeds} selectedIndex={selectedFeedIndex} />}
      rightPane={
        <ArticleList
          articles={articles}
          selectedArticle={selectedArticle}
        />
      }
    />
  );
}
