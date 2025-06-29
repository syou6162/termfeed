import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FeedService } from '../../../services/feed-service.js';
import { RSSCrawler } from '../../../services/rss-crawler.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';

export function registerFeedTools(
  server: McpServer,
  feedModel: FeedModel,
  articleModel: ArticleModel
): void {
  const feedService = new FeedService(feedModel, articleModel, new RSSCrawler());

  // Register update_all_feeds tool
  server.tool('update_all_feeds', 'Update all RSS feeds to fetch new articles', async () => {
    try {
      const result = await feedService.updateAllFeeds();
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: 'All feeds updated',
                result,
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
                error: error instanceof Error ? error.message : 'Unknown error',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  });
}
