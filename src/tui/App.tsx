import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useState } from 'react';
import type { Article, Feed } from '../models/types.js';
import { FeedService } from '../services/feed-service.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { DatabaseManager } from '../models/database.js';
import { ArticleList } from './components/ArticleList.js';
import { FeedList } from './components/FeedList.js';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';

type FeedWithUnreadCount = Feed & {
  unreadCount: number;
};

type AppState = 'feeds' | 'articles';

export function App() {
  const { exit } = useApp();
  const [feeds, setFeeds] = useState<FeedWithUnreadCount[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState(0);
  const [selectedArticleIndex, setSelectedArticleIndex] = useState(0);
  const [currentState, setCurrentState] = useState<AppState>('feeds');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const databaseManager = new DatabaseManager();
  // マイグレーションを実行
  databaseManager.migrate();
  
  const feedModel = new FeedModel(databaseManager);
  const articleModel = new ArticleModel(databaseManager);
  const feedService = new FeedService(feedModel, articleModel);

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

      if (currentState === 'articles' && feeds[selectedFeedIndex]?.id) {
        loadArticles(feeds[selectedFeedIndex].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'フィードの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [currentState, selectedFeedIndex, feeds, loadFeeds, loadArticles]);

  const handleFeedSelect = useCallback(() => {
    const selectedFeed = feeds[selectedFeedIndex];
    if (selectedFeed?.id) {
      setCurrentState('articles');
      loadArticles(selectedFeed.id);
    }
  }, [feeds, selectedFeedIndex, loadArticles]);

  const handleArticleSelect = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.url) {
      // ブラウザでURLを開く（実装は環境に依存）
      console.log(`Opening: ${selectedArticle.url}`);
    }
  }, [articles, selectedArticleIndex]);

  const handleToggleRead = useCallback(() => {
    const selectedArticle = articles[selectedArticleIndex];
    if (selectedArticle?.id) {
      try {
        if (selectedArticle.is_read) {
          feedService.markArticleAsUnread(selectedArticle.id);
        } else {
          feedService.markArticleAsRead(selectedArticle.id);
        }

        // 記事リストを再読み込み
        const selectedFeed = feeds[selectedFeedIndex];
        if (selectedFeed?.id) {
          loadArticles(selectedFeed.id);
          loadFeeds(); // 未読カウントを更新
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '既読状態の更新に失敗しました');
      }
    }
  }, [
    articles,
    selectedArticleIndex,
    feeds,
    selectedFeedIndex,
    loadArticles,
    loadFeeds,
    feedService,
  ]);

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

  const handleBack = useCallback(() => {
    if (currentState === 'articles') {
      setCurrentState('feeds');
      setArticles([]);
    }
  }, [currentState]);

  const handleQuit = useCallback(() => {
    exit();
  }, [exit]);

  // フィード画面でのキーボードナビゲーション
  useKeyboardNavigation({
    itemCount: currentState === 'feeds' ? feeds.length : articles.length,
    selectedIndex: currentState === 'feeds' ? selectedFeedIndex : selectedArticleIndex,
    onSelectionChange: currentState === 'feeds' ? setSelectedFeedIndex : setSelectedArticleIndex,
    onSelect: currentState === 'feeds' ? handleFeedSelect : handleArticleSelect,
    onBack: handleBack,
    onRefresh: () => void updateFeeds(),
    onToggleRead: currentState === 'articles' ? handleToggleRead : undefined,
    onToggleFavorite: currentState === 'articles' ? handleToggleFavorite : undefined,
    onQuit: handleQuit,
  });

  // 初期化
  useEffect(() => {
    loadFeeds();
  }, [loadFeeds]);

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

  if (currentState === 'feeds') {
    return <FeedList feeds={feeds} selectedIndex={selectedFeedIndex} />;
  }

  if (currentState === 'articles') {
    const selectedFeed = feeds[selectedFeedIndex];
    const selectedArticle = articles[selectedArticleIndex];

    return (
      <TwoPaneLayout
        leftPane={
          <ArticleList
            articles={articles}
            selectedIndex={selectedArticleIndex}
            selectedArticle={selectedArticle}
            feedTitle={selectedFeed?.title}
          />
        }
        rightPane={
          <Box padding={1}>
            <Text color="gray" italic>
              記事詳細は左ペインに表示されます
            </Text>
          </Box>
        }
      />
    );
  }

  return null;
}
