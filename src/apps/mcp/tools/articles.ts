import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { ArticleModel } from '../../../models/article.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleResource } from '../types.js';

export function registerArticleTools(
  server: McpServer,
  articleModel: ArticleModel,
  feedModel: FeedModel
): void {
  server.tool(
    'get_article',
    'Get full details of a specific article by ID',
    { id: z.number().describe('Article ID to retrieve') },
    async (args) => {
      try {
        const articleId = args.id;

        if (!articleId) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Invalid article ID. Must be a number.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const article = await Promise.resolve(articleModel.findById(articleId));
        if (!article) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    success: false,
                    error: `Article with ID ${articleId} not found.`,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        const feed = await Promise.resolve(feedModel.findById(article.feed_id));
        const resource: ArticleResource = {
          id: article.id,
          title: article.title,
          url: article.url,
          content: article.content || null,
          publishedAt: new Date(article.published_at).toISOString(),
          feedTitle: feed?.title || 'Unknown Feed',
          author: article.author || null,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  article: resource,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    type: error?.constructor?.name || 'UnknownError',
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );
}
