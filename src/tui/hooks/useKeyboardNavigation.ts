import { useInput } from 'ink';
import { useCallback } from 'react';

type KeyEvent = {
  ctrl?: boolean;
  escape?: boolean;
  return?: boolean;
  upArrow?: boolean;
  downArrow?: boolean;
  pageUp?: boolean;
  pageDown?: boolean;
};

type KeyboardNavigationProps = {
  articleCount: number;
  feedCount: number;
  selectedArticleIndex: number;
  selectedFeedIndex: number;
  onArticleSelectionChange: (index: number) => void;
  onFeedSelectionChange: (index: number) => void;
  onSelect?: () => void;
  onRefresh?: () => void;
  onToggleFavorite?: () => void;
  onQuit?: () => void;
};

export function useKeyboardNavigation({
  articleCount,
  feedCount,
  selectedArticleIndex,
  selectedFeedIndex,
  onArticleSelectionChange,
  onFeedSelectionChange,
  onSelect,
  onRefresh,
  onToggleFavorite,
  onQuit,
}: KeyboardNavigationProps) {
  const handleInput = useCallback(
    (input: string, key: KeyEvent) => {
      // 終了
      if (input === 'q' || (key.ctrl && input === 'c')) {
        onQuit?.();
        return;
      }

      // 更新
      if (input === 'r') {
        onRefresh?.();
        return;
      }

      // 選択・決定
      if (key.return || input === 'l') {
        onSelect?.();
        return;
      }

      // お気に入りトグル
      if (input === 'f') {
        onToggleFavorite?.();
        return;
      }

      // 記事ナビゲーション (j/k)
      if (key.upArrow || input === 'k') {
        if (articleCount > 0) {
          const newIndex = selectedArticleIndex > 0 ? selectedArticleIndex - 1 : articleCount - 1;
          onArticleSelectionChange(newIndex);
        }
        return;
      }

      if (key.downArrow || input === 'j') {
        if (articleCount > 0) {
          const newIndex = selectedArticleIndex < articleCount - 1 ? selectedArticleIndex + 1 : 0;
          onArticleSelectionChange(newIndex);
        }
        return;
      }

      // フィードナビゲーション (a/s)
      if (input === 'a') {
        if (feedCount > 0) {
          const newIndex = selectedFeedIndex < feedCount - 1 ? selectedFeedIndex + 1 : 0;
          onFeedSelectionChange(newIndex);
        }
        return;
      }

      if (input === 's') {
        if (feedCount > 0) {
          const newIndex = selectedFeedIndex > 0 ? selectedFeedIndex - 1 : feedCount - 1;
          onFeedSelectionChange(newIndex);
        }
        return;
      }

      // ページ移動
      if (key.pageUp || input === 'u') {
        if (articleCount > 0) {
          const newIndex = Math.max(0, selectedArticleIndex - 10);
          onArticleSelectionChange(newIndex);
        }
        return;
      }

      if (key.pageDown || input === 'd') {
        if (articleCount > 0) {
          const newIndex = Math.min(articleCount - 1, selectedArticleIndex + 10);
          onArticleSelectionChange(newIndex);
        }
        return;
      }

      // 先頭・末尾へ移動
      if (input === 'g') {
        if (articleCount > 0) {
          onArticleSelectionChange(0);
        }
        return;
      }

      if (input === 'G') {
        if (articleCount > 0) {
          onArticleSelectionChange(articleCount - 1);
        }
        return;
      }
    },
    [
      articleCount,
      feedCount,
      selectedArticleIndex,
      selectedFeedIndex,
      onArticleSelectionChange,
      onFeedSelectionChange,
      onSelect,
      onRefresh,
      onToggleFavorite,
      onQuit,
    ]
  );

  useInput(handleInput);
}
