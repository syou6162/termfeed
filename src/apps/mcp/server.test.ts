import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMcpServer } from './server.js';
import { ArticleModel } from '../../models/article.js';
import { FeedModel } from '../../models/feed.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    registerResource: vi.fn(),
    tool: vi.fn(),
    close: vi.fn(),
  })),
}));

describe('createMcpServer', () => {
  let mockArticleModel: ArticleModel;
  let mockFeedModel: FeedModel;

  beforeEach(() => {
    vi.clearAllMocks();

    mockArticleModel = {} as ArticleModel;
    mockFeedModel = {} as FeedModel;
  });

  it('should create and connect MCP server', async () => {
    const server = await createMcpServer(mockArticleModel, mockFeedModel);

    expect(server).toBeDefined();
    expect(server.connect).toHaveBeenCalled();
    expect(server.registerResource).toHaveBeenCalled();
    expect(server.tool).toHaveBeenCalled();
  });

  it('should use stdio transport', async () => {
    await createMcpServer(mockArticleModel, mockFeedModel);

    expect(StdioServerTransport).toHaveBeenCalled();
  });

  it('should return server instance with close method', async () => {
    const server = await createMcpServer(mockArticleModel, mockFeedModel);

    expect(server.close).toBeDefined();
    expect(typeof server.close).toBe('function');
  });
});
