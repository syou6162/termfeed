import { Box, Text } from 'ink';
import type { Feed } from '../../models/types.js';
import { SelectableList } from './SelectableList.js';

type FeedWithUnreadCount = Feed & {
  unreadCount: number;
};

type FeedListItem = {
  id: number;
  displayText: string;
  badge: string;
  isRead?: boolean;
  isFavorite?: boolean;
};

type FeedListProps = {
  feeds: FeedWithUnreadCount[];
  selectedIndex: number;
  onFeedSelect?: (feed: FeedWithUnreadCount) => void;
};

export function FeedList({ feeds, selectedIndex }: FeedListProps) {
  const feedItems: FeedListItem[] = feeds.map((feed) => ({
    id: feed.id || 0,
    displayText: feed.title,
    badge: feed.unreadCount > 0 ? `${feed.unreadCount}件` : '0件',
    isRead: feed.unreadCount === 0,
  }));

  const renderFeedItem = (item: FeedListItem, isSelected: boolean) => {
    const prefix = isSelected ? '>' : ' ';
    const unreadMarker = item.isRead === false ? '● ' : '';
    const selectedStyle = isSelected ? { color: 'blue', bold: true } : {};

    return (
      <Text key={item.id} {...selectedStyle}>
        {prefix} {unreadMarker}
        {item.displayText}
        <Text color="gray"> ({item.badge})</Text>
      </Text>
    );
  };

  if (feeds.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="blue">
          フィード一覧
        </Text>
        <Box marginTop={1} justifyContent="center" alignItems="center" height={5}>
          <Text color="gray" italic>
            フィードが登録されていません
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">ヒント: `termfeed add [URL]` でフィードを追加できます</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        フィード一覧 ({feeds.length}件)
      </Text>
      <Box marginTop={1}>
        <SelectableList
          items={feedItems}
          selectedIndex={selectedIndex}
          renderItem={renderFeedItem}
        />
      </Box>
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          a:次のサイト s:前のサイト j/k:記事選択
        </Text>
      </Box>
    </Box>
  );
}
