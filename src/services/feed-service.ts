import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { RSSCrawler, type CrawlResult } from './rss-crawler.js';
import { DatabaseError } from '../models/errors.js';
import type { Feed, Article, CreateFeedInput, UpdateArticleInput } from '../models/types.js';

export type FeedUpdateResult = {
  feedId: number;
  newArticlesCount: number;
  updatedArticlesCount: number;
  totalArticlesCount: number;
};

export type AddFeedResult = {
  feed: Feed;
  articlesCount: number;
};

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
    const existingFeed = await this.feedModel.findByUrl(url);
    if (existingFeed) {
      throw new Error(`Feed already exists: ${url}`);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(url);
    } catch (error) {
      throw new Error(`Failed to fetch feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const createFeedInput: CreateFeedInput = {
      url: crawlResult.feed.url,
      title: crawlResult.feed.title,
      description: crawlResult.feed.description,
    };

    const feed = await this.feedModel.create(createFeedInput);
    if (!feed) {
      throw new Error('Failed to create feed');
    }

    let articlesCount = 0;
    for (const articleData of crawlResult.articles) {
      if (!articleData.url) continue;

      const existingArticle = await this.articleModel.findByUrl(articleData.url);
      if (!existingArticle) {
        const created = await this.articleModel.create({
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

  async removeFeed(feedId: number): Promise<boolean> {
    const feed = await this.feedModel.findById(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    await this.articleModel.deleteByFeedId(feedId);
    return await this.feedModel.delete(feedId);
  }

  async updateFeed(feedId: number): Promise<FeedUpdateResult> {
    const feed = await this.feedModel.findById(feedId);
    if (!feed) {
      throw new Error(`Feed not found: ${feedId}`);
    }

    let crawlResult: CrawlResult;
    try {
      crawlResult = await this.crawler.crawl(feed.url);
    } catch (error) {
      throw new Error(`Failed to update feed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    await this.feedModel.update(feedId, {
      title: crawlResult.feed.title,
      description: crawlResult.feed.description,
    });

    let newArticlesCount = 0;
    let updatedArticlesCount = 0;

    for (const articleData of crawlResult.articles) {
      if (!articleData.url) continue;

      const existingArticle = await this.articleModel.findByUrl(articleData.url);
      if (existingArticle) {
        const updated = await this.articleModel.update(existingArticle.id!, {
          title: articleData.title,
          content: articleData.content,
          summary: articleData.summary,
          author: articleData.author,
          published_at: articleData.published_at,
          thumbnail_url: articleData.thumbnail_url,
        });
        if (updated) {
          updatedArticlesCount++;
        }
      } else {
        const created = await this.articleModel.create({
          ...articleData,
          feed_id: feedId,
        });
        if (created) {
          newArticlesCount++;
        }
      }
    }

    await this.feedModel.updateLastUpdatedAt(feedId);

    const totalArticlesCount = await this.articleModel.countByFeedId(feedId);

    return {
      feedId,
      newArticlesCount,
      updatedArticlesCount,
      totalArticlesCount,
    };
  }

  async updateAllFeeds(): Promise<FeedUpdateResult[]> {
    const feeds = await this.feedModel.findAll();
    const results: FeedUpdateResult[] = [];

    for (const feed of feeds) {
      try {
        const result = await this.updateFeed(feed.id!);
        results.push(result);
      } catch (error) {
        console.error(`Failed to update feed ${feed.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  async markArticleAsRead(articleId: number): Promise<boolean> {
    return await this.articleModel.markAsRead(articleId);
  }

  async markArticleAsUnread(articleId: number): Promise<boolean> {
    return await this.articleModel.markAsUnread(articleId);
  }

  async toggleArticleFavorite(articleId: number): Promise<boolean> {
    return await this.articleModel.toggleFavorite(articleId);
  }

  async markAllAsRead(feedId?: number): Promise<void> {
    const articles = await this.articleModel.findAll({
      feedId,
      isRead: false,
    });

    for (const article of articles) {
      await this.articleModel.markAsRead(article.id!);
    }
  }

  async getUnreadCount(feedId?: number): Promise<number> {
    return await this.articleModel.countUnread(feedId);
  }

  async cleanupOldArticles(days: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const oldArticles = await this.articleModel.findAll({
      publishedBefore: cutoffDate,
      isRead: true,
      isFavorite: false,
    });

    let deletedCount = 0;
    for (const article of oldArticles) {
      const deleted = await this.articleModel.delete(article.id!);
      if (deleted) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async getFeedList(): Promise<Feed[]> {
    return await this.feedModel.findAll();
  }

  async getArticles(options: {
    feedId?: number;
    isRead?: boolean;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Article[]> {
    return await this.articleModel.findAll(options);
  }

  async getFeedById(feedId: number): Promise<Feed | null> {
    return await this.feedModel.findById(feedId);
  }

  async getArticleById(articleId: number): Promise<Article | null> {
    return await this.articleModel.findById(articleId);
  }
}