import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ArticleModel } from '../models/article.js';
import { FeedModel } from '../models/feed.js';
import { registerArticleResources } from './resources/articles.js';

export async function createMcpServer(
  articleModel: ArticleModel,
  feedModel: FeedModel
): Promise<McpServer> {
  const server = new McpServer({
    name: 'termfeed',
    version: '0.1.0',
  });

  // Register resources
  registerArticleResources(server, articleModel, feedModel);

  // Connect using stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  return server;
}
