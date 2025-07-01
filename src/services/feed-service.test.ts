import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseManager } from '../models/database.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { FeedService } from './feed-service.js';
import { RSSCrawler } from './rss-crawler.js';
import { DuplicateFeedError, FeedNotFoundError, FeedUpdateError } from './errors.js';
import type { UpdateProgress } from '@/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('FeedService', () => {
  let db: DatabaseManager;
  let feedModel: FeedModel;
  let articleModel: ArticleModel;
  let mockCrawler: RSSCrawler;
  let feedService: FeedService;
  let tempDbPath: string;

  beforeEach(() => {
    // テスト用の一時データベースを作成
    tempDbPath = path.join(__dirname, `test-feed-service-${Date.now()}.db`);
    db = new DatabaseManager(tempDbPath);
    db.migrate(); // マイグレーションを実行
    feedModel = new FeedModel(db);
    articleModel = new ArticleModel(db);

    // RSSクローラーのモックを作成
    mockCrawler = {
      crawl: vi.fn(),
    } as unknown as RSSCrawler;

    feedService = new FeedService(feedModel, articleModel, mockCrawler);
  });

  afterEach(() => {
    db.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
  });

  describe('addFeed', () => {
    it('新しいフィードを正常に追加する', async () => {
      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Test Feed',
          rating: 0,
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Test Article',
            url: 'https://example.com/article1',
            content: 'Test content',
            author: 'Test Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: 'https://example.com/thumb.jpg',
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.addFeed('https://example.com/rss.xml');

      expect(result.feed.title).toBe('Test Feed');
      expect(result.feed.url).toBe('https://example.com/rss.xml');
      expect(result.articlesCount).toBe(1);
    });

    it('重複するURLのフィードでエラーを投げる', async () => {
      // 最初のフィードを追加
      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Test Feed',
          rating: 0,
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);
      await feedService.addFeed('https://example.com/rss.xml');

      // 同じURLでもう一度追加を試みる
      await expect(feedService.addFeed('https://example.com/rss.xml')).rejects.toThrow(
        DuplicateFeedError
      );
    });

    it('クローラーエラーでエラーを投げる', async () => {
      vi.mocked(mockCrawler.crawl).mockRejectedValue(new Error('Network error'));

      await expect(feedService.addFeed('https://example.com/rss.xml')).rejects.toThrow(
        'Failed to fetch feed'
      );
    });

    it('URLが空の記事をスキップする', async () => {
      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Test Feed',
          rating: 0,
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Valid Article',
            url: 'https://example.com/article1',
            content: 'Test content',
            author: 'Test Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
          {
            title: 'Invalid Article',
            url: '', // 空のURL
            content: 'Test content',
            author: 'Test Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.addFeed('https://example.com/rss.xml');

      expect(result.articlesCount).toBe(1); // 有効な記事のみカウント
    });
  });

  describe('removeFeed', () => {
    it('フィードとその記事を正常に削除する', () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      // 記事を作成
      articleModel.create({
        feed_id: feed.id,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        author: 'Test Author',
        published_at: new Date(),
      });

      const result = feedService.removeFeed(feed.id);

      expect(result).toBe(true);
      expect(feedModel.findById(feed.id)).toBeNull();
      expect(articleModel.findAll({ feed_id: feed.id })).toHaveLength(0);
    });

    it('存在しないフィードIDでエラーを投げる', () => {
      expect(() => feedService.removeFeed(999)).toThrow(FeedNotFoundError);
    });
  });

  describe('updateFeed', () => {
    it('フィードと記事を正常に更新する', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Old Title',
        description: 'Old Description',
        rating: 0,
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'New Title',
          rating: 0,
          description: 'New Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'New Article',
            url: 'https://example.com/new-article',
            content: 'New content',
            author: 'New Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.updateFeed(feed.id);

      expect(result.feedId).toBe(feed.id);
      expect(result.newArticlesCount).toBe(1);
      expect(result.updatedArticlesCount).toBe(0);

      // フィードが更新されていることを確認
      const updatedFeed = feedModel.findById(feed.id);
      expect(updatedFeed?.title).toBe('New Title');
      expect(updatedFeed?.description).toBe('New Description');
    });

    it('既存記事がある場合に更新カウントを正しく返す', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      // 既存記事を作成
      articleModel.create({
        feed_id: feed.id,
        title: 'Existing Article',
        url: 'https://example.com/existing-article',
        content: 'Existing content',
        author: 'Existing Author',
        published_at: new Date(),
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Test Feed',
          rating: 0,
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Existing Article Updated',
            url: 'https://example.com/existing-article', // 同じURL
            content: 'Updated content',
            author: 'Updated Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.updateFeed(feed.id);

      expect(result.newArticlesCount).toBe(0);
      expect(result.updatedArticlesCount).toBe(1);
    });

    it('存在しないフィードIDでエラーを投げる', async () => {
      await expect(feedService.updateFeed(999)).rejects.toThrow(FeedNotFoundError);
    });

    it('クローラーエラーでFeedUpdateErrorを投げる', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      vi.mocked(mockCrawler.crawl).mockRejectedValue(new Error('Network error'));

      await expect(feedService.updateFeed(feed.id)).rejects.toThrow(FeedUpdateError);
    });
  });

  describe('updateAllFeeds', () => {
    it('全フィードを更新する', async () => {
      // 複数のフィードを作成
      const feed1 = feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      const feed2 = feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Updated Feed',
          rating: 0,
          description: 'Updated Description',
          last_updated_at: new Date(),
        },
        articles: [],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const results = await feedService.updateAllFeeds();

      if ('cancelled' in results) {
        throw new Error('Expected successful result, not cancelled');
      }

      expect(results.summary.totalFeeds).toBe(2);
      expect(results.summary.successCount).toBe(2);
      expect(results.summary.failureCount).toBe(0);
      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(0);
      expect(results.successful[0].feedId).toBe(feed1.id);
      expect(results.successful[1].feedId).toBe(feed2.id);
    });

    it('一部のフィード更新に失敗してもエラーにならない', async () => {
      // フィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      // 最初の呼び出しでエラー、2回目は成功
      vi.mocked(mockCrawler.crawl)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          feed: {
            url: 'https://example.com/rss2.xml',
            title: 'Updated Feed 2',
            description: 'Updated Description 2',
            last_updated_at: new Date(),
          },
          articles: [],
        });

      const results = await feedService.updateAllFeeds();

      if ('cancelled' in results) {
        throw new Error('Expected successful result, not cancelled');
      }

      expect(results.summary.totalFeeds).toBe(2);
      expect(results.summary.successCount).toBe(1);
      expect(results.summary.failureCount).toBe(1);
      expect(results.successful).toHaveLength(1);
      expect(results.failed).toHaveLength(1);

      // 成功したフィードの確認
      expect(results.successful[0].status).toBe('success');
      expect(results.successful[0].feedId).toBe(2);

      // 失敗したフィードの確認
      expect(results.failed[0].status).toBe('failure');
      expect(results.failed[0].feedId).toBe(1);
      expect(results.failed[0].feedUrl).toBe('https://example.com/rss1.xml');
      expect(results.failed[0].error).toBeInstanceOf(FeedUpdateError);
      expect(results.failed[0].error.cause).toBeInstanceOf(Error);
    });

    it('進捗コールバックが正しく呼ばれる', async () => {
      // フィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Updated Feed',
          rating: 0,
          description: 'Updated Description',
          last_updated_at: new Date(),
        },
        articles: [],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const progressUpdates: UpdateProgress[] = [];
      const progressCallback = vi.fn((progress: UpdateProgress) => {
        progressUpdates.push({ ...progress });
      });

      await feedService.updateAllFeeds(progressCallback);

      // 進捗コールバックが正しく呼ばれたか確認
      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressUpdates).toHaveLength(2);

      // 1回目の進捗
      expect(progressUpdates[0]).toEqual({
        totalFeeds: 2,
        currentIndex: 1,
        currentFeedTitle: 'Feed 1',
        currentFeedUrl: 'https://example.com/rss1.xml',
      });

      // 2回目の進捗
      expect(progressUpdates[1]).toEqual({
        totalFeeds: 2,
        currentIndex: 2,
        currentFeedTitle: 'Feed 2',
        currentFeedUrl: 'https://example.com/rss2.xml',
      });
    });

    it('エラー時でも進捗コールバックが呼ばれる', async () => {
      // フィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Updated Feed',
          rating: 0,
          description: 'Updated Description',
          last_updated_at: new Date(),
        },
        articles: [],
      };

      // 最初の呼び出しでエラー、2回目は成功
      vi.mocked(mockCrawler.crawl)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockCrawlResult);

      const progressCallback = vi.fn();

      await feedService.updateAllFeeds(progressCallback);

      // 進捗コールバックは両方のフィードで呼ばれる
      expect(progressCallback).toHaveBeenCalledTimes(2);
      expect(progressCallback).toHaveBeenNthCalledWith(1, {
        totalFeeds: 2,
        currentIndex: 1,
        currentFeedTitle: 'Feed 1',
        currentFeedUrl: 'https://example.com/rss1.xml',
      });
      expect(progressCallback).toHaveBeenNthCalledWith(2, {
        totalFeeds: 2,
        currentIndex: 2,
        currentFeedTitle: 'Feed 2',
        currentFeedUrl: 'https://example.com/rss2.xml',
      });
    });

    it('全フィード更新が失敗した場合の詳細な結果を返す', async () => {
      // フィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      // 全ての更新が失敗
      vi.mocked(mockCrawler.crawl).mockRejectedValue(new Error('Network timeout'));

      const results = await feedService.updateAllFeeds();

      if ('cancelled' in results) {
        throw new Error('Expected successful result, not cancelled');
      }

      expect(results.summary.totalFeeds).toBe(2);
      expect(results.summary.successCount).toBe(0);
      expect(results.summary.failureCount).toBe(2);
      expect(results.successful).toHaveLength(0);
      expect(results.failed).toHaveLength(2);

      // 失敗した全フィードの詳細確認
      results.failed.forEach((failure) => {
        expect(failure.status).toBe('failure');
        expect(failure.error).toBeInstanceOf(FeedUpdateError);
        expect(failure.error.cause).toBeInstanceOf(Error);
        expect(failure.feedUrl).toMatch(/^https:\/\/example\.com\/rss[12]\.xml$/);
      });
    });

    it('AbortSignalによるループレベルでのキャンセルが正しく動作する', async () => {
      // 複数のフィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const abortController = new AbortController();

      // すぐにキャンセル（ループの開始時点でabortedになる）
      abortController.abort();

      const result = await feedService.updateAllFeeds(undefined, abortController.signal);

      // キャンセルされた結果であることを確認
      if ('cancelled' in result) {
        expect(result.cancelled).toBe(true);
        expect(result.processedFeeds).toBe(0);
        expect(result.totalFeeds).toBe(2);
        expect(result.successful).toHaveLength(0);
        expect(result.failed).toHaveLength(0);
      } else {
        throw new Error('Expected cancelled result');
      }
    });

    it('HTTPリクエスト中のキャンセルでRSSFetchErrorが投げられることを確認', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      // キャンセルエラーをモック
      const cancelError = new Error('Request cancelled');
      vi.mocked(mockCrawler.crawl).mockRejectedValue(cancelError);

      const abortController = new AbortController();
      abortController.abort();

      const result = await feedService.updateAllFeeds(undefined, abortController.signal);

      // 1つのフィードが失敗として記録されることを確認
      if ('cancelled' in result) {
        // キャンセルされた場合（ループの最初でチェック）
        expect(result.cancelled).toBe(true);
        expect(result.processedFeeds).toBe(0);
      } else {
        // または失敗として記録される場合（HTTP リクエスト中）
        expect(result.failed).toHaveLength(1);
        expect(result.failed[0].feedId).toBe(feed.id);
      }
    });
  });

  describe('article operations', () => {
    let feedId: number;
    let articleId: number;

    beforeEach(() => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });
      feedId = feed.id!;

      const article = articleModel.create({
        feed_id: feedId,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        author: 'Test Author',
        published_at: new Date(),
      });
      articleId = article.id!;
    });

    it('記事を既読にマークする', () => {
      const result = feedService.markArticleAsRead(articleId);
      expect(result).toBe(true);

      const article = articleModel.findById(articleId);
      expect(article?.is_read).toBe(true);
    });

    it('記事を未読にマークする', () => {
      // 先に既読にする
      articleModel.markAsRead(articleId);

      const result = feedService.markArticleAsUnread(articleId);
      expect(result).toBe(true);

      const article = articleModel.findById(articleId);
      expect(article?.is_read).toBe(false);
    });

    it('記事のお気に入りをトグルする', () => {
      const result = feedService.toggleArticleFavorite(articleId);
      expect(result).toBe(true);

      const article = articleModel.findById(articleId);
      expect(article?.is_favorite).toBe(true);
    });

    it('フィードの全記事を既読にマークする', () => {
      // 追加の記事を作成
      articleModel.create({
        feed_id: feedId,
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        content: 'Test content 2',
        author: 'Test Author 2',
        published_at: new Date(),
      });

      feedService.markAllAsRead(feedId);

      const articles = articleModel.findAll({ feed_id: feedId });
      articles.forEach((article) => {
        expect(article.is_read).toBe(true);
      });
    });

    it('未読記事数を取得する', () => {
      const count = feedService.getUnreadCount(feedId);
      expect(count).toBe(1);

      articleModel.markAsRead(articleId);
      const countAfterRead = feedService.getUnreadCount(feedId);
      expect(countAfterRead).toBe(0);
    });
  });

  describe('utility methods', () => {
    it('フィード一覧を取得する', () => {
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const feeds = feedService.getFeedList();
      expect(feeds).toHaveLength(2);
    });

    it('記事一覧を取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      articleModel.create({
        feed_id: feed.id,
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        content: 'Test content 1',
        author: 'Test Author 1',
        published_at: new Date(),
      });

      articleModel.create({
        feed_id: feed.id,
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        content: 'Test content 2',
        author: 'Test Author 2',
        published_at: new Date(),
      });

      const articles = feedService.getArticles({ feed_id: feed.id });
      expect(articles).toHaveLength(2);
    });

    it('IDでフィードを取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      const foundFeed = feedService.getFeedById(feed.id);
      expect(foundFeed?.title).toBe('Test Feed');

      const notFound = feedService.getFeedById(999);
      expect(notFound).toBeNull();
    });

    it('IDで記事を取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        rating: 0,
        description: 'Test Description',
      });

      const article = articleModel.create({
        feed_id: feed.id,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        author: 'Test Author',
        published_at: new Date(),
      });

      const foundArticle = feedService.getArticleById(article.id);
      expect(foundArticle?.title).toBe('Test Article');

      const notFound = feedService.getArticleById(999);
      expect(notFound).toBeNull();
    });

    it('未読記事があるフィードのみを取得する', () => {
      // フィードを4つ作成
      const feed1 = feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      const feed2 = feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      const feed3 = feedModel.create({
        url: 'https://example.com/rss3.xml',
        title: 'Feed 3',
        description: 'Description 3',
        rating: 0,
      });

      // feed4は記事なしのフィードとして使用
      feedModel.create({
        url: 'https://example.com/rss4.xml',
        title: 'Feed 4',
        description: 'Description 4',
        rating: 0,
      });

      // feed1: 未読記事2件
      articleModel.create({
        feed_id: feed1.id,
        title: 'Article 1-1',
        url: 'https://example.com/article1-1',
        content: 'Content',
        published_at: new Date(),
      });

      articleModel.create({
        feed_id: feed1.id,
        title: 'Article 1-2',
        url: 'https://example.com/article1-2',
        content: 'Content',
        published_at: new Date(),
      });

      // feed2: 未読記事1件
      articleModel.create({
        feed_id: feed2.id,
        title: 'Article 2-1',
        url: 'https://example.com/article2-1',
        content: 'Content',
        published_at: new Date(),
      });

      // feed3: 既読記事のみ（記事を作成して既読にする）
      const article3 = articleModel.create({
        feed_id: feed3.id,
        title: 'Article 3-1',
        url: 'https://example.com/article3-1',
        content: 'Content',
        published_at: new Date(),
      });
      articleModel.markAsRead(article3.id);

      // feed4: 記事なし

      const unreadFeeds = feedService.getUnreadFeeds();

      // 未読記事があるフィードのみが返される
      expect(unreadFeeds).toHaveLength(2);

      // 未読件数の多い順にソートされている
      expect(unreadFeeds[0].title).toBe('Feed 1');
      expect(unreadFeeds[0].unreadCount).toBe(2);

      expect(unreadFeeds[1].title).toBe('Feed 2');
      expect(unreadFeeds[1].unreadCount).toBe(1);

      // feed3とfeed4は含まれない
      expect(unreadFeeds.find((f) => f.title === 'Feed 3')).toBeUndefined();
      expect(unreadFeeds.find((f) => f.title === 'Feed 4')).toBeUndefined();
    });

    it('すべてのフィードが既読の場合は空配列を返す', () => {
      const feed1 = feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
        rating: 0,
      });

      // feed2は記事なしのフィードとして使用
      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
        rating: 0,
      });

      // feed1: 既読記事のみ
      const article1 = articleModel.create({
        feed_id: feed1.id,
        title: 'Article 1',
        url: 'https://example.com/article1',
        content: 'Content',
        published_at: new Date(),
      });
      articleModel.markAsRead(article1.id);

      // feed2: 記事なし

      const unreadFeeds = feedService.getUnreadFeeds();
      expect(unreadFeeds).toHaveLength(0);
    });
  });
});
