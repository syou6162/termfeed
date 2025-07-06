import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFeedTools } from './feeds.js';
import { DatabaseManager } from '../../../models/database.js';
import { FeedService } from '../../../services/feed-service.js';
import type { UpdateAllFeedsResult, UpdateCancelledResult } from '@/types';

vi.mock('../../../services/feed-service.js');
vi.mock('../../../services/rss-crawler.js');

describe('registerFeedTools', () => {
  let mockServer: McpServer;
  let mockUpdateAllFeeds: ReturnType<typeof vi.fn>;
  let toolHandler: () => Promise<unknown>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUpdateAllFeeds = vi.fn();
    vi.mocked(FeedService).mockImplementation(
      () =>
        ({
          updateAllFeeds: mockUpdateAllFeeds,
        }) as unknown as FeedService
    );

    mockServer = {
      tool: vi.fn((name: string, _description: string, handler: () => Promise<unknown>) => {
        if (name === 'update_all_feeds') {
          toolHandler = handler;
        }
      }),
    } as unknown as McpServer;
  });

  it('should register update_all_feeds tool', () => {
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    expect(mockServer.tool).toHaveBeenCalledWith(
      'update_all_feeds',
      'Update all RSS feeds to fetch new articles',
      expect.any(Function)
    );
  });

  it('should handle successful feed update', async () => {
    const mockResult: UpdateAllFeedsResult = {
      successful: [
        {
          status: 'success',
          feedId: 1,
          result: {
            feedId: 1,
            newArticlesCount: 5,
            updatedArticlesCount: 2,
            totalArticlesCount: 20,
          },
        },
      ],
      failed: [],
      summary: {
        totalFeeds: 1,
        successCount: 1,
        failureCount: 0,
      },
    };

    mockUpdateAllFeeds.mockResolvedValue(mockResult);
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Updated 1 feeds: 1 succeeded, 0 failed',
              result: mockResult,
            },
            null,
            2
          ),
        },
      ],
    });
  });

  it('should handle partial failure', async () => {
    const mockResult: UpdateAllFeedsResult = {
      successful: [
        {
          status: 'success',
          feedId: 1,
          result: {
            feedId: 1,
            newArticlesCount: 3,
            updatedArticlesCount: 1,
            totalArticlesCount: 15,
          },
        },
      ],
      failed: [
        {
          status: 'failure',
          feedId: 2,
          feedUrl: 'https://example.com/feed2.xml',
          error: new Error('Network timeout'),
        },
      ],
      summary: {
        totalFeeds: 2,
        successCount: 1,
        failureCount: 1,
      },
    };

    mockUpdateAllFeeds.mockResolvedValue(mockResult);
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Updated 2 feeds: 1 succeeded, 1 failed',
              result: mockResult,
            },
            null,
            2
          ),
        },
      ],
    });
  });

  it('should handle cancelled update', async () => {
    const mockCancelledResult: UpdateCancelledResult = {
      cancelled: true,
      processedFeeds: 1,
      totalFeeds: 3,
      successful: [
        {
          status: 'success',
          feedId: 1,
          result: {
            feedId: 1,
            newArticlesCount: 2,
            updatedArticlesCount: 0,
            totalArticlesCount: 10,
          },
        },
      ],
      failed: [],
    };

    mockUpdateAllFeeds.mockResolvedValue(mockCancelledResult);
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              message: 'Update cancelled after processing 1/3 feeds. 1 succeeded, 0 failed',
              result: mockCancelledResult,
            },
            null,
            2
          ),
        },
      ],
    });
  });

  it('should handle complete failure', async () => {
    const error = new Error('Database connection failed');
    error.cause = { code: 'ECONNREFUSED' };

    mockUpdateAllFeeds.mockRejectedValue(error);
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message: 'Failed to update feeds',
              error: {
                message: 'Database connection failed',
                type: 'Error',
                details: { code: 'ECONNREFUSED' },
              },
            },
            null,
            2
          ),
        },
      ],
    });
  });

  it('should handle non-Error exceptions', async () => {
    mockUpdateAllFeeds.mockRejectedValue('String error');
    const mockDatabaseManager = {} as DatabaseManager;
    registerFeedTools(mockServer, mockDatabaseManager);

    const result = await toolHandler();

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              message: 'Failed to update feeds',
              error: {
                message: 'Unknown error',
                type: 'String',
                details: undefined,
              },
            },
            null,
            2
          ),
        },
      ],
    });
  });
});
