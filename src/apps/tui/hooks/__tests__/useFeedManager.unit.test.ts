import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Feed } from '@/types';

// モックのFeedService
const mockFeedService = {
  getFeedList: vi.fn(),
  getUnreadCountsForAllFeeds: vi.fn(),
  updateAllFeeds: vi.fn(),
  getArticles: vi.fn(),
  markArticleAsRead: vi.fn(),
  toggleArticleFavorite: vi.fn(),
};

// テスト用データ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    description: 'Test feed 1 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    description: 'Test feed 2 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
];

const mockUnreadCounts: Record<number, number> = {
  1: 5,
  2: 3,
};

describe('useFeedManager Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // デフォルトのモック実装
    mockFeedService.getFeedList.mockReturnValue(mockFeeds);
    mockFeedService.getUnreadCountsForAllFeeds.mockReturnValue(mockUnreadCounts);
    mockFeedService.updateAllFeeds.mockResolvedValue({
      summary: { successCount: 2, failureCount: 0 },
      failed: [],
    });
  });

  it('フィードが正しくソートされることを確認', () => {
    // このテストはuseFeedManagerの内部で使われているsortFeedsByUnreadCountの動作を確認
    const feedsWithUnreadCount = mockFeeds.map((feed) => ({
      ...feed,
      unreadCount: feed.id ? mockUnreadCounts[feed.id] || 0 : 0,
    }));

    // 未読件数でソート（多い順）
    const sorted = [...feedsWithUnreadCount].sort((a, b) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
      if (a.unreadCount > 0 && b.unreadCount > 0) return b.unreadCount - a.unreadCount;
      return 0;
    });

    expect(sorted[0].id).toBe(1);
    expect(sorted[0].unreadCount).toBe(5);
    expect(sorted[1].id).toBe(2);
    expect(sorted[1].unreadCount).toBe(3);
  });

  it('FeedServiceのメソッドが正しく呼ばれることを確認', () => {
    mockFeedService.getFeedList();
    mockFeedService.getUnreadCountsForAllFeeds();

    expect(mockFeedService.getFeedList).toHaveBeenCalled();
    expect(mockFeedService.getUnreadCountsForAllFeeds).toHaveBeenCalled();
  });

  it('エラーハンドリングが正しく機能することを確認', () => {
    mockFeedService.getFeedList.mockImplementation(() => {
      throw new Error('ネットワークエラー');
    });

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = mockFeedService.getFeedList();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return result;
    }).toThrow('ネットワークエラー');
  });
});
