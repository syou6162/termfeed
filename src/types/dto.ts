// データ転送オブジェクトの型定義

export type RSSItem = {
  title?: string;
  link?: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  pubDate?: string;
  isoDate?: string;
  guid?: string;
  summary?: string;
  'content:encoded'?: string;
  'content:encodedSnippet'?: string;
  'dc:creator'?: string;
  author?: string;
  enclosure?: {
    url: string;
  };
};

export type RSSFeed = {
  title?: string;
  description?: string;
  link?: string;
  items: RSSItem[];
};

export type CrawlResult = {
  feed: {
    url: string;
    title: string;
    description?: string;
    last_updated_at: Date;
  };
  articles: Array<{
    title: string;
    url: string;
    content?: string;
    summary?: string;
    author?: string;
    published_at: Date;
    thumbnail_url?: string;
    is_read: boolean;
  }>;
};

export type FeedUpdateResult = {
  feedId: number;
  newArticlesCount: number;
  updatedArticlesCount: number;
  totalArticlesCount: number;
};

export type AddFeedResult = {
  feed: import('./domain').Feed;
  articlesCount: number;
};

export type UpdateAllFeedsResult = {
  successful: import('./options').FeedUpdateSuccess[];
  failed: import('./options').FeedUpdateFailure[];
  summary: {
    totalFeeds: number;
    successCount: number;
    failureCount: number;
  };
};

export type ArticleResource = {
  id: number;
  title: string;
  url: string;
  content: string | null;
  publishedAt: string;
  author: string | null;
};
