import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { RSSCrawler } from './rss-crawler.js';
import type { Feed, Article, CreateFeedInput } from '../models/types.js';
import type { CrawlResult, FeedUpdateResult, AddFeedResult } from './types.js';

export type { FeedUpdateResult, AddFeedResult };

export class FeedService {
  private feedModel: FeedModel;
  private articleModel: ArticleModel;
  private crawler: RSSCrawler;

  constructor(feedModel: FeedModel, articleModel: ArticleModel, crawler?: RSSCrawler) {
    this.feedModel = feedModel;
    this.articleModel = articleModel;
    this.crawler = crawler || new RSSCrawler();
  }

  async addFeed(url: string): Promise<AddFeedResult> {
    const existingFeed = this.feedModel.findByUrl(url);
    if (existingFeed) {
      throw new Error(`Feed already exists: ${url}`);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(url);
    } catch (error) {
      throw new Error(
        `Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
    }

    const createFeedInput: CreateFeedInput = {
      url: crawlResult.feed.url,
      title: crawlResult.feed.title,
      description: crawlResult.feed.description,
    };

    const feed = this.feedModel.create(createFeedInput);
    if (!feed) {
      throw new Error('Failed to create feed');
    }

    let articlesCount = 0;
    for (const articleData of crawlResult.articles) {
      if (!articleData.url) continue;

      const existingArticle = this.articleModel.findByUrl(articleData.url);
      if (!existingArticle) {
        const created = this.articleModel.create({
          ...articleData,
          feed_id: feed.id!,
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
      throw new Error(`Feed not found: ${feedId}`);
    }

    this.articleModel.deleteByFeedId(feedId);
    return this.feedModel.delete(feedId);
  }

  async updateFeed(feedId: number): Promise<FeedUpdateResult> {
    const feed = this.feedModel.findById(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(feed.url);
    } catch (error) {
      throw new Error(
        `Failed to update feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error }
      );
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
        const updated = this.articleModel.update(existingArticle.id!, {});
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

  async updateAllFeeds(): Promise<FeedUpdateResult[]> {
    const feeds = this.feedModel.findAll();
    const results: FeedUpdateResult[] = [];

    for (const feed of feeds) {
      try {
        const result = await this.updateFeed(feed.id!);
        results.push(result);
      } catch (error) {
        console.error(
          `Failed to update feed ${feed.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return results;
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
      this.articleModel.markAsRead(article.id!);
    }
  }

  getUnreadCount(feedId?: number): number {
    return this.articleModel.countUnread(feedId);
  }

  getFeedList(): Feed[] {
    return this.feedModel.findAll();
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
}
