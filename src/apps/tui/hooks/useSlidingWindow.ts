export type WindowConfig = {
  windowSize?: number;
};

export function calculateSlidingWindow<T extends { id: number }>(
  items: T[],
  selectedIndex: number,
  config: WindowConfig = {}
) {
  const { windowSize = 10 } = config;

  // 入力値のバリデーション
  const validSelectedIndex = Math.max(0, Math.min(selectedIndex, items.length - 1));
  const actualIndex = items.length > 0 ? validSelectedIndex : -1;

  let startIndex = 0;
  if (items.length > windowSize && actualIndex >= 0) {
    startIndex = actualIndex;
    startIndex = Math.min(startIndex, items.length - windowSize);
  }

  const endIndex = Math.min(startIndex + windowSize, items.length);

  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    totalItems: items.length,
    isWindowActive: items.length > windowSize,
  };
}
