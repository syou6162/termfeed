import { Box, Text } from 'ink';
import React from 'react';

type SelectableListItem = {
  id: string | number;
  displayText: string;
  badge?: string;
  isRead?: boolean;
  isFavorite?: boolean;
};

type SelectableListProps<T extends SelectableListItem> = {
  items: T[];
  selectedIndex: number;
  emptyMessage?: string;
  renderItem?: (item: T, isSelected: boolean) => React.ReactNode;
};

export function SelectableList<T extends SelectableListItem>({
  items,
  selectedIndex,
  emptyMessage = 'アイテムがありません',
  renderItem,
}: SelectableListProps<T>) {
  if (items.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" height={3}>
        <Text color="gray" italic>
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  const renderDefaultItem = (item: T, isSelected: boolean) => {
    const prefix = isSelected ? '>' : ' ';
    const favoriteMarker = item.isFavorite ? '★ ' : '';
    const readMarker = item.isRead === false ? '● ' : '';
    const badge = item.badge ? ` (${item.badge})` : '';

    return (
      <Text key={item.id} color={isSelected ? 'blue' : undefined} bold={isSelected}>
        {prefix} {favoriteMarker}
        {readMarker}
        {item.displayText}
        {badge}
      </Text>
    );
  };

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const content = renderItem
          ? renderItem(item, isSelected)
          : renderDefaultItem(item, isSelected);
        return <Box key={item.id}>{content}</Box>;
      })}
    </Box>
  );
}
