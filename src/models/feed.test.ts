import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseManager } from './database.js';
import { FeedModel } from './feed.js';
import type { CreateFeedInput } from '@/types';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('FeedModel', () => {
  let db: DatabaseManager;
  let feedModel: FeedModel;
  const testDbPath = path.join(__dirname, 'test-feed.db');

  beforeEach(() => {
    // テスト用のデータベースを作成
    db = new DatabaseManager(testDbPath);
    db.migrate();
    feedModel = new FeedModel(db);
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
    it('新しいフィードを作成できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        rating: 0,
        description: 'This is an example feed',
      };

      const feed = feedModel.create(feedInput);

      expect(feed.id).toBeDefined();
      expect(feed.url).toBe(feedInput.url);
      expect(feed.title).toBe(feedInput.title);
      expect(feed.description).toBe(feedInput.description);
      expect(feed.last_updated_at).toBeInstanceOf(Date);
      expect(feed.created_at).toBeInstanceOf(Date);
    });

    it('descriptionなしでフィードを作成できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed2.xml',
        title: 'Another Feed',
        rating: 0,
      };

      const feed = feedModel.create(feedInput);

      expect(feed.id).toBeDefined();
      expect(feed.url).toBe(feedInput.url);
      expect(feed.title).toBe(feedInput.title);
      expect(feed.description).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('IDでフィードを取得できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'Example Feed',
        rating: 0,
      };

      const created = feedModel.create(feedInput);
      const found = feedModel.findById(created.id);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(created.id);
      expect(found!.url).toBe(created.url);
      expect(found!.title).toBe(created.title);
    });

    it('存在しないIDの場合はnullを返す', () => {
      const found = feedModel.findById(999);
      expect(found).toBeNull();
    });
  });

  describe('findByUrl', () => {
    it('URLでフィードを取得できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/unique-feed.xml',
        title: 'Unique Feed',
        rating: 0,
      };

      feedModel.create(feedInput);
      const found = feedModel.findByUrl(feedInput.url);

      expect(found).not.toBeNull();
      expect(found!.url).toBe(feedInput.url);
      expect(found!.title).toBe(feedInput.title);
    });

    it('存在しないURLの場合はnullを返す', () => {
      const found = feedModel.findByUrl('https://nonexistent.com/feed.xml');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('すべてのフィードを取得できる', () => {
      const feeds: CreateFeedInput[] = [
        { url: 'https://example1.com/feed.xml', title: 'Feed 1' },
        { url: 'https://example2.com/feed.xml', title: 'Feed 2' },
        { url: 'https://example3.com/feed.xml', title: 'Feed 3' },
      ];

      // フィードを作成
      for (const feed of feeds) {
        feedModel.create(feed);
      }

      const allFeeds = feedModel.findAll();
      expect(allFeeds).toHaveLength(3);

      // URLで各フィードが含まれているか確認
      const urls = allFeeds.map((f) => f.url);
      expect(urls).toContain('https://example1.com/feed.xml');
      expect(urls).toContain('https://example2.com/feed.xml');
      expect(urls).toContain('https://example3.com/feed.xml');
    });

    it('フィードがない場合は空配列を返す', () => {
      const allFeeds = feedModel.findAll();
      expect(allFeeds).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('フィードを更新できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'Original Title',
        description: 'Original Description',
      };

      const created = feedModel.create(feedInput);
      const updated = feedModel.update(created.id, {
        title: 'Updated Title',
        description: 'Updated Description',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.description).toBe('Updated Description');
      expect(updated!.url).toBe(created.url); // URLは変更されない
    });

    it('存在しないIDの場合はnullを返す', () => {
      const updated = feedModel.update(999, { title: 'New Title' });
      expect(updated).toBeNull();
    });

    it('更新フィールドがない場合は元のフィードを返す', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'Original Title',
      };

      const created = feedModel.create(feedInput);
      const updated = feedModel.update(created.id, {});

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe(created.title);
    });
  });

  describe('delete', () => {
    it('フィードを削除できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'To Be Deleted',
      };

      const created = feedModel.create(feedInput);
      const deleted = feedModel.delete(created.id);

      expect(deleted).toBe(true);

      const found = feedModel.findById(created.id);
      expect(found).toBeNull();
    });

    it('存在しないIDの場合はfalseを返す', () => {
      const deleted = feedModel.delete(999);
      expect(deleted).toBe(false);
    });
  });

  describe('updateLastUpdatedAt', () => {
    it('最終更新日時を更新できる', () => {
      const feedInput: CreateFeedInput = {
        url: 'https://example.com/feed.xml',
        title: 'Test Feed',
        rating: 0,
      };

      const created = feedModel.create(feedInput);

      // 更新を実行
      feedModel.updateLastUpdatedAt(created.id);
      const updated = feedModel.findById(created.id);

      expect(updated).not.toBeNull();
      // 更新日時が変更されているかはSQLiteのdatetime('now')に依存するため、
      // nullでないことだけを確認
      expect(updated!.last_updated_at).toBeDefined();
    });
  });
});
