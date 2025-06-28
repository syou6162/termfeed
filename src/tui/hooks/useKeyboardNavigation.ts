import { useCallback } from 'react';
import { useInput } from 'ink';
import type { FocusState, Pane } from '../types/index.js';

type UseKeyboardNavigationProps = {
  focusState: FocusState;
  onFocusChange: (state: FocusState) => void;
  leftPaneItemsCount: number;
  rightPaneItemsCount: number;
  onExit?: () => void;
  onSelect?: (pane: Pane, index: number) => void;
};

export function useKeyboardNavigation({
  focusState,
  onFocusChange,
  leftPaneItemsCount,
  rightPaneItemsCount,
  onExit,
  onSelect,
}: UseKeyboardNavigationProps) {
  const moveUp = useCallback(() => {
    const isLeftPane = focusState.activePane === 'left';
    const currentIndex = isLeftPane ? focusState.leftPaneIndex : focusState.rightPaneIndex;

    if (currentIndex > 0) {
      onFocusChange({
        ...focusState,
        [isLeftPane ? 'leftPaneIndex' : 'rightPaneIndex']: currentIndex - 1,
      });
    }
  }, [focusState, onFocusChange, leftPaneItemsCount, rightPaneItemsCount]);

  const moveDown = useCallback(() => {
    const isLeftPane = focusState.activePane === 'left';
    const currentIndex = isLeftPane ? focusState.leftPaneIndex : focusState.rightPaneIndex;
    const itemsCount = isLeftPane ? leftPaneItemsCount : rightPaneItemsCount;

    if (currentIndex < itemsCount - 1) {
      onFocusChange({
        ...focusState,
        [isLeftPane ? 'leftPaneIndex' : 'rightPaneIndex']: currentIndex + 1,
      });
    }
  }, [focusState, onFocusChange, leftPaneItemsCount, rightPaneItemsCount]);

  const switchPane = useCallback(() => {
    onFocusChange({
      ...focusState,
      activePane: focusState.activePane === 'left' ? 'right' : 'left',
    });
  }, [focusState, onFocusChange]);

  useInput((input, key) => {
    if (input === 'q') {
      onExit?.();
    } else if (input === 'j' || key.downArrow) {
      moveDown();
    } else if (input === 'k' || key.upArrow) {
      moveUp();
    } else if (input === 'h' || key.leftArrow) {
      if (focusState.activePane === 'right') {
        switchPane();
      }
    } else if (input === 'l' || key.rightArrow) {
      if (focusState.activePane === 'left') {
        switchPane();
      }
    } else if (key.tab) {
      switchPane();
    } else if (key.return) {
      const pane = focusState.activePane;
      const index = pane === 'left' ? focusState.leftPaneIndex : focusState.rightPaneIndex;
      onSelect?.(pane, index);
    }
  });
}
