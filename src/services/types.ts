export type RSSItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  pubDate?: string;
  isoDate?: string;
  enclosure?: {
    url: string;
  };
  guid?: string;
};

export type RSSFeed = {
  title?: string;
  description?: string;
  link?: string;
  items: RSSItem[];
};

export type CrawlResult = {
  feed: Omit<import('../models/types.js').Feed, 'id' | 'created_at'>;
  articles: Omit<
    import('../models/types.js').Article,
    'id' | 'feed_id' | 'created_at' | 'updated_at'
  >[];
};

export type FeedUpdateResult = {
  feedId: number;
  newArticlesCount: number;
  updatedArticlesCount: number;
  totalArticlesCount: number;
};

export type AddFeedResult = {
  feed: import('../models/types.js').Feed;
  articlesCount: number;
};

export type CrawlerOptions = {
  timeout?: number;
  userAgent?: string;
};

export type ServiceError = {
  code: string;
  message: string;
  originalError?: Error;
};
