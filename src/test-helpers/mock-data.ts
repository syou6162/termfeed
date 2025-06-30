import type { CrawlResult } from '@/types';

type MockRSSDataOptions = {
  title: string;
  description?: string;
  feedUrl: string;
  articles?: Array<{
    title: string;
    link: string;
    content?: string;
    summary?: string;
    author?: string;
    pubDate?: string;
  }>;
};

export function createMockRSSData(options: MockRSSDataOptions): CrawlResult {
  const {
    title,
    description = 'Mock feed description',
    feedUrl,
    articles = [
      {
        title: 'Article 1',
        link: `${feedUrl}/article-1`,
        content: 'Article 1 content',
        summary: 'Article 1 summary',
        author: 'Author 1',
        pubDate: new Date().toISOString(),
      },
      {
        title: 'Article 2',
        link: `${feedUrl}/article-2`,
        content: 'Article 2 content',
        summary: 'Article 2 summary',
        author: 'Author 2',
        pubDate: new Date().toISOString(),
      },
    ],
  } = options;

  return {
    feed: {
      url: feedUrl,
      title,
      description,
      last_updated_at: new Date(),
    },
    articles: articles.map((article) => ({
      title: article.title,
      url: article.link,
      content: article.content,
      summary: article.summary,
      author: article.author,
      published_at: new Date(article.pubDate || new Date()),
      thumbnail_url: undefined,
      is_read: false,
      is_favorite: false,
    })),
  };
}
