import { Feed, CreateFeedInput } from '../../models/types';
import { FeedService } from '../interfaces';

export class MockFeedService implements FeedService {
  private feeds: Feed[] = [
    {
      id: 1,
      url: 'https://example.com/feed1.xml',
      title: 'Example Feed 1',
      description: 'A sample RSS feed for testing',
      last_updated_at: new Date(),
      created_at: new Date(),
    },
    {
      id: 2,
      url: 'https://example.com/feed2.xml',
      title: 'Example Feed 2',
      description: 'Another sample RSS feed',
      last_updated_at: new Date(),
      created_at: new Date(),
    },
    {
      id: 3,
      url: 'https://example.com/feed3.xml',
      title: 'Example Feed 3',
      last_updated_at: new Date(),
      created_at: new Date(),
    },
  ];

  private nextId = 4;

  async addFeed(input: CreateFeedInput): Promise<Feed> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));

    const newFeed: Feed = {
      id: this.nextId++,
      ...input,
      last_updated_at: new Date(),
      created_at: new Date(),
    };
    this.feeds.push(newFeed);
    return newFeed;
  }

  async getAllFeeds(): Promise<Feed[]> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    return [...this.feeds];
  }

  async removeFeed(feedId: number): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const index = this.feeds.findIndex((feed) => feed.id === feedId);
    if (index === -1) {
      return false;
    }
    this.feeds.splice(index, 1);
    return true;
  }

  async updateFeed(feedId: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 5));
    const feed = this.feeds.find((f) => f.id === feedId);
    if (feed) {
      feed.last_updated_at = new Date();
    }
  }

  async updateAllFeeds(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    for (const feed of this.feeds) {
      feed.last_updated_at = new Date();
    }
  }

  async validateFeedUrl(url: string): Promise<{ title: string; description?: string }> {
    // Mock validation - 実際の実装ではRSSフィードを取得してパース
    await new Promise((resolve) => setTimeout(resolve, 5));
    const urlObj = new globalThis.URL(url);
    return {
      title: `Feed from ${urlObj.hostname}`,
      description: `RSS feed from ${url}`,
    };
  }
}
