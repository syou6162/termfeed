// サービス層の型定義

import type { Feed, Article } from './domain';
import type { FeedUpdateResult, AddFeedResult, CrawlResult, UpdateAllFeedsResult } from './dto';
import type { UpdateProgressCallback, UpdateCancelledResult } from './options';

// FeedServiceの型定義（実装クラスに基づく）
export type FeedService = {
  addFeed(url: string): Promise<AddFeedResult>;
  removeFeed(feedId: number): boolean;
  updateFeed(feedId: number): Promise<FeedUpdateResult>;
  updateAllFeeds(
    progressCallback?: UpdateProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<UpdateAllFeedsResult | UpdateCancelledResult>;
  markArticleAsRead(articleId: number): boolean;
  markArticleAsUnread(articleId: number): boolean;
  toggleArticleFavorite(articleId: number): boolean;
  markAllAsRead(feedId?: number): void;
  getUnreadCount(feedId?: number): number;
  getFeedList(): Feed[];
  getArticles(options?: {
    feed_id?: number;
    is_read?: boolean;
    is_favorite?: boolean;
    limit?: number;
    offset?: number;
  }): Article[];
  getFeedById(feedId: number): Feed | null;
  getArticleById(articleId: number): Article | null;
  getUnreadCountsForAllFeeds(): { [feedId: number]: number };
};

// ArticleServiceの型定義
export type ArticleService = {
  getArticles(options?: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Article[];
  getArticleById(articleId: number): Article | null;
  markAsRead(articleId: number): boolean;
  markAsUnread(articleId: number): boolean;
  toggleFavorite(articleId: number): boolean;
  getUnreadCount(feedId?: number): number;
  getTotalCount(feedId?: number): number;
};

// RSSCrawlerの型定義
export type RSSCrawler = {
  crawl(url: string): Promise<CrawlResult>;
};
