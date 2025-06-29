import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../models/article.js';
import { FeedModel } from '../../models/feed.js';
import { ArticleResource } from '../types.js';

/**
 * Register preset resources with common limit values
 * This provides a better UX in Claude Desktop while still supporting the base resources
 */
export function registerArticlePresets(
  server: McpServer,
  articleModel: ArticleModel,
  feedModel: FeedModel
): void {
  // Pre-fetch all feeds to avoid N+1 queries
  const getAllFeedsMap = () => {
    const feeds = feedModel.findAll();
    return new Map(feeds.map((f) => [f.id, f]));
  };

  // Register unread-recent (最近の未読記事)
  server.registerResource(
    'unread-recent',
    'articles://unread-recent',
    {
      title: 'Recent Unread Articles',
      description: 'Get the 5 most recent unread articles',
    },
    () => {
      const articles = articleModel.findAll({ is_read: false, limit: 5 });
      const feedMap = getAllFeedsMap();

      const resources: ArticleResource[] = articles.map((article) => ({
        id: article.id!,
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
            uri: 'articles://unread-recent',
            mimeType: 'application/json',
            text: JSON.stringify(resources, null, 2),
          },
        ],
      };
    }
  );

  // Register unread-extended (拡張未読記事リスト)
  server.registerResource(
    'unread-extended',
    'articles://unread-extended',
    {
      title: 'Extended Unread Articles',
      description: 'Get 20 unread articles for more comprehensive view',
    },
    () => {
      const articles = articleModel.findAll({ is_read: false, limit: 20 });
      const feedMap = getAllFeedsMap();

      const resources: ArticleResource[] = articles.map((article) => ({
        id: article.id!,
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
            uri: 'articles://unread-extended',
            mimeType: 'application/json',
            text: JSON.stringify(resources, null, 2),
          },
        ],
      };
    }
  );

  // Register unread-full (全未読記事)
  server.registerResource(
    'unread-full',
    'articles://unread-full',
    {
      title: 'All Unread Articles',
      description: 'Get 50 unread articles for complete overview',
    },
    () => {
      const articles = articleModel.findAll({ is_read: false, limit: 50 });
      const feedMap = getAllFeedsMap();

      const resources: ArticleResource[] = articles.map((article) => ({
        id: article.id!,
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
            uri: 'articles://unread-full',
            mimeType: 'application/json',
            text: JSON.stringify(resources, null, 2),
          },
        ],
      };
    }
  );
}
