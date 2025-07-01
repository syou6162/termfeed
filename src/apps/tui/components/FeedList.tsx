import { Box, Text } from 'ink';
import { memo, useMemo } from 'react';
import type { FeedWithUnreadCount } from '../utils/feed-sorter.js';

type FeedListItem = {
  id: number;
  displayText: string;
  badge: string;
  rating: number;
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
    const ratingStars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);

    return (
      <Text key={item.id} {...selectedStyle}>
        {prefix} {unreadMarker}
        {item.displayText}
        <Text color="gray"> ({item.badge})</Text>
        <Text color="yellow"> {ratingStars}</Text>
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

  // 現在選択中のフィードのレーティングを取得
  const selectedFeed = feeds[selectedIndex];
  const selectedRating = selectedFeed?.rating ?? 0;

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="blue">
        フィード一覧 ({feeds.length}件)
      </Text>
      {selectedFeed && (
        <Text color="yellow" marginTop={1}>
          現在: レーティング {selectedRating} (★{selectedRating}☆{5 - selectedRating})
        </Text>
      )}
      <Box marginTop={1}>
        <Box flexDirection="column">
          {feedSections.map((section) => (
            <Box key={section.rating} flexDirection="column">
              <Text bold color="cyan" marginTop={1}>
                ── レーティング {section.rating} ({'★'.repeat(section.rating)}{'☆'.repeat(5 - section.rating)}) ──
              </Text>
              {section.items.map((item, index) => {
                const globalIndex = allItems.findIndex((globalItem) => globalItem.id === item.id);
                return renderFeedItem(item, globalIndex === selectedIndex);
              })}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
});
