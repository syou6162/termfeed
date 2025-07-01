import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { RSSCrawler } from './rss-crawler.js';
import type {
  Feed,
  Article,
  CreateFeedInput,
  CrawlResult,
  FeedUpdateResult,
  AddFeedResult,
  UpdateAllFeedsResult,
  FeedUpdateSuccess,
  FeedUpdateFailure,
  FeedService as IFeedService,
  UpdateProgressCallback,
  UpdateCancelledResult,
} from '@/types';
import {
  DuplicateFeedError,
  FeedNotFoundError,
  FeedManagementError,
  FeedUpdateError,
} from './errors.js';

export type { FeedUpdateResult, AddFeedResult };

export class FeedService implements IFeedService {
  private feedModel: FeedModel;
  private articleModel: ArticleModel;
  private crawler: RSSCrawler;

  constructor(feedModel: FeedModel, articleModel: ArticleModel, crawler?: RSSCrawler) {
    this.feedModel = feedModel;
    this.articleModel = articleModel;
    this.crawler = crawler || new RSSCrawler();
  }

  async addFeed(url: string, abortSignal?: AbortSignal): Promise<AddFeedResult> {
    const existingFeed = this.feedModel.findByUrl(url);
    if (existingFeed) {
      throw new DuplicateFeedError(`Feed already exists: ${url}`, url);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(url, abortSignal);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // エラーメッセージが既に "Failed to" で始まっている場合は重複を避ける
      const message = errorMessage.startsWith('Failed to')
        ? errorMessage
        : `Failed to fetch feed: ${errorMessage}`;
      throw new FeedManagementError(message, undefined, { cause: error });
    }

    const createFeedInput: CreateFeedInput = {
      url: crawlResult.feed.url,
      title: crawlResult.feed.title,
      description: crawlResult.feed.description,
      // rating: 0 は省略（デフォルト値を使用）
    };

    const feed = this.feedModel.create(createFeedInput);
    if (!feed) {
      throw new FeedManagementError('Failed to create feed');
    }

    let articlesCount = 0;
    for (const articleData of crawlResult.articles) {
      if (!articleData.url) continue;

      const existingArticle = this.articleModel.findByUrl(articleData.url);
      if (!existingArticle) {
        const created = this.articleModel.create({
          ...articleData,
          feed_id: feed.id,
        });
        if (created) {
          articlesCount++;
        }
      }
    }

    return { feed, articlesCount };
  }

  removeFeed(feedId: number): boolean {
    const feed = this.feedModel.findById(feedId);
    if (!feed) {
      throw new FeedNotFoundError(`Feed not found: ${feedId}`, feedId);
    }

    this.articleModel.deleteByFeedId(feedId);
    return this.feedModel.delete(feedId);
  }

  async updateFeed(feedId: number, abortSignal?: AbortSignal): Promise<FeedUpdateResult> {
    const feed = this.feedModel.findById(feedId);
    if (!feed) {
      throw new FeedNotFoundError(`Feed not found: ${feedId}`, feedId);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(feed.url, abortSignal);
    } catch (error) {
      throw new FeedUpdateError(`Failed to update feed ${feedId}: ${feed.url}`, feedId, feed.url, {
        cause: error,
      });
    }

    this.feedModel.update(feedId, {
      title: crawlResult.feed.title,
      description: crawlResult.feed.description,
    });

    let newArticlesCount = 0;
    let updatedArticlesCount = 0;

    for (const articleData of crawlResult.articles) {
      if (!articleData.url) continue;

      const existingArticle = this.articleModel.findByUrl(articleData.url);
      if (existingArticle) {
        const updated = this.articleModel.update(existingArticle.id, {});
        if (updated) {
          updatedArticlesCount++;
        }
      } else {
        const created = this.articleModel.create({
          ...articleData,
          feed_id: feedId,
        });
        if (created) {
          newArticlesCount++;
        }
      }
    }

    this.feedModel.updateLastUpdatedAt(feedId);

    const totalArticlesCount = this.articleModel.countByFeedId(feedId);

    return {
      feedId,
      newArticlesCount,
      updatedArticlesCount,
      totalArticlesCount,
    };
  }

  async updateAllFeeds(
    progressCallback?: UpdateProgressCallback,
    abortSignal?: AbortSignal
  ): Promise<UpdateAllFeedsResult | UpdateCancelledResult> {
    const feeds = this.feedModel.findAll();
    const successful: FeedUpdateSuccess[] = [];
    const failed: FeedUpdateFailure[] = [];

    for (let i = 0; i < feeds.length; i++) {
      const feed = feeds[i];

      // キャンセルチェック
      if (abortSignal?.aborted) {
        return {
          cancelled: true,
          processedFeeds: i,
          totalFeeds: feeds.length,
          successful,
          failed,
        };
      }

      // 進捗を通知
      if (progressCallback) {
        progressCallback({
          totalFeeds: feeds.length,
          currentIndex: i + 1,
          currentFeedTitle: feed.title || 'Unknown',
          currentFeedUrl: feed.url,
        });
      }

      try {
        const result = await this.updateFeed(feed.id, abortSignal);
        successful.push({
          status: 'success',
          feedId: feed.id,
          result,
        });
      } catch (error) {
        failed.push({
          status: 'failure',
          feedId: feed.id,
          feedUrl: feed.url,
          error: error instanceof Error ? error : new Error('Unknown error'),
        });
        console.error(
          `Failed to update feed ${feed.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      successful,
      failed,
      summary: {
        totalFeeds: feeds.length,
        successCount: successful.length,
        failureCount: failed.length,
      },
    };
  }

  markArticleAsRead(articleId: number): boolean {
    return this.articleModel.markAsRead(articleId);
  }

  markArticleAsUnread(articleId: number): boolean {
    return this.articleModel.markAsUnread(articleId);
  }

  toggleArticleFavorite(articleId: number): boolean {
    return this.articleModel.toggleFavorite(articleId);
  }

  markAllAsRead(feedId?: number): void {
    const articles = this.articleModel.findAll({
      feed_id: feedId,
      is_read: false,
    });

    for (const article of articles) {
      this.articleModel.markAsRead(article.id);
    }
  }

  getUnreadCount(feedId?: number): number {
    return this.articleModel.countUnread(feedId);
  }

  getFeedList(): Feed[] {
    return this.feedModel.findAll();
  }

  /**
   * 未読記事があるフィードのみを取得（レーティング・未読件数でソート済み）
   * @returns 未読記事があるフィードと未読件数の配列（レーティング優先、未読件数副次）
   */
  getUnreadFeeds(): Array<Feed & { unreadCount: number }> {
    const allFeeds = this.feedModel.findAll();
    const unreadCounts = this.articleModel.getUnreadCountsByFeedIds();

    // 未読記事があるフィードのみをフィルタリング
    const feedsWithUnread = allFeeds
      .map((feed) => ({
        ...feed,
        unreadCount: feed.id ? unreadCounts[feed.id] || 0 : 0,
      }))
      .filter((feed) => feed.unreadCount > 0)
      // レーティング優先、同じレーティングの場合は未読件数でソート
      .sort((a, b) => {
        if (a.rating !== b.rating) {
          return b.rating - a.rating; // レーティング降順
        }
        return b.unreadCount - a.unreadCount; // 未読件数降順
      });

    return feedsWithUnread;
  }

  getArticles(
    options: {
      feed_id?: number;
      is_read?: boolean;
      is_favorite?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Article[] {
    return this.articleModel.findAll(options);
  }

  getFeedById(feedId: number): Feed | null {
    return this.feedModel.findById(feedId);
  }

  getArticleById(articleId: number): Article | null {
    return this.articleModel.findById(articleId);
  }

  getUnreadCountsForAllFeeds(): { [feedId: number]: number } {
    return this.articleModel.getUnreadCountsByFeedIds();
  }

  setFeedRating(feedId: number, rating: number): boolean {
    const feed = this.feedModel.findById(feedId);
    if (!feed) {
      throw new FeedNotFoundError(`Feed not found: ${feedId}`, feedId);
    }

    return this.feedModel.setRating(feedId, rating);
  }
}
