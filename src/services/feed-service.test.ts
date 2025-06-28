import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from '../models/database.js';
import { FeedModel } from '../models/feed.js';
import { ArticleModel } from '../models/article.js';
import { FeedService } from './feed-service.js';
import { RSSCrawler } from './rss-crawler.js';
import { DuplicateFeedError, FeedNotFoundError } from './errors.js';

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
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Test Article',
            url: 'https://example.com/article1',
            content: 'Test content',
            summary: 'Test summary',
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
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Valid Article',
            url: 'https://example.com/article1',
            content: 'Test content',
            summary: 'Test summary',
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
            summary: 'Test summary',
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
    it('フィードとその記事を正常に削除する', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });

      // 記事を作成
      articleModel.create({
        feed_id: feed.id!,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        summary: 'Test summary',
        author: 'Test Author',
        published_at: new Date(),
      });

      const result = feedService.removeFeed(feed.id!);

      expect(result).toBe(true);
      expect(feedModel.findById(feed.id!)).toBeNull();
      expect(articleModel.findAll({ feed_id: feed.id! })).toHaveLength(0);
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
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'New Title',
          description: 'New Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'New Article',
            url: 'https://example.com/new-article',
            content: 'New content',
            summary: 'New summary',
            author: 'New Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.updateFeed(feed.id!);

      expect(result.feedId).toBe(feed.id);
      expect(result.newArticlesCount).toBe(1);
      expect(result.updatedArticlesCount).toBe(0);

      // フィードが更新されていることを確認
      const updatedFeed = feedModel.findById(feed.id!);
      expect(updatedFeed?.title).toBe('New Title');
      expect(updatedFeed?.description).toBe('New Description');
    });

    it('既存記事がある場合に更新カウントを正しく返す', async () => {
      // フィードを作成
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });

      // 既存記事を作成
      articleModel.create({
        feed_id: feed.id!,
        title: 'Existing Article',
        url: 'https://example.com/existing-article',
        content: 'Existing content',
        summary: 'Existing summary',
        author: 'Existing Author',
        published_at: new Date(),
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Test Feed',
          description: 'Test Description',
          last_updated_at: new Date(),
        },
        articles: [
          {
            title: 'Existing Article Updated',
            url: 'https://example.com/existing-article', // 同じURL
            content: 'Updated content',
            summary: 'Updated summary',
            author: 'Updated Author',
            published_at: new Date(),
            is_read: false,
            is_favorite: false,
            thumbnail_url: undefined,
          },
        ],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const result = await feedService.updateFeed(feed.id!);

      expect(result.newArticlesCount).toBe(0);
      expect(result.updatedArticlesCount).toBe(1);
    });

    it('存在しないフィードIDでエラーを投げる', async () => {
      await expect(feedService.updateFeed(999)).rejects.toThrow(FeedNotFoundError);
    });
  });

  describe('updateAllFeeds', () => {
    it('全フィードを更新する', async () => {
      // 複数のフィードを作成
      const feed1 = feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
      });

      const feed2 = feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
      });

      const mockCrawlResult = {
        feed: {
          url: 'https://example.com/rss.xml',
          title: 'Updated Feed',
          description: 'Updated Description',
          last_updated_at: new Date(),
        },
        articles: [],
      };

      vi.mocked(mockCrawler.crawl).mockResolvedValue(mockCrawlResult);

      const results = await feedService.updateAllFeeds();

      expect(results).toHaveLength(2);
      expect(results[0].feedId).toBe(feed1.id);
      expect(results[1].feedId).toBe(feed2.id);
    });

    it('一部のフィード更新に失敗してもエラーにならない', async () => {
      // フィードを作成
      feedModel.create({
        url: 'https://example.com/rss1.xml',
        title: 'Feed 1',
        description: 'Description 1',
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
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

      expect(results).toHaveLength(1); // 成功した1つのみ
    });
  });

  describe('article operations', () => {
    let feedId: number;
    let articleId: number;

    beforeEach(() => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });
      feedId = feed.id!;

      const article = articleModel.create({
        feed_id: feedId,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        summary: 'Test summary',
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
        summary: 'Test summary 2',
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
      });

      feedModel.create({
        url: 'https://example.com/rss2.xml',
        title: 'Feed 2',
        description: 'Description 2',
      });

      const feeds = feedService.getFeedList();
      expect(feeds).toHaveLength(2);
    });

    it('記事一覧を取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });

      articleModel.create({
        feed_id: feed.id!,
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        content: 'Test content 1',
        summary: 'Test summary 1',
        author: 'Test Author 1',
        published_at: new Date(),
      });

      articleModel.create({
        feed_id: feed.id!,
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        content: 'Test content 2',
        summary: 'Test summary 2',
        author: 'Test Author 2',
        published_at: new Date(),
      });

      const articles = feedService.getArticles({ feed_id: feed.id! });
      expect(articles).toHaveLength(2);
    });

    it('IDでフィードを取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });

      const foundFeed = feedService.getFeedById(feed.id!);
      expect(foundFeed?.title).toBe('Test Feed');

      const notFound = feedService.getFeedById(999);
      expect(notFound).toBeNull();
    });

    it('IDで記事を取得する', () => {
      const feed = feedModel.create({
        url: 'https://example.com/rss.xml',
        title: 'Test Feed',
        description: 'Test Description',
      });

      const article = articleModel.create({
        feed_id: feed.id!,
        title: 'Test Article',
        url: 'https://example.com/article1',
        content: 'Test content',
        summary: 'Test summary',
        author: 'Test Author',
        published_at: new Date(),
      });

      const foundArticle = feedService.getArticleById(article.id!);
      expect(foundArticle?.title).toBe('Test Article');

      const notFound = feedService.getArticleById(999);
      expect(notFound).toBeNull();
    });
  });
});
