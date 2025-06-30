import { vi } from 'vitest';
import { RSSCrawler } from '@/services/rss-crawler.js';
import type { CrawlResult } from '@/types';

export function setupRSSCrawlerMock() {
  const crawlSpy = vi.spyOn(RSSCrawler.prototype, 'crawl');

  return {
    crawlSpy,
    mockFeedResponse(url: string, data: CrawlResult) {
      crawlSpy.mockImplementation((feedUrl) => {
        if (feedUrl === url) {
          return Promise.resolve(data);
        }
        return Promise.reject(new Error(`Unexpected URL: ${feedUrl}`));
      });
    },
    mockError(error: Error) {
      crawlSpy.mockRejectedValue(error);
    },
  };
}
