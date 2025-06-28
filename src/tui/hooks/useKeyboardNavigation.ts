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
  itemCount: number;
  selectedIndex: number;
  onSelectionChange: (index: number) => void;
  onSelect?: () => void;
  onBack?: () => void;
  onRefresh?: () => void;
  onToggleRead?: () => void;
  onToggleFavorite?: () => void;
  onQuit?: () => void;
};

export function useKeyboardNavigation({
  itemCount,
  selectedIndex,
  onSelectionChange,
  onSelect,
  onBack,
  onRefresh,
  onToggleRead,
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

      // 戻る
      if (key.escape || input === 'h') {
        onBack?.();
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

      // 既読トグル
      if (input === 'm') {
        onToggleRead?.();
        return;
      }

      // お気に入りトグル
      if (input === 'f') {
        onToggleFavorite?.();
        return;
      }

      // ナビゲーション
      if (key.upArrow || input === 'k') {
        const newIndex = selectedIndex > 0 ? selectedIndex - 1 : itemCount - 1;
        onSelectionChange(newIndex);
        return;
      }

      if (key.downArrow || input === 'j') {
        const newIndex = selectedIndex < itemCount - 1 ? selectedIndex + 1 : 0;
        onSelectionChange(newIndex);
        return;
      }

      // ページ移動
      if (key.pageUp || input === 'u') {
        const newIndex = Math.max(0, selectedIndex - 10);
        onSelectionChange(newIndex);
        return;
      }

      if (key.pageDown || input === 'd') {
        const newIndex = Math.min(itemCount - 1, selectedIndex + 10);
        onSelectionChange(newIndex);
        return;
      }

      // 先頭・末尾へ移動
      if (input === 'g') {
        onSelectionChange(0);
        return;
      }

      if (input === 'G') {
        onSelectionChange(itemCount - 1);
        return;
      }
    },
    [
      itemCount,
      selectedIndex,
      onSelectionChange,
      onSelect,
      onBack,
      onRefresh,
      onToggleRead,
      onToggleFavorite,
      onQuit,
    ]
  );

  useInput(handleInput);
}
