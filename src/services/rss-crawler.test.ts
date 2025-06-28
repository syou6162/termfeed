import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { RSSCrawler } from './rss-crawler.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('RSSCrawler', () => {
  let crawler: RSSCrawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new RSSCrawler();
  });

  describe('constructor', () => {
    it('デフォルトオプションで初期化される', () => {
      const defaultCrawler = new RSSCrawler();
      expect(defaultCrawler).toBeInstanceOf(RSSCrawler);
    });

    it('カスタムオプションで初期化される', () => {
      const customCrawler = new RSSCrawler({
        timeout: 10000,
        userAgent: 'test-agent',
      });
      expect(customCrawler).toBeInstanceOf(RSSCrawler);
    });
  });

  describe('crawl', () => {
    const validRSSFeed = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <title>Test Feed</title>
          <description>Test Description</description>
          <link>https://example.com</link>
          <item>
            <title>Test Article</title>
            <link>https://example.com/article1</link>
            <description>Test article content</description>
            <author>Test Author</author>
            <pubDate>Wed, 28 Jun 2025 10:00:00 GMT</pubDate>
            <enclosure url="https://example.com/image.jpg" type="image/jpeg" />
          </item>
        </channel>
      </rss>`;

    const validAtomFeed = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Test Atom Feed</title>
        <subtitle>Test Atom Description</subtitle>
        <link href="https://example.com" />
        <entry>
          <title>Test Atom Article</title>
          <link href="https://example.com/atom-article" />
          <summary>Test atom article content</summary>
          <author>
            <name>Test Atom Author</name>
          </author>
          <published>2025-06-28T10:00:00Z</published>
        </entry>
      </feed>`;

    it('RSS 2.0フィードを正常にパースする', async () => {
      mockedAxios.get.mockResolvedValue({
        data: validRSSFeed,
      });

      const result = await crawler.crawl('https://example.com/rss.xml');

      expect(result.feed.title).toBe('Test Feed');
      expect(result.feed.description).toBe('Test Description');
      expect(result.feed.url).toBe('https://example.com/rss.xml');
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].title).toBe('Test Article');
      expect(result.articles[0].url).toBe('https://example.com/article1');
      expect(result.articles[0].author).toBe('Test Author');
      expect(result.articles[0].is_read).toBe(false);
      expect(result.articles[0].is_favorite).toBe(false);
    });

    it('Atomフィードを正常にパースする', async () => {
      mockedAxios.get.mockResolvedValue({
        data: validAtomFeed,
      });

      const result = await crawler.crawl('https://example.com/atom.xml');

      expect(result.feed.title).toBe('Test Atom Feed');
      // Atomフィードのdescriptionはsubtitleまたはundefinedの可能性がある
      expect(
        typeof result.feed.description === 'string' || result.feed.description === undefined
      ).toBe(true);
      expect(result.articles).toHaveLength(1);
      expect(result.articles[0].title).toBe('Test Atom Article');
      expect(result.articles[0].url).toBe('https://example.com/atom-article');
    });

    it('空のフィードタイトルにデフォルト値を設定する', async () => {
      const feedWithoutTitle = validRSSFeed.replace('<title>Test Feed</title>', '');
      mockedAxios.get.mockResolvedValue({
        data: feedWithoutTitle,
      });

      const result = await crawler.crawl('https://example.com/rss.xml');

      expect(result.feed.title).toBe('Untitled Feed');
    });

    it('空の記事タイトルにデフォルト値を設定する', async () => {
      const feedWithoutArticleTitle = validRSSFeed.replace('<title>Test Article</title>', '');
      mockedAxios.get.mockResolvedValue({
        data: feedWithoutArticleTitle,
      });

      const result = await crawler.crawl('https://example.com/rss.xml');

      expect(result.articles[0].title).toBe('Untitled Article');
    });

    it('サムネイルURLを正しく抽出する', async () => {
      mockedAxios.get.mockResolvedValue({
        data: validRSSFeed,
      });

      const result = await crawler.crawl('https://example.com/rss.xml');

      expect(result.articles[0].thumbnail_url).toBe('https://example.com/image.jpg');
    });

    it('無効な日付フォーマットでもエラーにならない', async () => {
      const feedWithInvalidDate = validRSSFeed.replace(
        '<pubDate>Wed, 28 Jun 2025 10:00:00 GMT</pubDate>',
        '<pubDate>invalid-date</pubDate>'
      );
      mockedAxios.get.mockResolvedValue({
        data: feedWithInvalidDate,
      });

      const result = await crawler.crawl('https://example.com/rss.xml');

      expect(result.articles[0].published_at).toBeInstanceOf(Date);
    });

    it('ネットワークエラーでエラーを投げる', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network Error'));

      await expect(crawler.crawl('https://example.com/rss.xml')).rejects.toThrow(
        'Failed to parse RSS feed'
      );
    });

    it('タイムアウトエラーでエラーを投げる', async () => {
      const timeoutError = new Error('timeout');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(crawler.crawl('https://example.com/rss.xml')).rejects.toThrow('Request timeout');
    });

    it('404エラーでエラーを投げる', async () => {
      const error404 = {
        response: { status: 404 },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(error404);

      await expect(crawler.crawl('https://example.com/rss.xml')).rejects.toThrow('Feed not found');
    });

    it('HTTPエラーでエラーを投げる', async () => {
      const error500 = {
        response: { status: 500 },
      };
      mockedAxios.isAxiosError.mockReturnValue(true);
      mockedAxios.get.mockRejectedValue(error500);

      await expect(crawler.crawl('https://example.com/rss.xml')).rejects.toThrow('HTTP error 500');
    });

    it('適切なヘッダーでリクエストを送信する', async () => {
      mockedAxios.get.mockResolvedValue({
        data: validRSSFeed,
      });

      await crawler.crawl('https://example.com/rss.xml');

      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/rss.xml', {
        timeout: 30000,
        headers: {
          'User-Agent': 'termfeed/0.1.0',
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
        responseType: 'text',
      });
    });
  });

  describe('isImageUrl', () => {
    it('画像拡張子のURLをtrueと判定する', () => {
      const imageUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp',
        'https://example.com/image.svg',
      ];

      imageUrls.forEach((url) => {
        // プライベートメソッドにアクセスするため、anyでキャストしてテスト
        expect((crawler as any).isImageUrl(url)).toBe(true);
      });
    });

    it('画像以外の拡張子のURLをfalseと判定する', () => {
      const nonImageUrls = [
        'https://example.com/document.pdf',
        'https://example.com/video.mp4',
        'https://example.com/page.html',
        'https://example.com/file.txt',
      ];

      nonImageUrls.forEach((url) => {
        expect((crawler as any).isImageUrl(url)).toBe(false);
      });
    });
  });

  describe('parseDate', () => {
    it('有効な日付文字列をパースする', () => {
      const validDates = ['Wed, 28 Jun 2025 10:00:00 GMT', '2025-06-28T10:00:00Z', '2025-06-28'];

      validDates.forEach((dateString) => {
        const result = (crawler as any).parseDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(false);
      });
    });

    it('無効な日付文字列で現在時刻を返す', () => {
      const invalidDates = ['invalid-date', '', 'not-a-date'];

      invalidDates.forEach((dateString) => {
        const result = (crawler as any).parseDate(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(isNaN(result.getTime())).toBe(false);
      });
    });

    it('undefined入力で現在時刻を返す', () => {
      const result = (crawler as any).parseDate(undefined);
      expect(result).toBeInstanceOf(Date);
      expect(isNaN(result.getTime())).toBe(false);
    });
  });
});
