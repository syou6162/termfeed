import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, runCommand, type TestContext } from '@/test-helpers/index.js';

describe('list command E2E', () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => {
    context.cleanup();
  });

  it('should display message when no feeds exist', async () => {
    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined(); // 正常終了
    expect(output.stdout).toContain('No feeds found.');
    expect(output.stdout).toMatchSnapshot('list-no-feeds-output');
  });

  it('should list feeds with ID and title', async () => {
    // Arrange - フィードを作成
    const feed1 = context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Test Feed 1',
      description: 'Description 1',
      rating: 0,
    });
    const feed2 = context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Test Feed 2',
      description: 'Description 2',
      rating: 0,
    });

    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined(); // 正常終了
    expect(output.stdout).toContain(`${feed1.id}: ${feed1.title}`);
    expect(output.stdout).toContain(`${feed2.id}: ${feed2.title}`);
    expect(output.stdout).toMatchSnapshot('list-with-feeds-output');
  });

  it('should list feeds sorted by rating and ID', async () => {
    // Arrange - 異なるレーティングのフィードを作成
    const feed1 = context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Feed A',
      rating: 5,
    });
    const feed2 = context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Feed B',
      rating: 3,
    });
    const feed3 = context.feedModel.create({
      url: 'https://example.com/feed3.rss',
      title: 'Feed C',
      rating: 5,
    });

    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    const stdout = output.stdout;
    
    // レーティング5のセクションが3より前に表示される
    const rating5Index = stdout.indexOf('## Rating 5');
    const rating3Index = stdout.indexOf('## Rating 3');
    expect(rating5Index).toBeGreaterThan(-1);
    expect(rating3Index).toBeGreaterThan(-1);
    expect(rating5Index).toBeLessThan(rating3Index);
    
    // レーティング5のフィード順序確認（ID順）
    const feed1Index = stdout.indexOf(`${feed1.id}: Feed A`);
    const feed3Index = stdout.indexOf(`${feed3.id}: Feed C`);
    expect(feed1Index).toBeGreaterThan(-1);
    expect(feed3Index).toBeGreaterThan(-1);
    expect(feed1Index).toBeLessThan(feed3Index); // feed1(ID小)がfeed3(ID大)より前
    
    // レーティング3のフィード確認
    expect(stdout).toContain(`${feed2.id}: Feed B`);
  });

  it('should handle feeds with special characters in title', async () => {
    // Arrange - 特殊文字を含むタイトルのフィードを作成
    const feed = context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test & Feed: "Special" Characters (2024)',
      rating: 0,
    });

    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain(`${feed.id}: Test & Feed: "Special" Characters (2024)`);
  });

  it('should handle feeds with very long titles', async () => {
    // Arrange - 長いタイトルのフィードを作成
    const longTitle =
      'This is a very long feed title that contains a lot of text and might be truncated in some displays but should be shown completely in the list command output';
    const feed = context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: longTitle,
      rating: 0,
    });

    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain(`${feed.id}: ${longTitle}`);
  });
});
