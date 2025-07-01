import { Box, Text } from 'ink';
import { memo, useMemo } from 'react';
import type { FeedWithUnreadCount } from '../utils/feed-sorter.js';

type FeedListItem = {
  id: number;
  displayText: string;
  badge: string;
  rating: number;
  unreadCount: number;
  isRead?: boolean;
  isFavorite?: boolean;
};

type FeedSection = {
  rating: number;
  items: FeedListItem[];
};

type FeedListProps = {
  feeds: FeedWithUnreadCount[];
  selectedIndex: number;
  onFeedSelect?: (feed: FeedWithUnreadCount) => void;
};

export const FeedList = memo(function FeedList({ feeds, selectedIndex }: FeedListProps) {
  const feedSections: FeedSection[] = useMemo(() => {
    const feedItems: FeedListItem[] = feeds.map((feed) => ({
      id: feed.id || 0,
      displayText: feed.title,
      badge: feed.unreadCount > 0 ? `${feed.unreadCount}件` : '0件',
      rating: feed.rating,
      unreadCount: feed.unreadCount,
      isRead: feed.unreadCount === 0,
    }));

    // レーティング別にグループ化
    const sections = new Map<number, FeedListItem[]>();
    feedItems.forEach((item) => {
      if (!sections.has(item.rating)) {
        sections.set(item.rating, []);
      }
      sections.get(item.rating)!.push(item);
    });

    // レーティングが高い順にソート
    return Array.from(sections.entries())
      .sort(([a], [b]) => b - a)
      .map(([rating, items]) => ({ rating, items }));
  }, [feeds]);

  const allItems: FeedListItem[] = useMemo(
    () => feedSections.flatMap((section) => section.items),
    [feedSections]
  );

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
      <Box flexDirection="column" paddingX={0} paddingY={1} width="100%" flexGrow={1}>
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

  const totalUnreadCount = feedSections.reduce(
    (total, section) =>
      total + section.items.reduce((sectionTotal, item) => sectionTotal + item.unreadCount, 0),
    0
  );

  return (
    <Box flexDirection="column" paddingX={0} paddingY={1} width="100%" flexGrow={1}>
      <Text bold color="blue">
        フィード一覧 ({totalUnreadCount}件)
      </Text>
      <Box marginTop={1} width="100%">
        <Box flexDirection="column" width="100%">
          {feedSections.map((section) => {
            // 現在選択中のフィードが属するセクションかどうかを判定
            const selectedFeed = feeds[selectedIndex];
            const isCurrentSection = selectedFeed && section.rating === selectedFeed.rating;

            return (
              <Box
                key={section.rating}
                marginTop={1}
                paddingX={0}
                paddingY={1}
                borderStyle="round"
                borderColor={isCurrentSection ? 'cyan' : 'gray'}
                flexDirection="column"
                width="100%"
              >
                <Box
                  flexDirection="row"
                  alignItems="center"
                  justifyContent="space-between"
                  marginBottom={isCurrentSection ? 1 : 0}
                  paddingX={1}
                >
                  <Box flexDirection="row" alignItems="center">
                    <Text bold color={isCurrentSection ? 'yellow' : 'gray'}>
                      {'★'.repeat(section.rating || 0)}
                      {section.rating === 0 ? '評価なし' : ''}
                    </Text>
                  </Box>
                  <Text color="gray" dimColor>
                    {section.items.reduce((total, item) => total + item.unreadCount, 0)}件
                  </Text>
                </Box>
                {/* 現在のセクションのみフィード一覧を表示 */}
                {isCurrentSection &&
                  section.items.map((item, _index) => {
                    const globalIndex = allItems.findIndex(
                      (globalItem) => globalItem.id === item.id
                    );
                    return (
                      <Box key={`${section.rating}-${item.id}`} paddingX={1}>
                        {renderFeedItem(item, globalIndex === selectedIndex)}
                      </Box>
                    );
                  })}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
});
