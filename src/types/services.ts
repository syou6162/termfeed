// サービス層の型定義

import type { Feed, Article } from './domain';
import type { CrawlResult } from './dto';

export type FeedService = {
  addFeed(input: import('./domain').CreateFeedInput): Promise<Feed>;
  getAllFeeds(): Promise<Feed[]>;
  removeFeed(feedId: number): Promise<boolean>;
  updateFeed(feedId: number): Promise<void>;
  updateAllFeeds(): Promise<void>;
  validateFeedUrl(url: string): Promise<{ title: string; description?: string }>;
};

export type ArticleService = {
  getArticles(options: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Article[]>;
  markAsRead(articleId: number): Promise<boolean>;
  markAsUnread(articleId: number): Promise<boolean>;
  toggleFavorite(articleId: number): Promise<boolean>;
  getUnreadCount(feedId?: number): Promise<number>;
  getTotalCount(feedId?: number): Promise<number>;
};

export type RSSCrawler = {
  crawl(url: string): Promise<CrawlResult>;
};
