import type {
  Feed,
  FeedService,
  AddFeedResult,
  FeedUpdateResult,
  UpdateAllFeedsResult,
} from '@/types';

export class MockFeedService implements FeedService {
  private feeds: Feed[] = [
    {
      id: 1,
      url: 'https://example.com/feed1.xml',
      title: 'Example Feed 1',
      description: 'A sample RSS feed for testing',
      rating: 0,
      last_updated_at: new Date(),
      created_at: new Date(),
    },
    {
      id: 2,
      url: 'https://example.com/feed2.xml',
      title: 'Example Feed 2',
      description: 'Another sample RSS feed',
      rating: 0,
      last_updated_at: new Date(),
      created_at: new Date(),
    },
    {
      id: 3,
      url: 'https://example.com/feed3.xml',
      title: 'Example Feed 3',
      rating: 0,
      last_updated_at: new Date(),
      created_at: new Date(),
    },
  ];

  private nextId = 4;

  async addFeed(url: string): Promise<AddFeedResult> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    const newFeed: Feed = {
      id: this.nextId++,
      url,
      title: `Feed ${this.nextId}`,
      description: `Description for ${url}`,
      rating: 0,
      last_updated_at: new Date(),
      created_at: new Date(),
    };
    this.feeds.push(newFeed);
    return { feed: newFeed, articlesCount: 5 };
  }

  removeFeed(feedId: number): boolean {
    const index = this.feeds.findIndex((feed) => feed.id === feedId);
    if (index === -1) {
      return false;
    }
    this.feeds.splice(index, 1);
    return true;
  }

  async updateFeed(feedId: number): Promise<FeedUpdateResult> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const feed = this.feeds.find((f) => f.id === feedId);
    if (!feed) {
      throw new Error(`Feed ${feedId} not found`);
    }
    feed.last_updated_at = new Date();
    return {
      feedId,
      newArticlesCount: 3,
      updatedArticlesCount: 2,
      totalArticlesCount: 10,
    };
  }

  async updateAllFeeds(): Promise<UpdateAllFeedsResult> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return {
      successful: this.feeds.map((feed) => ({
        status: 'success' as const,
        feedId: feed.id,
        result: {
          feedId: feed.id,
          newArticlesCount: 3,
          updatedArticlesCount: 2,
          totalArticlesCount: 10,
        },
      })),
      failed: [],
      summary: {
        totalFeeds: this.feeds.length,
        successCount: this.feeds.length,
        failureCount: 0,
      },
    };
  }

  markArticleAsRead(_articleId: number): boolean {
    return true;
  }

  markArticleAsUnread(_articleId: number): boolean {
    return true;
  }

  toggleArticleFavorite(_articleId: number): boolean {
    return true;
  }

  markAllAsRead(_feedId?: number): void {
    // Mock implementation
  }

  getUnreadCount(_feedId?: number): number {
    return 5;
  }

  getFeedList(): Feed[] {
    return [...this.feeds];
  }

  getFeedListByRating(): Feed[] {
    return [...this.feeds].sort((a, b) => {
      if (a.rating !== b.rating) {
        return b.rating - a.rating; // レーティング降順
      }
      return a.id - b.id; // 同じレーティングの場合はID昇順
    });
  }

  getArticles(_options?: {
    feed_id?: number;
    is_read?: boolean;
    is_favorite?: boolean;
    limit?: number;
    offset?: number;
  }): import('@/types').Article[] {
    return [];
  }

  getFeedById(feedId: number): Feed | null {
    return this.feeds.find((f) => f.id === feedId) || null;
  }

  getArticleById(_articleId: number): import('@/types').Article | null {
    return null;
  }

  getUnreadCountsForAllFeeds(): { [feedId: number]: number } {
    const counts: { [feedId: number]: number } = {};
    this.feeds.forEach((feed) => {
      counts[feed.id] = 5;
    });
    return counts;
  }

  getUnreadFeeds(): Array<Feed & { unreadCount: number }> {
    // モック実装: 全フィードに未読件数5を付けてソートして返す
    return this.feeds
      .map((feed) => ({ ...feed, unreadCount: 5 }))
      .sort((a, b) => b.unreadCount - a.unreadCount);
  }

  async validateFeedUrl(url: string): Promise<{ title: string; description?: string }> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return {
      title: `Feed from ${url}`,
      description: `Description for ${url}`,
    };
  }

  async getAllFeeds(): Promise<Feed[]> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return [...this.feeds];
  }

  setFeedRating(feedId: number, rating: number): boolean {
    const feed = this.feeds.find((f) => f.id === feedId);
    if (!feed) {
      return false;
    }
    if (rating < 0 || rating > 5) {
      throw new Error('Rating must be between 0 and 5');
    }
    feed.rating = rating;
    return true;
  }
}
