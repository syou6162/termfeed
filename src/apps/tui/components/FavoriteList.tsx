import { Box, Text, useStdout } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import { convertHtmlToText } from '../utils/html.js';
import type { Article } from '@/types';
import type { ArticleModel } from '../../../models/article.js';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation.js';
import { TUI_CONFIG } from '../config/constants.js';

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
  const { stdout } = useStdout();
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentLines, setContentLines] = useState<string[]>([]);
  const [totalLines, setTotalLines] = useState(0);

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

  // 記事が変わったときにスクロール位置をリセット
  useEffect(() => {
    if (selectedArticle) {
      setScrollOffset(0);
    }
  }, [selectedArticle?.id]);

  // コンテンツの行を更新
  useEffect(() => {
    if (selectedArticle?.content) {
      const plainText = convertHtmlToText(selectedArticle.content);
      const lines = plainText.split('\n');
      setContentLines(lines);
      setTotalLines(lines.length);
    } else {
      setContentLines([]);
      setTotalLines(0);
    }
  }, [selectedArticle?.content]);

  // スクロールオフセットを最大値に制限
  useEffect(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    // お気に入りモード用の固定行数（ヘッダー、メタ情報、フッター）
    const favoriteFixedLines = 10; // ヘッダー3行 + フッター3行 + ボーダー・パディング4行
    const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
    const maxOffset = Math.max(0, totalLines - availableLines);

    if (scrollOffset > maxOffset) {
      setScrollOffset(maxOffset);
    }
  }, [scrollOffset, totalLines, stdout?.rows]);

  // j/kナビゲーション
  const handleArticleSelectionChange = useCallback(
    (index: number) => {
      if (index >= 0 && index < favoriteArticles.length) {
        setSelectedIndex(index);
      }
    },
    [favoriteArticles.length]
  );

  // スクロール関数
  const scrollDown = useCallback(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    const favoriteFixedLines = 10;
    const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
    const maxOffset = Math.max(0, totalLines - availableLines);
    setScrollOffset((prev) => Math.min(prev + 1, maxOffset));
  }, [totalLines, stdout?.rows]);

  const scrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(prev - 1, 0));
  }, []);

  const pageDown = useCallback(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    const favoriteFixedLines = 10;
    const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
    const maxOffset = Math.max(0, totalLines - availableLines);
    setScrollOffset((prev) => Math.min(prev + availableLines, maxOffset));
  }, [totalLines, stdout?.rows]);

  const scrollToEnd = useCallback(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    const favoriteFixedLines = 10;
    const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
    const maxOffset = Math.max(0, totalLines - availableLines);
    setScrollOffset(maxOffset);
  }, [totalLines, stdout?.rows]);

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
    onScrollDown: scrollDown,
    onScrollUp: scrollUp,
    onScrollOffsetChange: setScrollOffset,
    onPageDown: pageDown,
    onScrollToEnd: scrollToEnd,
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
      {/* ヘッダー部分 */}
      <Box borderStyle="round" borderColor="yellow" padding={1} marginBottom={1}>
        <Text bold color="yellow">
          お気に入り記事一覧 ({favoriteArticles.length}件) - {selectedIndex + 1}/
          {favoriteArticles.length}
        </Text>
      </Box>

      {/* 選択された記事の詳細を100%幅で表示 */}
      {selectedArticle && (
        <Box flexDirection="column" flexGrow={1} borderStyle="single" padding={1}>
          {/* ヘッダー部分：固定 */}
          <Box paddingBottom={1}>
            <Text bold color="green">
              {selectedArticle.title}
            </Text>
          </Box>
          <Box paddingBottom={1}>
            <Text color="gray">
              公開日: {new Date(selectedArticle.published_at).toLocaleDateString('ja-JP')}
            </Text>
            {selectedArticle.author && <Text color="cyan"> | 著者: {selectedArticle.author}</Text>}
            {isPinned(selectedArticle.id) && (
              <Text color="yellow" bold>
                {' '}
                | 📌 ピン
              </Text>
            )}
          </Box>
          <Box paddingBottom={1}>
            <Text color="yellow">URL: {selectedArticle.url}</Text>
          </Box>

          {/* コンテンツ部分：スクロール可能 */}
          {selectedArticle.content && (
            <Box>
              {(() => {
                const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
                // ヘッダー3行 + フッター3行 + ボーダー・パディング4行 = 10行
                const favoriteFixedLines = 10;
                const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
                const visibleLines = contentLines.slice(
                  scrollOffset,
                  scrollOffset + availableLines
                );
                const displayText = visibleLines.join('\n');
                return <Text wrap="wrap">{displayText}</Text>;
              })()}
            </Box>
          )}
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor>
            j/k: 移動 | v: ブラウザで開く | f: お気に入り解除 | p: ピン | Space: スクロール | g/G:
            先頭/末尾 | F: 戻る
          </Text>
          {selectedArticle?.content && totalLines > 0 && (
            <Text dimColor>
              {(() => {
                const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
                const favoriteFixedLines = 10;
                const availableLines = Math.max(1, totalHeight - favoriteFixedLines);
                const hasMoreContent = scrollOffset + availableLines < totalLines;
                if (totalLines > availableLines) {
                  return `(${scrollOffset + 1}-${Math.min(scrollOffset + availableLines, totalLines)} / ${totalLines}行)${hasMoreContent ? ' スペースで続きを表示' : ''}`;
                }
                return '';
              })()}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
