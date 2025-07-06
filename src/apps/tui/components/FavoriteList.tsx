import { Box, Text, useStdout } from 'ink';
import { useState, useEffect, useCallback } from 'react';
import { convertHtmlToText } from '../utils/html.js';
import type { Article } from '@/types';
import type { FavoriteService } from '../../../services/favorite.js';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation.js';
import { TUI_CONFIG } from '../config/constants.js';

interface FavoriteListProps {
  favoriteService: FavoriteService;
  isPinned: (articleId: number) => boolean;
  onOpenInBrowser: (url: string) => void;
  onToggleFavorite: (articleId: number) => void;
  onTogglePin: (articleId: number) => void;
  onFavoriteChange?: () => void;
}

export function FavoriteList({
  favoriteService,
  isPinned,
  onOpenInBrowser,
  onToggleFavorite,
  onTogglePin,
  onFavoriteChange,
}: FavoriteListProps) {
  const { stdout } = useStdout();
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [contentLines, setContentLines] = useState<string[]>([]);
  const [totalLines, setTotalLines] = useState(0);

  // お気に入り記事を取得
  const loadFavorites = useCallback(() => {
    const articles = favoriteService.getFavoriteArticles();
    setFavoriteArticles(articles);
  }, [favoriteService]);

  // 初回ロード
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // お気に入り変更時のコールバックを監視
  useEffect(() => {
    if (onFavoriteChange) {
      loadFavorites();
    }
  }, [onFavoriteChange, loadFavorites]);

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
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
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
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
    const maxOffset = Math.max(0, totalLines - availableLines);
    setScrollOffset((prev) => Math.min(prev + 1, maxOffset));
  }, [totalLines, stdout?.rows]);

  const scrollUp = useCallback(() => {
    setScrollOffset((prev) => Math.max(prev - 1, 0));
  }, []);

  const pageDown = useCallback(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
    const maxOffset = Math.max(0, totalLines - availableLines);
    setScrollOffset((prev) => Math.min(prev + availableLines, maxOffset));
  }, [totalLines, stdout?.rows]);

  const scrollToEnd = useCallback(() => {
    const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
    const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
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
      // お気に入りを更新後、リストを再読み込み
      const newArticles = favoriteService.getFavoriteArticles();
      setFavoriteArticles(newArticles);
      // 最後の記事を解除した場合のインデックス調整
      if (selectedIndex >= newArticles.length && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    }
  }, [selectedArticle, onToggleFavorite, favoriteService]);

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
        <Box
          flexDirection="column"
          borderStyle="single"
          height="100%"
          width="100%"
          flexShrink={0}
          flexGrow={1}
        >
          {/* ヘッダー部分：固定 */}
          <Box paddingTop={1} paddingX={1}>
            <Text bold color="green">
              {selectedArticle.title}
            </Text>
          </Box>
          <Box paddingX={1}>
            <Text color="gray">
              公開日: {new Date(selectedArticle.published_at).toLocaleDateString('ja-JP')}
            </Text>
            {selectedArticle.author && <Text color="cyan"> | 著者: {selectedArticle.author}</Text>}
            {isPinned(selectedArticle.id) && (
              <Text color="yellow" bold>
                {selectedArticle.author ? ' | ' : ' | '}📌 ピン
              </Text>
            )}
          </Box>
          <Box paddingX={1} marginBottom={1}>
            <Text color="yellow">URL: {selectedArticle.url}</Text>
          </Box>

          {/* コンテンツ部分：スクロール可能 */}
          {selectedArticle.content && (
            <Box
              paddingX={1}
              height={(() => {
                const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
                const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
                return availableLines;
              })()}
              overflow="hidden"
            >
              <Text wrap="wrap">
                {(() => {
                  const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
                  const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
                  const visibleLines = contentLines.slice(
                    scrollOffset,
                    scrollOffset + availableLines
                  );
                  return visibleLines.join('\n');
                })()}
              </Text>
            </Box>
          )}

          {/* ステータス部分：固定 */}
          <Box paddingX={1} marginTop={1}>
            <Text color="gray" dimColor>
              {(() => {
                const totalHeight = stdout?.rows || TUI_CONFIG.DEFAULT_TERMINAL_HEIGHT;
                const availableLines = Math.max(1, totalHeight - TUI_CONFIG.ARTICLE_FIXED_LINES);
                const hasMoreContent = scrollOffset + availableLines < totalLines;
                const scrollInfo =
                  totalLines > availableLines
                    ? `(${scrollOffset + 1}-${Math.min(scrollOffset + availableLines, totalLines)} / ${totalLines}行)`
                    : '';
                return (
                  scrollInfo +
                  (hasMoreContent && scrollInfo ? ' ' : '') +
                  (hasMoreContent ? 'スペースで続きを表示' : '')
                );
              })()}
            </Text>
          </Box>
        </Box>
      )}

      <Box borderStyle="single" borderColor="gray" padding={1}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text dimColor>
            j/k: 移動 | v: ブラウザで開く | f: お気に入り解除 | p: ピン | Space: スクロール | g/G:
            先頭/末尾 | F: 戻る
          </Text>
          <Text dimColor>
            {favoriteArticles.length > 0 ? `${selectedIndex + 1}/${favoriteArticles.length}件` : ''}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
