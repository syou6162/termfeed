import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './database.js';
import { ArticleModel, CreateArticleInput } from './article.js';
import { FeedModel } from './feed.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('ArticleModel', () => {
  let db: DatabaseManager;
  let articleModel: ArticleModel;
  let feedModel: FeedModel;
  let testFeedId: number;
  const testDbPath = path.join(__dirname, 'test-article.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    articleModel = new ArticleModel(db);
    feedModel = new FeedModel(db);

    // テスト用のフィードを作成
    const feed = feedModel.create({
      url: 'https://example.com/test-feed.xml',
      title: 'Test Feed',
      rating: 0,
    });
    testFeedId = feed.id!;
  });

  afterEach(() => {
    // テスト用データベースをクリーンアップ
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // WALファイルも削除
    const walPath = `${testDbPath}-wal`;
    const shmPath = `${testDbPath}-shm`;
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
    }
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
    }
  });

  describe('create', () => {
    it('新しい記事を作成できる', () => {
      const articleInput: CreateArticleInput = {
        feed_id: testFeedId,
        title: 'Test Article',
        url: 'https://example.com/article/1',
        content: 'This is the content',
        author: 'Test Author',
        published_at: new Date('2024-01-01'),
        thumbnail_url: 'https://example.com/thumbnail.jpg',
      };

      const article = articleModel.create(articleInput);

      expect(article.id).toBeDefined();
      expect(article.feed_id).toBe(testFeedId);
      expect(article.title).toBe(articleInput.title);
      expect(article.url).toBe(articleInput.url);
      expect(article.content).toBe(articleInput.content);
      expect(article.author).toBe(articleInput.author);
      expect(article.published_at).toEqual(articleInput.published_at);
      expect(article.thumbnail_url).toBe(articleInput.thumbnail_url);
      expect(article.is_read).toBe(false);
      expect(article.created_at).toBeInstanceOf(Date);
      expect(article.updated_at).toBeInstanceOf(Date);
    });

    it('オプショナルフィールドなしで記事を作成できる', () => {
      const articleInput: CreateArticleInput = {
        feed_id: testFeedId,
        title: 'Minimal Article',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      };

      const article = articleModel.create(articleInput);

      expect(article.id).toBeDefined();
      expect(article.feed_id).toBe(testFeedId);
      expect(article.title).toBe(articleInput.title);
      expect(article.url).toBe(articleInput.url);
      expect(article.content).toBeUndefined();
      expect(article.author).toBeUndefined();
      expect(article.thumbnail_url).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('IDで記事を取得できる', () => {
      const articleInput: CreateArticleInput = {
        feed_id: testFeedId,
        title: 'Find By ID Test',
        url: 'https://example.com/article/3',
        published_at: new Date('2024-01-03'),
      };

      const created = articleModel.create(articleInput);
      const found = articleModel.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.title).toBe(created.title);
      expect(found!.published_at).toEqual(created.published_at);
      expect(found!.is_read).toBe(false);
    });

    it('存在しないIDの場合はnullを返す', () => {
      const found = articleModel.findById(999);
      expect(found).toBeNull();
    });
  });

  describe('findByUrl', () => {
    it('URLで記事を取得できる', () => {
      const articleInput: CreateArticleInput = {
        feed_id: testFeedId,
        title: 'Find By URL Test',
        url: 'https://example.com/unique-article',
        published_at: new Date('2024-01-04'),
      };

      articleModel.create(articleInput);
      const found = articleModel.findByUrl(articleInput.url);

      expect(found).not.toBeNull();
      expect(found!.url).toBe(articleInput.url);
      expect(found!.title).toBe(articleInput.title);
    });

    it('存在しないURLの場合はnullを返す', () => {
      const found = articleModel.findByUrl('https://nonexistent.com/article');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべての記事を取得できる', () => {
      const articles: CreateArticleInput[] = [
        {
          feed_id: testFeedId,
          title: 'Article 1',
          url: 'https://example.com/art1',
          published_at: new Date('2024-01-01'),
        },
        {
          feed_id: testFeedId,
          title: 'Article 2',
          url: 'https://example.com/art2',
          published_at: new Date('2024-01-02'),
        },
        {
          feed_id: testFeedId,
          title: 'Article 3',
          url: 'https://example.com/art3',
          published_at: new Date('2024-01-03'),
        },
      ];

      for (const article of articles) {
        articleModel.create(article);
      }

      const allArticles = articleModel.findAll();
      expect(allArticles).toHaveLength(3);
      // 公開日時の降順でソートされているか確認
      expect(allArticles[0].title).toBe('Article 3');
      expect(allArticles[1].title).toBe('Article 2');
      expect(allArticles[2].title).toBe('Article 1');
    });

    it('フィードIDでフィルタできる', () => {
      // 別のフィードを作成
      const anotherFeed = feedModel.create({
        url: 'https://example.com/another-feed.xml',
        title: 'Another Feed',
        rating: 0,
      });

      articleModel.create({
        feed_id: testFeedId,
        title: 'Feed 1 Article',
        url: 'https://example.com/feed1-art',
        published_at: new Date(),
      });

      articleModel.create({
        feed_id: anotherFeed.id,
        title: 'Feed 2 Article',
        url: 'https://example.com/feed2-art',
        published_at: new Date(),
      });

      const filtered = articleModel.findAll({ feed_id: testFeedId });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('Feed 1 Article');
    });

    it('既読状態でフィルタできる', () => {
      const article1 = articleModel.create({
        feed_id: testFeedId,
        title: 'Read Article',
        url: 'https://example.com/read-art',
        published_at: new Date(),
      });

      articleModel.create({
        feed_id: testFeedId,
        title: 'Unread Article',
        url: 'https://example.com/unread-art',
        published_at: new Date(),
      });

      // 1つの記事を既読にする
      articleModel.markAsRead(article1.id);

      const readArticles = articleModel.findAll({ is_read: true });
      expect(readArticles).toHaveLength(1);
      expect(readArticles[0].title).toBe('Read Article');

      const unreadArticles = articleModel.findAll({ is_read: false });
      expect(unreadArticles).toHaveLength(1);
      expect(unreadArticles[0].title).toBe('Unread Article');
    });

    it('ページネーションが機能する', () => {
      // 5つの記事を作成
      for (let i = 1; i <= 5; i++) {
        articleModel.create({
          feed_id: testFeedId,
          title: `Article ${i}`,
          url: `https://example.com/art${i}`,
          published_at: new Date(`2024-01-0${i}`),
        });
      }

      const page1 = articleModel.findAll({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe('Article 5');
      expect(page1[1].title).toBe('Article 4');

      const page2 = articleModel.findAll({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe('Article 3');
      expect(page2[1].title).toBe('Article 2');
    });
  });

  describe('update', () => {
    it('記事の既読状態を更新できる', () => {
      const article = articleModel.create({
        feed_id: testFeedId,
        title: 'Update Test',
        url: 'https://example.com/update-test',
        published_at: new Date(),
      });

      const updated = articleModel.update(article.id, { is_read: true });

      expect(updated).not.toBeNull();
      expect(updated!.is_read).toBe(true);
    });

    it('存在しないIDの場合はnullを返す', () => {
      const updated = articleModel.update(999, { is_read: true });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('記事を削除できる', () => {
      const article = articleModel.create({
        feed_id: testFeedId,
        title: 'To Be Deleted',
        url: 'https://example.com/delete-test',
        published_at: new Date(),
      });

      const deleted = articleModel.delete(article.id);
      expect(deleted).toBe(true);

      const found = articleModel.findById(article.id);
      expect(found).toBeNull();
    });

    it('存在しないIDの場合はfalseを返す', () => {
      const deleted = articleModel.delete(999);
      expect(deleted).toBe(false);
    });
  });

  describe('deleteByFeedId', () => {
    it('フィードIDに関連する全記事を削除できる', () => {
      // 3つの記事を作成
      for (let i = 1; i <= 3; i++) {
        articleModel.create({
          feed_id: testFeedId,
          title: `Article ${i}`,
          url: `https://example.com/art${i}`,
          published_at: new Date(),
        });
      }

      const deletedCount = articleModel.deleteByFeedId(testFeedId);
      expect(deletedCount).toBe(3);

      const remaining = articleModel.findAll({ feed_id: testFeedId });
      expect(remaining).toHaveLength(0);
    });
  });

  describe('markAsRead/markAsUnread', () => {
    it('記事を既読にできる', () => {
      const article = articleModel.create({
        feed_id: testFeedId,
        title: 'Read Test',
        url: 'https://example.com/read-test',
        published_at: new Date(),
      });

      const success = articleModel.markAsRead(article.id);
      expect(success).toBe(true);

      const updated = articleModel.findById(article.id);
      expect(updated!.is_read).toBe(true);
    });

    it('記事を未読にできる', () => {
      const article = articleModel.create({
        feed_id: testFeedId,
        title: 'Unread Test',
        url: 'https://example.com/unread-test',
        published_at: new Date(),
      });

      // まず既読にする
      articleModel.markAsRead(article.id);

      // 未読に戻す
      const success = articleModel.markAsUnread(article.id);
      expect(success).toBe(true);

      const updated = articleModel.findById(article.id);
      expect(updated!.is_read).toBe(false);
    });
  });

  describe('countByFeedId', () => {
    it('フィードIDごとの記事数をカウントできる', () => {
      // 3つの記事を作成
      for (let i = 1; i <= 3; i++) {
        articleModel.create({
          feed_id: testFeedId,
          title: `Article ${i}`,
          url: `https://example.com/art${i}`,
          published_at: new Date(),
        });
      }

      const count = articleModel.countByFeedId(testFeedId);
      expect(count).toBe(3);
    });
  });

  describe('countUnread', () => {
    it('未読記事数をカウントできる', () => {
      // 3つの記事を作成
      const articles = [];
      for (let i = 1; i <= 3; i++) {
        const article = articleModel.create({
          feed_id: testFeedId,
          title: `Article ${i}`,
          url: `https://example.com/art${i}`,
          published_at: new Date(),
        });
        articles.push(article);
      }

      // 1つを既読にする
      articleModel.markAsRead(articles[0].id);

      const unreadCount = articleModel.countUnread();
      expect(unreadCount).toBe(2);
    });

    it('フィードIDを指定して未読記事数をカウントできる', () => {
      // 別のフィードを作成
      const anotherFeed = feedModel.create({
        url: 'https://example.com/another-feed.xml',
        title: 'Another Feed',
        rating: 0,
      });

      // 各フィードに2つずつ記事を作成
      for (let i = 1; i <= 2; i++) {
        articleModel.create({
          feed_id: testFeedId,
          title: `Feed1 Article ${i}`,
          url: `https://example.com/f1-art${i}`,
          published_at: new Date(),
        });
        articleModel.create({
          feed_id: anotherFeed.id,
          title: `Feed2 Article ${i}`,
          url: `https://example.com/f2-art${i}`,
          published_at: new Date(),
        });
      }

      const feed1UnreadCount = articleModel.countUnread(testFeedId);
      expect(feed1UnreadCount).toBe(2);
    });
  });

  describe('findAllWithPinStatus', () => {
    it('ピン状態を含めて記事を取得できる', async () => {
      // 記事を3つ作成
      const article1 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 1',
        url: 'https://example.com/article/1',
        published_at: new Date('2024-01-01'),
      });
      const article2 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      });
      const article3 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 3',
        url: 'https://example.com/article/3',
        published_at: new Date('2024-01-03'),
      });

      // article2だけピンを立てる
      const pinModel = new (await import('./pin.js')).PinModel(db);
      pinModel.create(article2.id);

      const articlesWithPinStatus = articleModel.findAllWithPinStatus({ feed_id: testFeedId });

      expect(articlesWithPinStatus).toHaveLength(3);
      // 最新順にソートされている
      expect(articlesWithPinStatus[0].id).toBe(article3.id);
      expect(articlesWithPinStatus[0].is_pinned).toBe(false);
      expect(articlesWithPinStatus[1].id).toBe(article2.id);
      expect(articlesWithPinStatus[1].is_pinned).toBe(true);
      expect(articlesWithPinStatus[2].id).toBe(article1.id);
      expect(articlesWithPinStatus[2].is_pinned).toBe(false);
    });
  });

  describe('getPinnedArticles', () => {
    it('ピン留めされた記事のみを取得できる', async () => {
      // 記事を3つ作成
      const article1 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 1',
        url: 'https://example.com/article/1',
        published_at: new Date('2024-01-01'),
      });
      // article2は作成するがピンは立てない
      articleModel.create({
        feed_id: testFeedId,
        title: 'Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      });
      const article3 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 3',
        url: 'https://example.com/article/3',
        published_at: new Date('2024-01-03'),
      });

      // article1とarticle3にピンを立てる
      const pinModel = new (await import('./pin.js')).PinModel(db);
      pinModel.create(article1.id);
      await new Promise((resolve) => setTimeout(resolve, 1100)); // タイムスタンプをずらす
      pinModel.create(article3.id);

      const pinnedArticles = articleModel.getPinnedArticles();

      expect(pinnedArticles).toHaveLength(2);
      // ピンの作成日時の降順でソートされている（新しい方が先）
      expect(pinnedArticles[0].id).toBe(article3.id);
      expect(pinnedArticles[1].id).toBe(article1.id);
    });

    it('ピンがない場合は空配列を返す', () => {
      articleModel.create({
        feed_id: testFeedId,
        title: 'Article 1',
        url: 'https://example.com/article/1',
        published_at: new Date('2024-01-01'),
      });

      const pinnedArticles = articleModel.getPinnedArticles();

      expect(pinnedArticles).toEqual([]);
    });
  });

  describe('markAllAsRead', () => {
    it('すべての未読記事を既読にできる', () => {
      // 複数の記事を作成（一部は既読）
      articleModel.create({
        feed_id: testFeedId,
        title: 'Article 1',
        url: 'https://example.com/article/1',
        published_at: new Date('2024-01-01'),
      });
      const article2 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      });
      articleModel.create({
        feed_id: testFeedId,
        title: 'Article 3',
        url: 'https://example.com/article/3',
        published_at: new Date('2024-01-03'),
      });

      // article2を既読にしておく
      articleModel.markAsRead(article2.id);

      // 一括既読化
      const updatedCount = articleModel.markAllAsRead();

      // 2件が更新されたはず（article1とarticle3）
      expect(updatedCount).toBe(2);

      // すべての記事が既読になっているか確認
      const articles = articleModel.findAll();
      expect(articles.every((article) => article.is_read)).toBe(true);
    });

    it('特定のフィードの未読記事のみを既読にできる', () => {
      // 別のフィードを作成
      const otherFeed = feedModel.create({
        url: 'https://example.com/feed2.rss',
        title: 'Other Feed',
        description: 'Another test feed',
        rating: 0,
      });
      const otherFeedId = otherFeed.id;

      // 異なるフィードの記事を作成
      articleModel.create({
        feed_id: testFeedId,
        title: 'Feed1 Article 1',
        url: 'https://example.com/feed1/article/1',
        published_at: new Date('2024-01-01'),
      });
      articleModel.create({
        feed_id: testFeedId,
        title: 'Feed1 Article 2',
        url: 'https://example.com/feed1/article/2',
        published_at: new Date('2024-01-02'),
      });
      articleModel.create({
        feed_id: otherFeedId,
        title: 'Feed2 Article 1',
        url: 'https://example.com/feed2/article/1',
        published_at: new Date('2024-01-03'),
      });

      // testFeedIdの記事のみ既読化
      const updatedCount = articleModel.markAllAsRead(testFeedId);

      // 2件が更新されたはず
      expect(updatedCount).toBe(2);

      // testFeedIdの記事はすべて既読
      const feed1Articles = articleModel.findAll({ feed_id: testFeedId });
      expect(feed1Articles.every((article) => article.is_read)).toBe(true);

      // otherFeedIdの記事は未読のまま
      const feed2Articles = articleModel.findAll({ feed_id: otherFeedId });
      expect(feed2Articles.every((article) => !article.is_read)).toBe(true);
    });

    it('すべて既読の場合は0を返す', () => {
      const article1 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 1',
        url: 'https://example.com/article/1',
        published_at: new Date('2024-01-01'),
      });
      const article2 = articleModel.create({
        feed_id: testFeedId,
        title: 'Article 2',
        url: 'https://example.com/article/2',
        published_at: new Date('2024-01-02'),
      });

      // すべて既読にしておく
      articleModel.markAsRead(article1.id);
      articleModel.markAsRead(article2.id);

      // 一括既読化
      const updatedCount = articleModel.markAllAsRead();

      // 更新されたものはない
      expect(updatedCount).toBe(0);
    });
  });
});
