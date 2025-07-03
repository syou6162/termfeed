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

  it('should list feeds sorted by ID', async () => {
    // Arrange - フィードを逆順で作成
    const feed1 = context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Feed A',
      rating: 0,
    });
    const feed2 = context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Feed B',
      rating: 0,
    });
    const feed3 = context.feedModel.create({
      url: 'https://example.com/feed3.rss',
      title: 'Feed C',
      rating: 0,
    });

    // Act
    const output = await runCommand(['list'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    const lines = output.stdout.trim().split('\n');
    expect(lines[0]).toContain(`${feed1.id}: Feed A`);
    expect(lines[1]).toContain(`${feed2.id}: Feed B`);
    expect(lines[2]).toContain(`${feed3.id}: Feed C`);
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
