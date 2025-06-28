import React from 'react';
import { Box, Text } from 'ink';

type SelectableListProps<T> = {
  items: T[];
  selectedIndex: number;
  renderItem: (item: T, index: number) => string;
  isActive?: boolean;
  emptyMessage?: string;
};

export function SelectableList<T>({
  items,
  selectedIndex,
  renderItem,
  isActive = true,
  emptyMessage = 'No items',
}: SelectableListProps<T>) {
  if (items.length === 0) {
    return <Text color="gray">{emptyMessage}</Text>;
  }

  return (
    <Box flexDirection="column">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        const prefix = isSelected ? '> ' : '  ';
        const color = isActive && isSelected ? 'green' : undefined;
        const bold = isActive && isSelected;

        return (
          <Text key={index} color={color} bold={bold}>
            {prefix}
            {renderItem(item, index)}
          </Text>
        );
      })}
    </Box>
  );
}