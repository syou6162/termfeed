export type WindowConfig = {
  windowSize?: number;
};

export function calculateSlidingWindow<T extends { id: number }>(
  items: T[],
  selectedIndex: number,
  config: WindowConfig = {}
) {
  const { windowSize = 10 } = config;

  const selectedItem = items[selectedIndex];
  const selectedItemIndex = selectedItem
    ? items.findIndex((item) => item.id === selectedItem.id)
    : -1;

  let startIndex = 0;
  if (items.length > windowSize && selectedItemIndex >= 0) {
    startIndex = selectedItemIndex;
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
