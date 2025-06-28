import React from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from './SelectableList.js';
import type { Feed } from '../../models/types.js';

type FeedListProps = {
  feeds: Feed[];
  selectedIndex: number;
  isActive: boolean;
  unreadCounts?: Map<number, number>;
};

export const FeedList: React.FC<FeedListProps> = ({
  feeds,
  selectedIndex,
  isActive,
  unreadCounts = new Map<number, number>(),
}) => {
  const renderFeed = (feed: Feed) => {
    if (!feed.id) return feed.title;
    const count = unreadCounts.get(feed.id);
    const unreadCount = count !== undefined ? count : 0;
    const unreadIndicator = unreadCount > 0 ? ` (${unreadCount})` : '';
    return `${feed.title}${unreadIndicator}`;
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box marginBottom={1}>
        <Text bold>Feeds</Text>
      </Box>
      <SelectableList
        items={feeds}
        selectedIndex={selectedIndex}
        renderItem={renderFeed}
        isActive={isActive}
        emptyMessage="No feeds. Add one with 'termfeed add <url>'"
      />
    </Box>
  );
};
