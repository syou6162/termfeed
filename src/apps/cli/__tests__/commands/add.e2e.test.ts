import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createTestContext,
  runCommand,
  setupRSSCrawlerMock,
  createMockRSSData,
  type TestContext,
} from '@/test-helpers/index.js';

describe('add command E2E', () => {
  let context: TestContext;
  let rssMock: ReturnType<typeof setupRSSCrawlerMock>;

  beforeEach(() => {
    context = createTestContext();
    rssMock = setupRSSCrawlerMock();
  });

  afterEach(() => {
    context.cleanup();
    vi.restoreAllMocks();
  });

  it('should add RSS feed successfully', async () => {
    // Arrange
    const feedUrl = 'https://example.com/feed.rss';
    const mockData = createMockRSSData({
      title: 'Test Feed',
      description: 'Test Description',
      feedUrl,
    });
    rssMock.mockFeedResponse(feedUrl, mockData);

    // Act
    const output = await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });

    // Assert - 終了コード
    expect(output.exitCode).toBeUndefined(); // 正常終了

    // Assert - 出力のスナップショット
    expect(output.stdout).toMatchSnapshot('add-success-output');

    // Assert - データベースの状態（コンテキストのモデルを使って検証）
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toMatchObject({
      url: feedUrl,
      title: 'Test Feed',
      description: 'Test Description',
    });

    const articles = context.articleModel.findAll();
    expect(articles).toHaveLength(2); // モックデータのデフォルト
  });

  it('should handle network errors gracefully', async () => {
    // Arrange
    const feedUrl = 'https://example.com/error.rss';
    rssMock.mockError(new Error('Network error'));

    // Act
    const output = await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error adding feed');

    // データベースに何も追加されていないことを確認
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(0);
  });

  it('should handle duplicate feed error', async () => {
    // Arrange
    const feedUrl = 'https://example.com/feed.rss';
    const mockData = createMockRSSData({
      title: 'Test Feed',
      description: 'Test Description',
      feedUrl,
    });
    rssMock.mockFeedResponse(feedUrl, mockData);

    // 最初のフィードを追加
    await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });

    // Act - 同じフィードを再度追加
    const output = await runCommand(['add', feedUrl], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error adding feed');

    // フィードは1つのみ
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(1);
  });

  it('should handle invalid URL gracefully', async () => {
    // Act
    const output = await runCommand(['add', 'not-a-valid-url'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Error adding feed');

    // データベースに何も追加されていないことを確認
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(0);
  });
});
