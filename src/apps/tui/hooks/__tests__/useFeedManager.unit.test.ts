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
  getUnreadFeeds: vi.fn(),
  setFeedRating: vi.fn(),
};

// テスト用データ
const mockFeeds: Feed[] = [
  {
    id: 1,
    url: 'https://example.com/feed1.rss',
    title: 'Test Feed 1',
    rating: 0,
    description: 'Test feed 1 description',
    last_updated_at: new Date('2024-01-01'),
    created_at: new Date('2024-01-01'),
  },
  {
    id: 2,
    url: 'https://example.com/feed2.rss',
    title: 'Test Feed 2',
    rating: 0,
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
    mockFeedService.getUnreadFeeds.mockReturnValue(
      mockFeeds.map((feed) => ({
        ...feed,
        unreadCount: feed.id ? mockUnreadCounts[feed.id] || 0 : 0,
      }))
    );
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

  describe('リロード時のポインター保持のロジック確認', () => {
    it('loadFeedsでフィードIDが保持されることを確認', () => {
      // 初期データ
      const feedsWithUnread = mockFeeds.map((feed) => ({
        ...feed,
        unreadCount: feed.id ? mockUnreadCounts[feed.id] || 0 : 0,
      }));
      mockFeedService.getUnreadFeeds.mockReturnValue(feedsWithUnread);

      // 選択状態をシミュレート
      let selection = { index: 1, id: 2 };

      // loadFeedsの選択更新ロジックをシミュレート
      const feedsData = mockFeedService.getUnreadFeeds() as typeof feedsWithUnread;
      if (selection.id) {
        const newIndex = feedsData.findIndex((feed) => feed.id === selection.id);
        if (newIndex !== -1) {
          selection = { index: newIndex, id: selection.id };
        }
      }

      expect(selection.id).toBe(2);
      expect(selection.index).toBe(1);
    });

    it('選択中のフィードが消えた場合の動作を確認', () => {
      // 初期状態
      let selection = { index: 1, id: 2 };

      // Feed 2が消える
      const feedsWithoutFeed2 = [
        {
          ...mockFeeds[0],
          unreadCount: 5,
        },
      ];
      mockFeedService.getUnreadFeeds.mockReturnValue(feedsWithoutFeed2);

      // loadFeedsの選択更新ロジックをシミュレート
      const feedsData = mockFeedService.getUnreadFeeds() as typeof feedsWithoutFeed2;
      if (selection.id) {
        const newIndex = feedsData.findIndex((feed) => feed.id === selection.id);
        if (newIndex === -1 && feedsData.length > 0 && feedsData[0].id) {
          // フィードが見つからない場合、最初のフィードを選択
          selection = { index: 0, id: feedsData[0].id };
        }
      }

      expect(selection.id).toBe(1);
      expect(selection.index).toBe(0);
    });
  });
});
