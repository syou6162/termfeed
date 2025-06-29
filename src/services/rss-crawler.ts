import Parser from 'rss-parser';
import axios, { HttpStatusCode } from 'axios';
import type { Article, Feed, RSSItem, CrawlResult, CrawlerOptions } from '@/types';
import { RSSFetchError, RSSParseError } from './errors.js';

export type { RSSItem, CrawlResult, CrawlerOptions };

// 定数定義
const DEFAULT_TIMEOUT_MS = 30000; // 30秒

export class RSSCrawler {
  private parser: Parser;
  private readonly timeout: number;
  private readonly userAgent: string;

  constructor(options: CrawlerOptions = {}) {
    this.parser = new Parser({
      customFields: {
        item: ['media:thumbnail', 'media:content', 'enclosure'],
      },
    });
    this.timeout = options.timeout || DEFAULT_TIMEOUT_MS;
    this.userAgent = options.userAgent || 'termfeed/0.1.0';
  }

  async crawl(url: string, abortSignal?: AbortSignal): Promise<CrawlResult> {
    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        signal: abortSignal,
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
        responseType: 'text',
      });

      const feed = await this.parser.parseString(response.data as string);

      return {
        feed: this.normalizeFeed(feed, url),
        articles: this.normalizeArticles(feed.items || []),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ERR_CANCELED') {
          throw new RSSFetchError(`Request cancelled`, url, { cause: error });
        }
        if (error.code === 'ECONNABORTED') {
          throw new RSSFetchError(`Request timeout`, url, { cause: error });
        }
        if (error.response?.status === HttpStatusCode.NotFound) {
          throw new RSSFetchError(`Feed not found`, url, { cause: error });
        }
        if (error.response?.status && error.response.status >= 400) {
          throw new RSSFetchError(`HTTP error ${error.response.status}`, url, { cause: error });
        }
        throw new RSSFetchError(`Network error: ${error.message}`, url, { cause: error });
      }
      throw new RSSParseError(
        `Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        url,
        { cause: error }
      );
    }
  }

  private normalizeFeed(
    feed: { title?: string; description?: string },
    url: string
  ): Omit<Feed, 'id' | 'created_at'> {
    return {
      url,
      title: feed.title || 'Untitled Feed',
      description: feed.description,
      last_updated_at: new Date(),
    };
  }

  private normalizeArticles(
    items: RSSItem[]
  ): Omit<Article, 'id' | 'feed_id' | 'created_at' | 'updated_at'>[] {
    return items.map((item) => ({
      title: item.title || 'Untitled Article',
      url: item.link || item.guid || '',
      content: item.content,
      author: item.creator,
      published_at: this.parseDate(item.isoDate || item.pubDate),
      is_read: false,
      is_favorite: false,
      thumbnail_url: this.extractThumbnail(item),
    }));
  }

  private parseDate(dateString?: string): Date {
    if (!dateString) {
      return new Date();
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date();
    }

    return date;
  }

  private extractThumbnail(item: RSSItem & Record<string, unknown>): string | undefined {
    if (item.enclosure?.url && this.isImageUrl(item.enclosure.url)) {
      return item.enclosure.url;
    }

    const mediaThumbnail = item['media:thumbnail'] as { url?: string } | undefined;
    if (mediaThumbnail?.url) {
      return mediaThumbnail.url;
    }

    const mediaContent = item['media:content'] as { url?: string } | undefined;
    if (mediaContent?.url && this.isImageUrl(mediaContent.url)) {
      return mediaContent.url;
    }

    return undefined;
  }

  private isImageUrl(url: string): boolean {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
    return imageExtensions.test(url);
  }
}
