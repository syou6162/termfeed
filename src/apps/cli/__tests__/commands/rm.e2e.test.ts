import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, runCommand, type TestContext } from '@/test-helpers/index.js';

describe('rm command E2E', () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => {
    context.cleanup();
  });

  it('should remove feed successfully', async () => {
    // Arrange - フィードを事前に作成
    const feed = context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test Feed',
      description: 'Test Description',
      rating: 0,
    });

    // 記事も追加
    context.articleModel.create({
      feed_id: feed.id,
      title: 'Test Article',
      url: 'https://example.com/article-1',
      published_at: new Date(),
    });

    // Act
    const output = await runCommand(['rm', String(feed.id)], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined(); // 正常終了
    expect(output.stdout).toMatchSnapshot('rm-success-output');

    // データベースから削除されていることを確認
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(0);

    // 関連する記事も削除されていることを確認
    const articles = context.articleModel.findAll();
    expect(articles).toHaveLength(0);
  });

  it('should handle feed not found error', async () => {
    // Act - 存在しないフィードIDを指定
    const output = await runCommand(['rm', '999'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error removing feed');
    expect(output.stderr).toMatchSnapshot('rm-not-found-error-output');
  });

  it('should handle invalid feed ID format', async () => {
    // Act - 無効なフィードID形式
    const output = await runCommand(['rm', 'invalid-id'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error removing feed');
    expect(output.stderr).toMatchSnapshot('rm-invalid-id-error-output');
  });

  it('should handle negative feed ID', async () => {
    // Act - 負のフィードID
    const output = await runCommand(['rm', '-1'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error removing feed');
    expect(output.stderr).toMatchSnapshot('rm-negative-id-error-output');
  });

  it('should remove only specified feed when multiple feeds exist', async () => {
    // Arrange - 複数のフィードを作成
    const feed1 = context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Feed 1',
      rating: 0,
    });
    const feed2 = context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Feed 2',
      rating: 0,
    });

    // Act - feed1のみを削除
    const output = await runCommand(['rm', String(feed1.id)], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();

    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(1);
    expect(feeds[0].id).toBe(feed2.id);
  });
});
