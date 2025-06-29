import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { FeedService } from '../../../services/feed-service.js';
import { RSSCrawler } from '../../../services/rss-crawler.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import type { UpdateAllFeedsResult } from '@/types';

type ToolResponse = {
  content: Array<{
    type: 'text';
    text: string;
  }>;
};

type UpdateAllFeedsResponse = {
  success: boolean;
  message: string;
  result?: UpdateAllFeedsResult;
  error?: {
    message: string;
    type: string;
    details?: unknown;
  };
};

export function registerFeedTools(
  server: McpServer,
  feedModel: FeedModel,
  articleModel: ArticleModel
): void {
  const feedService = new FeedService(feedModel, articleModel, new RSSCrawler());

  // Register update_all_feeds tool
  server.tool(
    'update_all_feeds',
    'Update all RSS feeds to fetch new articles',
    async (): Promise<ToolResponse> => {
      try {
        const result = await feedService.updateAllFeeds();

        const response: UpdateAllFeedsResponse = {
          success: true,
          message: `Updated ${result.summary.totalFeeds} feeds: ${result.summary.successCount} succeeded, ${result.summary.failureCount} failed`,
          result,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        const response: UpdateAllFeedsResponse = {
          success: false,
          message: 'Failed to update feeds',
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            type: error?.constructor?.name || 'UnknownError',
            details: error instanceof Error && error.cause ? error.cause : undefined,
          },
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      }
    }
  );
}
