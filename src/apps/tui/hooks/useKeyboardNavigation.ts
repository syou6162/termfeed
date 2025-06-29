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
  onOpenInBrowser?: () => void;
  onRefreshAll?: () => void;
  onToggleFavorite?: () => void;
  onToggleHelp?: () => void;
  onQuit?: () => void;
  onScrollDown?: () => void;
  onScrollUp?: () => void;
  onPageDown?: () => void;
  onPageUp?: () => void;
  onScrollOffsetChange?: (offset: number) => void;
  onScrollToEnd?: () => void;
  onCancel?: () => void;
  onToggleFailedFeeds?: () => void;
};

export function useKeyboardNavigation({
  articleCount,
  feedCount,
  selectedArticleIndex,
  selectedFeedIndex,
  onArticleSelectionChange,
  onFeedSelectionChange,
  onOpenInBrowser,
  onRefreshAll,
  onToggleFavorite,
  onToggleHelp,
  onQuit,
  onScrollDown,
  onScrollUp,
  onPageDown,
  onPageUp,
  onScrollOffsetChange,
  onScrollToEnd,
  onCancel,
  onToggleFailedFeeds,
}: KeyboardNavigationProps) {
  const handleInput = useCallback(
    (input: string, key: KeyEvent) => {
      // 終了
      if (input === 'q' || (key.ctrl && input === 'c')) {
        onQuit?.();
        return;
      }

      // 全フィード更新
      if (input === 'r') {
        onRefreshAll?.();
        return;
      }

      // ブラウザで開く
      if (input === 'v') {
        onOpenInBrowser?.();
        return;
      }

      // ヘルプ表示トグル
      if (input === '?') {
        onToggleHelp?.();
        return;
      }

      // キャンセル (ESC)
      if (key.escape) {
        onCancel?.();
        return;
      }

      // エラー詳細表示トグル (e)
      if (input === 'e') {
        onToggleFailedFeeds?.();
        return;
      }

      // お気に入りトグル
      if (input === 'f') {
        onToggleFavorite?.();
        return;
      }

      // スクロール (スペースキー)
      if (input === ' ') {
        onPageDown?.();
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

      // フィードナビゲーション (s/a)
      if (input === 's') {
        if (feedCount > 0) {
          const newIndex = selectedFeedIndex < feedCount - 1 ? selectedFeedIndex + 1 : 0;
          onFeedSelectionChange(newIndex);
        }
        return;
      }

      if (input === 'a') {
        if (feedCount > 0) {
          const newIndex = selectedFeedIndex > 0 ? selectedFeedIndex - 1 : feedCount - 1;
          onFeedSelectionChange(newIndex);
        }
        return;
      }

      // 記事内の先頭・末尾へ移動（スクロール）
      if (input === 'g') {
        onScrollOffsetChange?.(0);
        return;
      }

      if (input === 'G') {
        onScrollToEnd?.();
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
      onOpenInBrowser,
      onRefreshAll,
      onToggleFavorite,
      onToggleHelp,
      onQuit,
      onScrollDown,
      onScrollUp,
      onPageDown,
      onPageUp,
      onScrollOffsetChange,
      onScrollToEnd,
      onCancel,
      onToggleFailedFeeds,
    ]
  );

  useInput(handleInput);
}
