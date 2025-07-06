import { Box, Text } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import { convertHtmlToText } from '../utils/html.js';
import type { Article } from '@/types';
import type { ArticleModel } from '../../../models/article.js';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation.js';

interface FavoriteListProps {
  articleModel: ArticleModel;
  isPinned: (articleId: number) => boolean;
  onOpenInBrowser: (url: string) => void;
  onToggleFavorite: (articleId: number) => void;
  onTogglePin: (articleId: number) => void;
}

export function FavoriteList({
  articleModel,
  isPinned,
  onOpenInBrowser,
  onToggleFavorite,
  onTogglePin,
}: FavoriteListProps) {
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // お気に入り記事を取得
  useEffect(() => {
    const loadFavorites = () => {
      const articles = articleModel.getFavoriteArticles();
      setFavoriteArticles(articles);
    };

    loadFavorites();
    // お気に入りの変更を検知するために、定期的に更新
    const interval = globalThis.setInterval(loadFavorites, 1000);
    return () => globalThis.clearInterval(interval);
  }, [articleModel]);

  const selectedArticle = favoriteArticles[selectedIndex];

  // j/kナビゲーション
  const handleArticleSelectionChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < favoriteArticles.length) {
        setSelectedIndex(index);
      }
    },
    [favoriteArticles.length]
  );

  // vキーでブラウザで開く
  const handleOpenInBrowser = useCallback(() => {
    if (selectedArticle?.url) {
      onOpenInBrowser(selectedArticle.url);
    }
  }, [selectedArticle, onOpenInBrowser]);

  // fキーでお気に入りトグル
  const handleToggleFavorite = useCallback(() => {
    if (selectedArticle) {
      onToggleFavorite(selectedArticle.id);
      // お気に入りを解除したら、次の更新でリストから削除される
      // 最後の記事を解除した場合のインデックス調整
      setTimeout(() => {
        setSelectedIndex((prevIndex) => {
          const newLength = articleModel.getFavoriteArticles().length;
          if (prevIndex >= newLength && prevIndex > 0) {
            return prevIndex - 1;
          }
          return prevIndex;
        });
      }, 100);
    }
  }, [selectedArticle, onToggleFavorite, articleModel]);

  // pキーでピントグル
  const handleTogglePin = useCallback(() => {
    if (selectedArticle) {
      onTogglePin(selectedArticle.id);
    }
  }, [selectedArticle, onTogglePin]);

  // キーボードナビゲーション
  useKeyboardNavigation({
    articleCount: favoriteArticles.length,
    feedCount: 0, // お気に入りモードではフィードナビゲーションは無効
    selectedArticleIndex: selectedIndex,
    selectedFeedIndex: 0,
    onArticleSelectionChange: handleArticleSelectionChange,
    onFeedSelectionChange: () => {}, // 無効
    onOpenInBrowser: handleOpenInBrowser,
    onToggleFavorite: handleToggleFavorite,
    onTogglePin: handleTogglePin,
    onScrollDown: () => {},
    onScrollUp: () => {},
    onScrollOffsetChange: () => {},
  });

  if (favoriteArticles.length === 0) {
    return (
      <Box flexDirection="column" padding={2}>
        <Text color="yellow">お気に入りの記事がありません</Text>
        <Text dimColor>記事を表示中に「f」キーを押すと、お気に入りに追加できます。</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
        <Text bold color="yellow">
          お気に入り記事一覧 ({favoriteArticles.length}件)
        </Text>
      </Box>

      {/* ワンペインレイアウト - 記事一覧のみ */}
      <Box flexDirection="column" flexGrow={1} borderStyle="single">
        {favoriteArticles.map((article, index) => (
          <Box key={article.id} paddingLeft={1} paddingRight={1} paddingY={0}>
            <Box flexDirection="row" alignItems="center">
              <Text
                color={index === selectedIndex ? 'green' : 'gray'}
                bold={index === selectedIndex}
              >
                {index === selectedIndex ? '► ' : '  '}
                {isPinned(article.id) && '📌 '}
                {article.title}
              </Text>
            </Box>
            {index === selectedIndex && (
              <Box paddingLeft={2} marginTop={1} marginBottom={1}>
                <Text color="cyan" dimColor>
                  {article.url}
                </Text>
                {article.author && <Text dimColor>著者: {article.author}</Text>}
                {article.published_at && (
                  <Text dimColor>
                    公開日: {new Date(article.published_at).toLocaleDateString('ja-JP')}
                  </Text>
                )}
                {article.content && (
                  <Box marginTop={1}>
                    <Text wrap="wrap">
                      {convertHtmlToText(article.content)
                        .split('\n')
                        .slice(0, 3) // 最初の3行のみ表示
                        .join('\n')}
                      {convertHtmlToText(article.content).split('\n').length > 3 && '...'}
                    </Text>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Text dimColor>
          j/k: 移動 | v: ブラウザで開く | f: お気に入り解除 | p: ピン | F: 通常モードに戻る
        </Text>
      </Box>
    </Box>
  );
}
