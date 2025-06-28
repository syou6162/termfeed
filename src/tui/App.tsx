import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { TwoPaneLayout } from './components/TwoPaneLayout.js';
import { FeedList } from './components/FeedList.js';
import { ArticleList } from './components/ArticleList.js';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { DatabaseManager } from '../models/database.js';
import type { Feed, Article } from '../models/types.js';
import type { FocusState } from './types/index.js';

type AppProps = {
  dbManager: DatabaseManager;
  onExit: () => void;
};

export const App: React.FC<AppProps> = ({ dbManager, onExit }) => {
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [focusState, setFocusState] = useState<FocusState>({
    activePane: 'left',
    leftPaneIndex: 0,
    rightPaneIndex: 0,
  });

  // フィード一覧を読み込む
  useEffect(() => {
    const feedModel = new FeedModel(dbManager);
    const articleModel = new ArticleModel(dbManager);

    try {
      const allFeeds = feedModel.findAll();
      setFeeds(allFeeds);

      // 未読数を計算
      const counts = new Map<number, number>();
      allFeeds.forEach((feed) => {
        if (feed.id) {
          const unreadCount = articleModel.countUnread(feed.id);
          if (unreadCount > 0) {
            counts.set(feed.id, unreadCount);
          }
        }
      });
      setUnreadCounts(counts);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  }, [dbManager]);

  // 選択されたフィードの記事を読み込む
  useEffect(() => {
    if (feeds.length > 0 && focusState.leftPaneIndex < feeds.length) {
      const selectedFeed = feeds[focusState.leftPaneIndex];
      if (selectedFeed.id) {
        const articleModel = new ArticleModel(dbManager);
        try {
          const feedArticles = articleModel.findAll({ feed_id: selectedFeed.id });
          setArticles(feedArticles);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      }
    }
  }, [focusState.leftPaneIndex, feeds, dbManager]);

  useKeyboardNavigation({
    focusState,
    onFocusChange: setFocusState,
    leftPaneItemsCount: feeds.length,
    rightPaneItemsCount: articles.length,
    onExit,
    onSelect: (pane, index) => {
      if (pane === 'right' && articles[index]) {
        const article = articles[index];
        if (article.id && !article.is_read) {
          const articleModel = new ArticleModel(dbManager);
          // 記事を既読にする
          articleModel.markAsRead(article.id);
          // 記事リストを更新
          const updatedArticles = [...articles];
          updatedArticles[index] = { ...article, is_read: true };
          setArticles(updatedArticles);
          // 未読数を更新
          const selectedFeed = feeds[focusState.leftPaneIndex];
          if (selectedFeed.id) {
            const currentCount = unreadCounts.get(selectedFeed.id) || 0;
            if (currentCount > 0) {
              const newCounts = new Map(unreadCounts);
              newCounts.set(selectedFeed.id, currentCount - 1);
              setUnreadCounts(newCounts);
            }
          }
        }
      }
    },
  });

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (error) {
    return <Text color="red">Error: {error}</Text>;
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text bold>termfeed - RSS Reader</Text>
        <Text color="gray"> (q: quit, j/k: up/down, h/l: left/right, Enter: mark as read)</Text>
      </Box>
      <TwoPaneLayout
        leftPane={
          <FeedList
            feeds={feeds}
            selectedIndex={focusState.leftPaneIndex}
            isActive={focusState.activePane === 'left'}
            unreadCounts={unreadCounts}
          />
        }
        rightPane={
          <ArticleList
            articles={articles}
            selectedIndex={focusState.rightPaneIndex}
            isActive={focusState.activePane === 'right'}
          />
        }
        activePane={focusState.activePane}
      />
    </Box>
  );
};
