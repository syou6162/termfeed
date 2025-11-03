import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  createTestContext,
  runCommand,
  setupRSSCrawlerMock,
  createMockRSSData,
  type TestContext,
} from '@/test-helpers/index.js';

describe('import command E2E', () => {
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

  it('should import feeds from OPML file', async () => {
    // Arrange - OPMLファイルを作成
    const opmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Feed Subscriptions</title>
  </head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed1.rss" title="Feed 1" />
    <outline type="rss" xmlUrl="https://example.com/feed2.rss" title="Feed 2" />
  </body>
</opml>`;
    const opmlPath = path.join(context.tempDir, 'feeds.opml');
    await fs.writeFile(opmlPath, opmlContent, 'utf-8');

    // RSSクローラーのモック設定
    const feedResponses = new Map([
      [
        'https://example.com/feed1.rss',
        createMockRSSData({
          title: 'Feed 1',
          feedUrl: 'https://example.com/feed1.rss',
        }),
      ],
      [
        'https://example.com/feed2.rss',
        createMockRSSData({
          title: 'Feed 2',
          feedUrl: 'https://example.com/feed2.rss',
        }),
      ],
    ]);
    rssMock.crawlSpy.mockImplementation((url) =>
      feedResponses.has(url)
        ? Promise.resolve(feedResponses.get(url)!)
        : Promise.reject(new Error(`Unexpected URL: ${url}`))
    );

    // Act
    const output = await runCommand(['import', opmlPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('import-opml-success-output');
    expect(output.stdout).toContain('Found 2 feed URLs to import');
    expect(output.stdout).toContain('Successfully imported: 2 feeds');

    // データベースの状態を確認
    const feeds = context.feedModel.findAll();
    expect(feeds).toHaveLength(2);
  });

  it('should import feeds from text file', async () => {
    // Arrange - テキストファイルを作成
    const textContent = `https://example.com/feed1.rss
https://example.com/feed2.rss
# This is a comment
https://example.com/feed3.rss

# Empty lines and comments are ignored`;
    const textPath = path.join(context.tempDir, 'feeds.txt');
    await fs.writeFile(textPath, textContent, 'utf-8');

    // RSSクローラーのモック設定
    const feedResponses = new Map([
      [
        'https://example.com/feed1.rss',
        createMockRSSData({
          title: 'feed1',
          feedUrl: 'https://example.com/feed1.rss',
        }),
      ],
      [
        'https://example.com/feed2.rss',
        createMockRSSData({
          title: 'feed2',
          feedUrl: 'https://example.com/feed2.rss',
        }),
      ],
      [
        'https://example.com/feed3.rss',
        createMockRSSData({
          title: 'feed3',
          feedUrl: 'https://example.com/feed3.rss',
        }),
      ],
    ]);
    rssMock.crawlSpy.mockImplementation((url) =>
      feedResponses.has(url)
        ? Promise.resolve(feedResponses.get(url)!)
        : Promise.reject(new Error(`Unexpected URL: ${url}`))
    );

    // Act
    const output = await runCommand(['import', textPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('import-text-success-output');
    expect(output.stdout).toContain('Found 3 feed URLs to import');
    expect(output.stdout).toContain('Successfully imported: 3 feeds');
  });

  it('should handle duplicate feeds gracefully', async () => {
    // Arrange - 既存のフィードを作成
    context.feedModel.create({
      url: 'https://example.com/feed1.rss',
      title: 'Existing Feed',
      rating: 0,
    });

    const textContent = `https://example.com/feed1.rss
https://example.com/feed2.rss`;
    const textPath = path.join(context.tempDir, 'feeds.txt');
    await fs.writeFile(textPath, textContent, 'utf-8');

    rssMock.mockFeedResponse(
      'https://example.com/feed2.rss',
      createMockRSSData({
        title: 'Feed 2',
        feedUrl: 'https://example.com/feed2.rss',
      })
    );

    // Act
    const output = await runCommand(['import', textPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('import-with-duplicates-output');
    expect(output.stdout).toContain('Already existed: 1 feeds');
    expect(output.stdout).toContain('Successfully imported: 1 feeds');
  });

  it('should handle file not found error', async () => {
    // Act
    const output = await runCommand(['import', '/nonexistent/file.opml'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('File not found');
    expect(output.stderr).toMatchSnapshot('import-file-not-found-error-output');
  });

  it('should handle invalid format option', async () => {
    // Arrange
    const textPath = path.join(context.tempDir, 'feeds.txt');
    await fs.writeFile(textPath, 'https://example.com/feed.rss', 'utf-8');

    // Act
    const output = await runCommand(['import', textPath, '--format', 'invalid'], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBe(1);
    expect(output.stderr).toContain('Invalid format');
    expect(output.stderr).toMatchSnapshot('import-invalid-format-error-output');
  });

  it('should handle empty file', async () => {
    // Arrange
    const emptyPath = path.join(context.tempDir, 'empty.txt');
    await fs.writeFile(emptyPath, '', 'utf-8');

    // Act
    const output = await runCommand(['import', emptyPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toContain('No valid feed URLs found');
    expect(output.stdout).toMatchSnapshot('import-empty-file-output');
  });

  it('should handle feed fetch errors', async () => {
    // Arrange
    const textContent = `https://example.com/good.rss
https://example.com/bad.rss`;
    const textPath = path.join(context.tempDir, 'feeds.txt');
    await fs.writeFile(textPath, textContent, 'utf-8');

    // RSSクローラーのモック設定
    const feedResponses = new Map([
      [
        'https://example.com/good.rss',
        createMockRSSData({
          title: 'Good Feed',
          feedUrl: 'https://example.com/good.rss',
        }),
      ],
    ]);
    const errorResponses = new Map([['https://example.com/bad.rss', new Error('Network error')]]);

    rssMock.crawlSpy.mockImplementation((url) => {
      if (errorResponses.has(url)) {
        return Promise.reject(errorResponses.get(url)!);
      }
      return feedResponses.has(url)
        ? Promise.resolve(feedResponses.get(url)!)
        : Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    // Act
    const output = await runCommand(['import', textPath], {
      dbPath: context.dbPath,
    });

    // Assert
    expect(output.exitCode).toBeUndefined();
    expect(output.stdout).toMatchSnapshot('import-with-errors-output');
    expect(output.stdout).toContain('Successfully imported: 1 feeds');
    expect(output.stdout).toContain('Failed to import: 1 feeds');
  });

  it('should pass AbortSignal to RSSCrawler.crawl() when importing', async () => {
    // Arrange - テキストファイルを作成
    const textContent = 'https://example.com/feed1.rss';
    const textPath = path.join(context.tempDir, 'feeds.txt');
    await fs.writeFile(textPath, textContent, 'utf-8');

    const mockData = createMockRSSData({
      title: 'Test Feed',
      feedUrl: 'https://example.com/feed1.rss',
    });
    rssMock.mockFeedResponse('https://example.com/feed1.rss', mockData);

    // Act
    await runCommand(['import', textPath], {
      dbPath: context.dbPath,
    });

    // Assert - crawl() の第2引数がAbortSignalであることを確認
    expect(rssMock.crawlSpy).toHaveBeenCalled();
    const secondArg = rssMock.crawlSpy.mock.calls[0][1];
    expect(secondArg).toBeInstanceOf(AbortSignal);
  });
});
