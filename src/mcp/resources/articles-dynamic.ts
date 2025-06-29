import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ArticleModel } from '../../models/article.js';
import { FeedModel } from '../../models/feed.js';

/**
 * MCPの動的リソース登録の実験
 * 異なるlimit値に対して個別のリソースを登録する
 */
export function registerDynamicArticleResources(
  server: McpServer,
  articleModel: ArticleModel,
  feedModel: FeedModel
): void {
  // よく使われるlimit値に対して個別のリソースを作成
  const commonLimits = [5, 10, 20, 50];
  
  commonLimits.forEach(limit => {
    server.registerResource(
      `unread-${limit}`,
      `articles://unread-${limit}`,
      {
        title: `Unread Articles (${limit} items)`,
        description: `Get ${limit} unread articles from your RSS feeds`,
      },
      () => {
        const articles = articleModel.findAll({ is_read: false, limit });
        const feeds = feedModel.findAll();
        const feedMap = new Map(feeds.map((f) => [f.id, f]));

        const resources = articles.map((article) => ({
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
              uri: `articles://unread-${limit}`,
              mimeType: 'application/json',
              text: JSON.stringify(resources, null, 2),
            },
          ],
        };
      }
    );
  });
}