import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleResource } from '../types.js';

export function registerArticleResources(
  server: McpServer,
  articleModel: ArticleModel,
  feedModel: FeedModel
): void {
  // Pre-fetch all feeds to avoid N+1 queries
  const getAllFeedsMap = () => {
    const feeds = feedModel.findAll();
    return new Map(feeds.map((f) => [f.id, f]));
  };

  // Register unread articles resource
  server.registerResource(
    'unread',
    'articles://unread',
    {
      title: 'Unread Articles',
      description: 'Get unread articles from your RSS feeds (default: 10 items)',
    },
    () => {
      const articles = articleModel.findAll({ is_read: false, limit: 10 });
      const feedMap = getAllFeedsMap();

      const resources: ArticleResource[] = articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        content: article.content ? article.content.substring(0, 500) + '...' : null,
        publishedAt: new Date(article.published_at).toISOString(),
        feedTitle: feedMap.get(article.feed_id)?.title || 'Unknown Feed',
        author: article.author || null,
      }));

      return {
        contents: [
          {
            uri: 'articles://unread',
            mimeType: 'application/json',
            text: JSON.stringify(resources, null, 2),
          },
        ],
      };
    }
  );

  // Register favorite articles resource
  server.registerResource(
    'favorites',
    'articles://favorites',
    {
      title: 'Favorite Articles',
      description: 'Get your favorite articles (default: 10 items)',
    },
    () => {
      const articles = articleModel.findAll({ is_favorite: true, limit: 10 });
      const feedMap = getAllFeedsMap();

      const resources: ArticleResource[] = articles.map((article) => ({
        id: article.id,
        title: article.title,
        url: article.url,
        content: article.content ? article.content.substring(0, 500) + '...' : null,
        publishedAt: new Date(article.published_at).toISOString(),
        feedTitle: feedMap.get(article.feed_id)?.title || 'Unknown Feed',
        author: article.author || null,
      }));

      return {
        contents: [
          {
            uri: 'articles://favorites',
            mimeType: 'application/json',
            text: JSON.stringify(resources, null, 2),
          },
        ],
      };
    }
  );

  // Register article detail resource
  server.registerResource(
    'article',
    'articles://article/{id}',
    {
      title: 'Article Details',
      description: 'Get full details of a specific article',
    },
    (uri: URL) => {
      // URIからIDを取得
      let articleId: number;
      const uriString = uri.href;

      const match = uriString.match(/articles:\/\/article\/(\d+)/);
      articleId = match ? parseInt(match[1], 10) : 0;

      if (!articleId) {
        return {
          contents: [
            {
              uri: 'articles://article/error',
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Invalid article ID' }),
            },
          ],
        };
      }

      const article = articleModel.findById(articleId);
      if (!article) {
        return {
          contents: [
            {
              uri: `articles://article/${articleId}`,
              mimeType: 'application/json',
              text: JSON.stringify({ error: 'Article not found' }),
            },
          ],
        };
      }

      const feed = feedModel.findById(article.feed_id);
      const resource: ArticleResource = {
        id: article.id,
        title: article.title,
        url: article.url,
        content: article.content || null, // 全文を返す
        publishedAt: new Date(article.published_at).toISOString(),
        feedTitle: feed?.title || 'Unknown Feed',
        author: article.author || null,
      };

      return {
        contents: [
          {
            uri: `articles://article/${articleId}`,
            mimeType: 'application/json',
            text: JSON.stringify(resource, null, 2),
          },
        ],
      };
    }
  );
}
