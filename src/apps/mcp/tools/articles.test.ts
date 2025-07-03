import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { registerArticleTools } from './articles.js';
import { ArticleModel } from '../../../models/article.js';
import { FeedModel } from '../../../models/feed.js';

describe('registerArticleTools', () => {
  let mockServer: McpServer;
  let mockArticleModel: ArticleModel;
  let mockFeedModel: FeedModel;
  let mockToolHandler: (args: Record<string, unknown>) => Promise<CallToolResult>;

  beforeEach(() => {
    mockToolHandler = vi.fn();
    mockServer = {
      tool: vi.fn().mockImplementation((_name, _description, _schema, handler) => {
        mockToolHandler = handler as (args: Record<string, unknown>) => Promise<CallToolResult>;
      }),
    } as unknown as McpServer;

    mockArticleModel = {
      findById: vi.fn(),
    } as unknown as ArticleModel;

    mockFeedModel = {
      findById: vi.fn(),
    } as unknown as FeedModel;
  });

  it('should register get_article tool', () => {
    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    expect(mockServer.tool).toHaveBeenCalledWith(
      'get_article',
      'Get full details of a specific article by ID',
      {
        type: 'object',
        properties: {
          id: {
            type: 'number',
            description: 'Article ID to retrieve',
          },
        },
        required: ['id'],
      },
      expect.any(Function)
    );
  });

  it('should return article data when valid ID is provided', async () => {
    const mockArticle = {
      id: 123,
      title: 'Test Article',
      url: 'https://example.com/article',
      content: 'Full article content',
      published_at: '2023-01-01T00:00:00Z',
      feed_id: 1,
      author: 'Test Author',
    };

    const mockFeed = {
      id: 1,
      title: 'Test Feed',
    };

    mockArticleModel.findById = vi.fn().mockReturnValue(mockArticle);
    mockFeedModel.findById = vi.fn().mockReturnValue(mockFeed);

    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    const result = await mockToolHandler({ id: 123 });

    expect(mockArticleModel.findById).toHaveBeenCalledWith(123);
    expect(mockFeedModel.findById).toHaveBeenCalledWith(1);
    expect(result.content[0].text).toContain('"success": true');
    expect(result.content[0].text).toContain('"title": "Test Article"');
    expect(result.content[0].text).toContain('"feedTitle": "Test Feed"');
  });

  it('should return error when article is not found', async () => {
    mockArticleModel.findById = vi.fn().mockReturnValue(null);

    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    const result = await mockToolHandler({ id: 999 });

    expect(mockArticleModel.findById).toHaveBeenCalledWith(999);
    expect(result.content[0].text).toContain('"success": false');
    expect(result.content[0].text).toContain('Article with ID 999 not found');
  });

  it('should return error when invalid ID is provided', async () => {
    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    const result = await mockToolHandler({ id: 'invalid' });

    expect(result.content[0].text).toContain('"success": false');
    expect(result.content[0].text).toContain('Invalid article ID');
  });

  it('should handle missing feed gracefully', async () => {
    const mockArticle = {
      id: 123,
      title: 'Test Article',
      url: 'https://example.com/article',
      content: 'Full article content',
      published_at: '2023-01-01T00:00:00Z',
      feed_id: 999,
      author: 'Test Author',
    };

    mockArticleModel.findById = vi.fn().mockReturnValue(mockArticle);
    mockFeedModel.findById = vi.fn().mockReturnValue(null);

    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    const result = await mockToolHandler({ id: 123 });

    expect(result.content[0].text).toContain('"feedTitle": "Unknown Feed"');
  });

  it('should handle errors gracefully', async () => {
    mockArticleModel.findById = vi.fn().mockImplementation(() => {
      throw new Error('Database error');
    });

    registerArticleTools(mockServer, mockArticleModel, mockFeedModel);

    const result = await mockToolHandler({ id: 123 });

    expect(result.content[0].text).toContain('"success": false');
    expect(result.content[0].text).toContain('Database error');
  });
});
