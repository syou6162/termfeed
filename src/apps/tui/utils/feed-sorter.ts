import type { Feed } from '@/types';

export type FeedWithUnreadCount = Feed & {
  unreadCount: number;
};

export function sortFeedsByUnreadCount(feeds: FeedWithUnreadCount[]): FeedWithUnreadCount[] {
  // フィードを未読件数でソート：未読あり → 未読なし
  return [...feeds].sort((a, b) => {
    // 未読件数が多い順、同じ場合は元の順序を維持
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    if (a.unreadCount > 0 && b.unreadCount > 0) return b.unreadCount - a.unreadCount;
    return 0; // 両方とも未読なしの場合は元の順序
  });
}
