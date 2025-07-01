import { describe, it, expect } from 'vitest';
import { sortFeedsByUnreadCount } from '../feed-sorter.js';
import type { FeedWithUnreadCount } from '../feed-sorter.js';

describe('feed-sorter', () => {
  describe('sortFeedsByUnreadCount', () => {
    const createFeed = (id: number, title: string, unreadCount: number): FeedWithUnreadCount => ({
      id,
      url: `https://example.com/feed${id}.rss`,
      title,
      description: `${title} description`,
      rating: 0,
      last_updated_at: new Date('2024-01-01'),
      created_at: new Date('2024-01-01'),
      unreadCount,
    });

    it('未読数が多い順にソートする', () => {
      const feeds = [
        createFeed(1, 'Feed 1', 5),
        createFeed(2, 'Feed 2', 10),
        createFeed(3, 'Feed 3', 3),
      ];

      const sorted = sortFeedsByUnreadCount(feeds);

      expect(sorted[0].title).toBe('Feed 2'); // 10件
      expect(sorted[1].title).toBe('Feed 1'); // 5件
      expect(sorted[2].title).toBe('Feed 3'); // 3件
    });

    it('未読ありのフィードを未読なしより上位に配置する', () => {
      const feeds = [
        createFeed(1, 'Feed 1', 0),
        createFeed(2, 'Feed 2', 1),
        createFeed(3, 'Feed 3', 0),
        createFeed(4, 'Feed 4', 5),
      ];

      const sorted = sortFeedsByUnreadCount(feeds);

      expect(sorted[0].title).toBe('Feed 4'); // 5件
      expect(sorted[1].title).toBe('Feed 2'); // 1件
      expect(sorted[2].title).toBe('Feed 1'); // 0件（元の順序維持）
      expect(sorted[3].title).toBe('Feed 3'); // 0件（元の順序維持）
    });

    it('未読数が同じ場合は元の順序を維持する', () => {
      const feeds = [
        createFeed(1, 'Feed 1', 5),
        createFeed(2, 'Feed 2', 5),
        createFeed(3, 'Feed 3', 5),
      ];

      const sorted = sortFeedsByUnreadCount(feeds);

      expect(sorted[0].title).toBe('Feed 1');
      expect(sorted[1].title).toBe('Feed 2');
      expect(sorted[2].title).toBe('Feed 3');
    });

    it('すべて未読なしの場合は元の順序を維持する', () => {
      const feeds = [
        createFeed(1, 'Feed 1', 0),
        createFeed(2, 'Feed 2', 0),
        createFeed(3, 'Feed 3', 0),
      ];

      const sorted = sortFeedsByUnreadCount(feeds);

      expect(sorted[0].title).toBe('Feed 1');
      expect(sorted[1].title).toBe('Feed 2');
      expect(sorted[2].title).toBe('Feed 3');
    });

    it('空配列を処理できる', () => {
      const feeds: FeedWithUnreadCount[] = [];
      const sorted = sortFeedsByUnreadCount(feeds);
      expect(sorted).toEqual([]);
    });

    it('元の配列を変更しない', () => {
      const feeds = [createFeed(1, 'Feed 1', 5), createFeed(2, 'Feed 2', 10)];
      const originalFeeds = [...feeds];

      sortFeedsByUnreadCount(feeds);

      expect(feeds).toEqual(originalFeeds);
    });

    it('複雑なケースを正しくソートする', () => {
      const feeds = [
        createFeed(1, 'Feed 1', 0),
        createFeed(2, 'Feed 2', 100),
        createFeed(3, 'Feed 3', 0),
        createFeed(4, 'Feed 4', 50),
        createFeed(5, 'Feed 5', 50),
        createFeed(6, 'Feed 6', 1),
        createFeed(7, 'Feed 7', 0),
      ];

      const sorted = sortFeedsByUnreadCount(feeds);

      expect(sorted.map((f) => f.title)).toEqual([
        'Feed 2', // 100件
        'Feed 4', // 50件（元の順序で先）
        'Feed 5', // 50件（元の順序で後）
        'Feed 6', // 1件
        'Feed 1', // 0件（元の順序で先）
        'Feed 3', // 0件
        'Feed 7', // 0件（元の順序で最後）
      ]);
    });
  });
});
