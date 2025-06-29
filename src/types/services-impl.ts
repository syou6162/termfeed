// 実装クラスの型定義（実際の実装に基づく）

import type { Feed, Article } from './domain';
import type { FeedUpdateResult, AddFeedResult } from './dto';
import type { UpdateAllFeedsResult } from './options';

// FeedServiceの実装クラスの型定義
export type FeedServiceImpl = {
  addFeed(url: string): Promise<AddFeedResult>;
  removeFeed(feedId: number): boolean;
  updateFeed(feedId: number): Promise<FeedUpdateResult>;
  updateAllFeeds(): Promise<UpdateAllFeedsResult>;
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
