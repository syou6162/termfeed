import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext, runCommand, type TestContext } from '@/test-helpers/index.js';

describe('export command E2E', () => {
  let context: TestContext;

  beforeEach(() => {
    context = createTestContext();
  });

  afterEach(() => {
    context.cleanup();
  });

  it('should export feeds to OPML format by default', async () => {
    // Arrange - フィードを作成
    context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Feed 1',
      description: 'Description 1',
    });
    context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Feed 2',
    });

    // Act
    const output = await runCommand(['export'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('export-opml-success-output');
    expect(output.stdout).toContain('Exported 2 feeds');
    expect(output.stdout).toContain('subscriptions.opml');
    expect(output.stdout).toContain('OPML format');
  });

  it('should export feeds to text format when specified', async () => {
    // Arrange
    context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Feed 1',
    });
    context.feedModel.create({
      url: 'https://example.com/feed2.rss',
      title: 'Feed 2',
    });

    // Act
    const output = await runCommand(['export', 'feeds.txt', '--format', 'text'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('export-text-success-output');
    expect(output.stdout).toContain('Exported 2 feeds');
    expect(output.stdout).toContain('feeds.txt');
    expect(output.stdout).toContain('text format');
  });

  it('should auto-detect format based on file extension', async () => {
    // Arrange
    context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test Feed',
    });

    // Act - .txt拡張子でtext形式を自動検出
    const output = await runCommand(['export', 'feeds.txt'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain('text format');
  });

  it('should handle no feeds to export', async () => {
    // Act - フィードがない状態でエクスポート
    const output = await runCommand(['export'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain('No feeds to export');
    expect(output.stdout).toMatchSnapshot('export-no-feeds-output');
  });

  it('should handle invalid format option', async () => {
    // Arrange
    context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test Feed',
    });

    // Act
    const output = await runCommand(['export', '--format', 'invalid'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Invalid format');
    expect(output.stderr).toMatchSnapshot('export-invalid-format-error-output');
  });

  it('should export with custom file path', async () => {
    // Arrange
    context.feedModel.create({
      url: 'https://example.com/feed.rss',
      title: 'Test Feed',
    });

    // Act
    const customPath = '/tmp/my-feeds.opml';
    const output = await runCommand(['export', customPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain('Exported 1 feeds');
    expect(output.stdout).toContain(customPath);
  });
});
