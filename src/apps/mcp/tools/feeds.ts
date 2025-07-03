import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FeedService } from '../../../services/feed-service.js';
import { RSSCrawler } from '../../../services/rss-crawler.js';
import { FeedModel } from '../../../models/feed.js';
import { ArticleModel } from '../../../models/article.js';
import type { UpdateAllFeedsResult, UpdateCancelledResult } from '@/types';

type UpdateAllFeedsResponse = {
  success: boolean;
  message: string;
  result?: UpdateAllFeedsResult | UpdateCancelledResult;
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
    async (): Promise<CallToolResult> => {
      try {
        const result = await feedService.updateAllFeeds();

        // キャンセルされた場合の処理
        if ('cancelled' in result) {
          const response: UpdateAllFeedsResponse = {
            success: true,
            message: `Update cancelled after processing ${result.processedFeeds}/${result.totalFeeds} feeds. ${result.successful.length} succeeded, ${result.failed.length} failed`,
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
        }

        // 通常の完了
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
